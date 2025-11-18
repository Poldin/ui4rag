'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import PendingChanges from "../../../../components/PendingChanges";
import { Loader2, Check, X, Globe } from 'lucide-react';
import { addToPendingChangesWithChunking } from "../../../../../lib/utils/pending-changes-helper";
import { pendingChangesEvents } from "../../../../../lib/events/pending-changes-events";

interface PageData {
  url: string;
  title: string;
  description: string;
  content?: string; // HTML pulito estratto con cheerio
  textContent?: string; // Testo plain
  excerpt?: string;
  depth: number;
  wordCount: number;
  selected?: boolean;
}

export default function WebsiteSourcePage() {
  const params = useParams();
  const ragId = params.id as string;
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState('1');
  const [crawling, setCrawling] = useState(false);
  const [pages, setPages] = useState<PageData[]>([]);
  const [error, setError] = useState('');
  const [pendingPages, setPendingPages] = useState<PageData[]>([]);
  const displayedCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const crawlStartTimeRef = useRef<number>(0);
  const stoppedManuallyRef = useRef(false);
  const allPagesFoundRef = useRef<PageData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Funzione per determinare quante pagine mostrare nel prossimo batch
  const getNextBatchSize = (currentDisplayed: number): number => {
    if (currentDisplayed === 0) return 2;
    if (currentDisplayed === 2) return 3;
    if (currentDisplayed === 5) return 5;
    if (currentDisplayed === 10) return 8;
    return 10; // Da 18 in poi, sempre 10
  };

  // Effect per mostrare progressivamente le pagine pending
  useEffect(() => {
    if (pendingPages.length > 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        const batchSize = getNextBatchSize(displayedCountRef.current);
        const toDisplay = pendingPages.slice(0, batchSize);
        
        if (toDisplay.length > 0) {
          setPages(prev => [...prev, ...toDisplay]);
          setPendingPages(prev => prev.slice(batchSize));
          displayedCountRef.current += toDisplay.length;
        }
      }, 300); // Delay di 300ms tra i batch
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pendingPages]);

  const saveCrawlingLog = async (errorMsg?: string) => {
    const executionTimeMs = Date.now() - crawlStartTimeRef.current;
    const totalPagesFound = allPagesFoundRef.current.length;
    
    try {
      await fetch('/api/save-crawling-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ragId,
          startUrl: url,
          depth,
          pagesFound: totalPagesFound,
          executionTimeMs,
          stoppedManually: stoppedManuallyRef.current,
          errorMessage: errorMsg || null,
          additionalMetadata: {
            pagesUrls: allPagesFoundRef.current.map(p => p.url),
            totalWords: allPagesFoundRef.current.reduce((sum, p) => sum + p.wordCount, 0),
            depthDistribution: allPagesFoundRef.current.reduce((acc, p) => {
              acc[`depth_${p.depth}`] = (acc[`depth_${p.depth}`] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          }
        }),
      });
    } catch (error) {
      console.error('Failed to save crawling log:', error);
    }
  };

  const handleStopCrawl = () => {
    stoppedManuallyRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCrawling(false);
  };

  const handleStartCrawl = async () => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }

    setError('');
    setCrawling(true);
    setPages([]);
    setPendingPages([]);
    displayedCountRef.current = 0;
    
    // Inizializza le variabili per il log
    crawlStartTimeRef.current = Date.now();
    stoppedManuallyRef.current = false;
    allPagesFoundRef.current = [];

    // Crea un nuovo AbortController per questa richiesta
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/crawl-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          depth,
          followExternal: false,
          stream: true, // Abilita lo streaming
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start crawling');
      }

      // Leggi lo stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Stream not available');
      }

      let buffer = '';

      let crawlingCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setCrawling(false);
          // Se lo stream termina senza messaggio 'done', salva il log
          if (!crawlingCompleted && !stoppedManuallyRef.current) {
            await saveCrawlingLog();
          }
          break;
        }

        // Decodifica i chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Processa le linee complete
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Mantieni l'ultima linea incompleta nel buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              
              if (message.type === 'page') {
                const pageWithSelection = { ...message.data, selected: true };
                // Aggiungi la pagina alla lista pending (verrà mostrata progressivamente)
                setPendingPages(prev => [...prev, pageWithSelection]);
                // Traccia tutte le pagine trovate per il log
                allPagesFoundRef.current.push(message.data);
              } else if (message.type === 'error') {
                setError(message.error);
                setCrawling(false);
                // Salva il log con errore
                await saveCrawlingLog(message.error);
                crawlingCompleted = true;
              } else if (message.type === 'done') {
                setCrawling(false);
                // Salva il log di successo
                await saveCrawlingLog();
                crawlingCompleted = true;
              }
            } catch (e) {
              console.error('Error parsing message:', e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Crawling fermato dall'utente
        console.log('Crawling stopped by user');
        await saveCrawlingLog('Stopped by user');
      } else {
        const errorMessage = err.message || 'An error occurred during crawling';
        setError(errorMessage);
        await saveCrawlingLog(errorMessage);
      }
      setCrawling(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleTogglePage = (index: number) => {
    setPages(prevPages =>
      prevPages.map((page, i) =>
        i === index ? { ...page, selected: !page.selected } : page
      )
    );
  };

  const handleSelectAll = () => {
    setPages(prevPages => prevPages.map(page => ({ ...page, selected: true })));
  };

  const handleDeselectAll = () => {
    setPages(prevPages => prevPages.map(page => ({ ...page, selected: false })));
  };

  const selectedCount = pages.filter(p => p.selected).length;
  const totalWords = pages.filter(p => p.selected).reduce((sum, page) => sum + page.wordCount, 0);
  // Stima approssimativa: 1 token ≈ 0.75 parole (per l'inglese)
  const estimatedTokens = Math.ceil(totalWords * 1.33);

  const handleSendToTraining = async () => {
    if (selectedCount === 0) return;
    
    setSaving(true);
    setSaveSuccess(false);

    try {
      const selectedPages = pages.filter(p => p.selected);
      const items = selectedPages.map(page => ({
        type: 'website' as const,
        title: page.title || page.url,
        preview: page.excerpt || page.description || `Scraped from ${page.url}`,
        content: {
          url: page.url,
          title: page.title,
          description: page.description,
          textContent: page.textContent || '', // ← Contenuto completo per RAG
          excerpt: page.excerpt,
          depth: page.depth,
        },
        metadata: {
          wordCount: page.wordCount,
          tokens: Math.ceil(page.wordCount * 1.33),
          url: page.url,
          depth: page.depth,
        },
      }));

      const result = await addToPendingChangesWithChunking(ragId, items);

      if (result.success) {
        setSaveSuccess(true);
        // Notifica il componente PendingChanges
        pendingChangesEvents.emit();
        // Rimuovi le pagine selezionate dopo 1 secondo
        setTimeout(() => {
          setPages(prev => prev.filter(p => !p.selected));
          setSaveSuccess(false);
        }, 1000);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to add to training');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Website Source</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-4xl space-y-6">
          <p className="text-sm text-gray-600">
            Scrape and index content from websites. Enter a URL and configure the crawling options.
          </p>

          {/* Crawl Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={crawling}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Crawl Depth
              </label>
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                disabled={crawling}
                className="w-fit px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="single">Single page only</option>
                <option value="1">1 level deep</option>
                <option value="2">2 levels deep</option>
                <option value="full">Full site crawl (max 3 levels)</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!crawling ? (
                <button
                  onClick={handleStartCrawl}
                  disabled={!url}
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Start Crawling
                </button>
              ) : (
                <button
                  onClick={handleStopCrawl}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Stop Crawling
                </button>
              )}
              {pages.length > 0 && !crawling && (
                <button
                  onClick={() => {
                    setPages([]);
                    setPendingPages([]);
                    setUrl('');
                    setError('');
                    displayedCountRef.current = 0;
                  }}
                  className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Crawling Status */}
          {crawling && pages.length === 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Crawling in progress...
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    This may take a moment depending on the site size
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {pages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900">
                      Found {pages.length} page{pages.length !== 1 ? 's' : ''}
                    </h2>
                    {(crawling || pendingPages.length > 0) && (
                      <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {selectedCount} selected for training
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Send to training button - top */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleSendToTraining}
                  disabled={selectedCount === 0 || saving}
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-fit flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : saveSuccess ? (
                    <span>✓ Added to training!</span>
                  ) : (
                    <span>Send to training ({selectedCount} {selectedCount === 1 ? 'page' : 'pages'})</span>
                  )}
                </button>
                {selectedCount > 0 && (
                  <p className="text-xs text-gray-500">
                    {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
                  </p>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {pages.map((page, index) => (
                  <div
                    key={index}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      page.selected ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => handleTogglePage(index)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            page.selected
                              ? 'bg-black border-black'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {page.selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-gray-900 hover:text-gray-600 font-medium truncate block"
                          >
                            {page.url}
                          </a>
                          <h3 className="text-sm text-gray-700 mt-1.5">
                            {page.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {page.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">
                              Depth: {page.depth}
                            </span>
                            <span className="text-xs text-gray-500">
                              {page.wordCount} words
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Send to training button - bottom */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleSendToTraining}
                  disabled={selectedCount === 0 || saving}
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-fit flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : saveSuccess ? (
                    <span>✓ Added to training!</span>
                  ) : (
                    <span>Send to training ({selectedCount} {selectedCount === 1 ? 'page' : 'pages'})</span>
                  )}
                </button>
                {selectedCount > 0 && (
                  <p className="text-xs text-gray-500">
                    {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <PendingChanges alwaysVisible={true} />
    </div>
  );
}

