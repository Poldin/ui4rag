"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Search, Loader2, FileText, ExternalLink, AlertCircle, ChevronRight, X } from "lucide-react";

interface SearchResult {
  id: string;
  sourceId: string;
  content: string;
  title: string;
  similarity: number;
  source: string;
  sourceUrl?: string;
  chunkIndex: number;
  chunkTotal: number;
  metadata?: any;
}

export default function TestingPage() {
  const params = useParams();
  const ragId = params.id as string;
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [sourceContent, setSourceContent] = useState<string>("");
  const [loadingSource, setLoadingSource] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('testing-sidebar-width');
      return saved ? parseInt(saved) : 600;
    }
    return 600;
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setError("");

    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ragId,
          query: query.trim(),
          limit: 5
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.configMissing) {
          setError('Configuration incomplete. Please configure your RAG in the Config page.');
        } else if (data.connectionFailed) {
          setError('Failed to connect to database. Please check your configuration.');
        } else {
          setError(data.error || 'Search failed');
        }
        setResults([]);
        return;
      }

      setResults(data.results || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    setSelectedResult(result);
    setLoadingSource(true);
    setSourceContent("");

    try {
      const response = await fetch(`/api/get-source?ragId=${ragId}&sourceId=${result.sourceId}`);
      const data = await response.json();

      if (response.ok) {
        setSourceContent(data.content || "");
      } else {
        setSourceContent("Failed to load source content.");
      }
    } catch (err) {
      console.error("Error loading source:", err);
      setSourceContent("Failed to load source content.");
    } finally {
      setLoadingSource(false);
    }
  };

  // Resize handlers
  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 400 && newWidth <= 1200) {
        setSidebarWidth(newWidth);
        sessionStorage.setItem('testing-sidebar-width', newWidth.toString());
      }
    }
  };

  // Effect per gestire il resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => resize(e);
    const handleMouseUp = () => stopResizing();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "text":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "docs":
      case "document":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "website":
        return "bg-green-100 text-green-700 border-green-200";
      case "qa":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "notion":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Funzione per evidenziare il chunk selezionato nel testo completo
  const renderContentWithHighlight = () => {
    if (!sourceContent || !selectedResult) {
      return <p className="text-sm text-gray-500">No content available</p>;
    }

    const chunkContent = selectedResult.content;
    let index = -1;
    let chunkLength = chunkContent.length;

    // Strategia 1: Cerca match esatto
    index = sourceContent.indexOf(chunkContent);

    // Strategia 2: Cerca con spazi normalizzati
    if (index === -1) {
      const normalizedSource = sourceContent.replace(/\s+/g, ' ');
      const normalizedChunk = chunkContent.replace(/\s+/g, ' ');
      const normalizedIndex = normalizedSource.indexOf(normalizedChunk);
      
      if (normalizedIndex !== -1) {
        // Converti l'indice normalizzato a quello originale
        let charCount = 0;
        for (let i = 0; i < sourceContent.length; i++) {
          if (sourceContent.slice(i).replace(/\s+/g, ' ').startsWith(normalizedChunk)) {
            index = i;
            // Trova la lunghezza effettiva nel testo originale
            let normalizedCount = 0;
            let actualLength = 0;
            while (normalizedCount < normalizedChunk.length && i + actualLength < sourceContent.length) {
              const char = sourceContent[i + actualLength];
              actualLength++;
              if (!/\s/.test(char) || normalizedChunk[normalizedCount] === ' ') {
                normalizedCount++;
              }
            }
            chunkLength = actualLength;
            break;
          }
        }
      }
    }

    // Strategia 3: Cerca le prime 50 parole del chunk
    if (index === -1) {
      const words = chunkContent.split(/\s+/).filter(w => w.length > 0);
      if (words.length > 0) {
        const firstWords = words.slice(0, Math.min(10, words.length)).join(' ');
        index = sourceContent.indexOf(firstWords);
        if (index !== -1) {
          chunkLength = chunkContent.length;
        }
      }
    }

    // Strategia 4: Cerca qualsiasi sottostringa di almeno 30 caratteri
    if (index === -1 && chunkContent.length > 30) {
      for (let len = Math.min(chunkContent.length, 100); len >= 30; len -= 10) {
        const substring = chunkContent.substring(0, len);
        index = sourceContent.indexOf(substring);
        if (index !== -1) {
          chunkLength = Math.min(chunkContent.length, sourceContent.length - index);
          break;
        }
      }
    }

    // Se proprio non troviamo nulla, evidenzia basandoci sul chunk index
    if (index === -1) {
      // Usa l'indice del chunk per posizionarti approssimativamente
      const approxCharsPerChunk = Math.floor(sourceContent.length / (selectedResult.chunkTotal || 1));
      index = approxCharsPerChunk * selectedResult.chunkIndex;
      chunkLength = Math.min(chunkContent.length, sourceContent.length - index);
    }

    // Assicurati che l'indice sia valido
    if (index < 0) index = 0;
    if (index >= sourceContent.length) index = sourceContent.length - 1;
    if (index + chunkLength > sourceContent.length) {
      chunkLength = sourceContent.length - index;
    }

    // Dividi il contenuto in tre parti: prima, chunk, dopo
    const before = sourceContent.substring(0, index);
    const chunk = sourceContent.substring(index, index + chunkLength);
    const after = sourceContent.substring(index + chunkLength);

    return (
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {before}
        <mark className="bg-yellow-100 px-1 text-gray-700 inline-block">
          {chunk}
        </mark>
        {after}
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginRight: selectedResult ? `${sidebarWidth}px` : 0 }}
      >
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Subtitle */}
            <p className="text-xs text-gray-500 mb-3">
              Test your RAG by searching through your indexed content
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question or search for content..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </form>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-900">Search Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Searching your RAG...</p>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && !error && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No results found</p>
              <p className="text-xs text-gray-500 mt-2">Try a different search query</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">
                Found <strong>{results.length}</strong> results
              </p>

              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all bg-white cursor-pointer relative group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {result.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSourceBadgeColor(result.source)}`}>
                          {result.source}
                        </span>
                        <span className="text-xs text-gray-500">
                          {result.similarity.toFixed(1)}% match
                        </span>
                        <span className="text-xs text-gray-500">
                          Chunk {result.chunkIndex + 1}/{result.chunkTotal}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.sourceUrl && (
                        <a
                          href={result.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          {!hasSearched && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                How to use your RAG
              </h3>
              <ul className="text-sm text-gray-800 space-y-1">
                <li>• Enter a question or search query above</li>
                <li>• Results will show matching content from your indexed sources</li>
                <li>• Similarity scores indicate how relevant each result is</li>
                <li>• Click on any result to view the full source content</li>
              </ul>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {selectedResult && (
        <div 
          className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl flex flex-col z-50"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={startResizing}
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-gray-300 transition-colors"
            style={{ marginLeft: '-2px' }}
          />

          {/* Sidebar Header */}
          <div className="border-b border-gray-200 px-4 py-3 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {selectedResult.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSourceBadgeColor(selectedResult.source)}`}>
                  {selectedResult.source}
                </span>
                <span className="text-xs text-gray-500">
                  Chunk {selectedResult.chunkIndex + 1} of {selectedResult.chunkTotal}
                </span>
                <span className="text-xs text-gray-500">
                  {selectedResult.similarity.toFixed(1)}% match
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedResult(null)}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loadingSource ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chunk Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    Chunk {selectedResult.chunkIndex + 1} of {selectedResult.chunkTotal} • {selectedResult.similarity.toFixed(1)}% match
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    The highlighted text below shows where this chunk appears in the full source content.
                  </p>
                </div>

                {/* Full Source Content with Highlighted Chunk */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                    Full Source Content
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {renderContentWithHighlight()}
                  </div>
                </div>

                {/* Source URL if available */}
                {selectedResult.sourceUrl && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                      Source URL
                    </h3>
                    <a
                      href={selectedResult.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {selectedResult.sourceUrl}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}





