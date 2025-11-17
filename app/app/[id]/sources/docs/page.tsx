'use client';

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Upload, Loader2, Check, X, FileText, AlertTriangle } from "lucide-react";
import PendingChanges from "../../../../components/PendingChanges";
import { addToPendingChanges } from "../../../../../lib/actions/pending-changes";
import { pendingChangesEvents } from "../../../../../lib/events/pending-changes-events";

interface DocumentData {
  id: string;
  filename: string;
  fileType: string;
  fileSize: string;
  fileSizeBytes: number;
  pages: number;
  wordCount: number;
  textPreview: string;
  fullText: string;
  title: string;
  selected: boolean;
  status: 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export default function DocsSourcePage() {
  const params = useParams();
  const ragId = params.id as string;
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [stoppedManually, setStoppedManually] = useState(false);
  
  // Sidebar per vedere contenuto estratto
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('docs-sidebar-width');
      return saved ? parseInt(saved) : 600;
    }
    return 600;
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleStopProcessing = () => {
    setStoppedManually(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    
    // Rimuovi i documenti ancora in "processing"
    setDocuments(prev => prev.filter(doc => doc.status !== 'processing'));
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Limite massimo 10 file per volta
    if (files.length > 10) {
      setError(`You can upload a maximum of 10 files at once. You selected ${files.length} files. Please select fewer files.`);
      return;
    }

    setError('');
    setUploading(true);
    setStoppedManually(false);
    
    // Crea un nuovo AbortController
    abortControllerRef.current = new AbortController();

    // Crea placeholder per tutti i file con stato "processing"
    const placeholders: DocumentData[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      filename: file.name,
      fileType: file.name.split('.').pop() || '',
      fileSize: `${(file.size / 1024).toFixed(2)} KB`,
      fileSizeBytes: file.size,
      pages: 0,
      wordCount: 0,
      textPreview: '',
      fullText: '',
      title: file.name.replace(/\.[^/.]+$/, ''),
      selected: true,
      status: 'processing' as const,
    }));

    setDocuments(prev => [...prev, ...placeholders]);

    // Processa ogni file e aggiorna lo stato individualmente
    for (let i = 0; i < files.length; i++) {
      // Controlla se è stato fermato manualmente
      if (stoppedManually || abortControllerRef.current?.signal.aborted) {
        console.log('Processing stopped by user');
        break;
      }
      
      const file = files[i];
      const docId = placeholders[i].id;

      try {
        // Verifica dimensione (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === docId
                ? { ...doc, status: 'error', errorMessage: 'File too large (max 100MB)' }
                : doc
            )
          );
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse-document', {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current?.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          // Errore ma continuiamo con gli altri file
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === docId
                ? { ...doc, status: 'error', errorMessage: data.error || 'Failed to parse' }
                : doc
            )
          );
          continue;
        }

        // Successo - aggiorna con i dati reali
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === docId
              ? { ...doc, ...data.document, status: 'success', selected: true }
              : doc
          )
        );
      } catch (err: any) {
        // Se è stato aborted dall'utente, skippa
        if (err.name === 'AbortError') {
          console.log('Request aborted by user');
          break;
        }
        
        // Errore ma continuiamo con gli altri file
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === docId
              ? { ...doc, status: 'error', errorMessage: err.message || 'Failed to process' }
              : doc
          )
        );
      }
    }

    // Rimuovi documenti rimasti in "processing" se fermato manualmente
    if (stoppedManually || abortControllerRef.current?.signal.aborted) {
      setDocuments(prev => prev.filter(doc => doc.status !== 'processing'));
    }

    setUploading(false);
    abortControllerRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleDocument = (id: string) => {
    setDocuments(prev =>
      prev.map(doc => (doc.id === id ? { ...doc, selected: !doc.selected } : doc))
    );
  };

  const handleSelectAll = () => {
    setDocuments(prev => prev.map(doc => ({ 
      ...doc, 
      selected: doc.status === 'success' // Seleziona solo i documenti con successo
    })));
  };

  const handleDeselectAll = () => {
    setDocuments(prev => prev.map(doc => ({ ...doc, selected: false })));
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleClearAll = () => {
    setDocuments([]);
    setError('');
  };

  // Resize handlers per la sidebar
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
        sessionStorage.setItem('docs-sidebar-width', newWidth.toString());
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

  // Calcola statistiche
  const selectedDocs = documents.filter(doc => doc.selected && doc.status === 'success');
  const totalWords = selectedDocs.reduce((sum, doc) => sum + doc.wordCount, 0);
  const estimatedTokens = Math.ceil(totalWords * 1.33);
  
  const successCount = documents.filter(doc => doc.status === 'success').length;
  const errorCount = documents.filter(doc => doc.status === 'error').length;
  const processingCount = documents.filter(doc => doc.status === 'processing').length;

  const handleSave = async () => {
    if (selectedDocs.length === 0) return;
    
    setSaving(true);
    setSaveSuccess(false);

    try {
      const items = selectedDocs.map(doc => ({
        type: 'docs' as const,
        title: doc.title || doc.filename,
        preview: doc.textPreview,
        content: {
          filename: doc.filename,
          fileType: doc.fileType,
          pages: doc.pages,
          text: doc.fullText,
          title: doc.title,
        },
        metadata: {
          wordCount: doc.wordCount,
          tokens: Math.ceil(doc.wordCount * 1.33),
          fileSize: doc.fileSize,
          fileSizeBytes: doc.fileSizeBytes,
          pages: doc.pages,
        },
      }));

      const result = await addToPendingChanges(ragId, items);

      if (result.success) {
        setSaveSuccess(true);
        // Notifica il componente PendingChanges
        pendingChangesEvents.emit();
        // Rimuovi i documenti selezionati dopo 1 secondo
        setTimeout(() => {
          setDocuments(prev => prev.filter(doc => !doc.selected));
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
    <div className="h-full flex">
      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginRight: selectedDoc ? `${sidebarWidth}px` : 0 }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Documents Source</h1>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-4xl space-y-6">
          <p className="text-sm text-gray-600">
            Upload documents to your RAG (PDF, DOCX, PPTX, TXT, MD)
          </p>

          {/* Upload area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-300 rounded-lg p-12 text-center transition-colors ${
              uploading ? '' : 'hover:border-gray-400 cursor-pointer'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.txt,.md"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Processing documents...
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  {processingCount} of {documents.length} in progress
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopProcessing();
                  }}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                >
                  Stop Processing
                </button>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-600">
                  PDF, DOCX, PPTX, TXT, MD (max 10 files, 100MB each)
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Documents list */}
          {documents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Uploaded {documents.length} document{documents.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="flex items-center gap-4 mt-0.5 text-sm">
                    <span className="text-gray-600">{selectedDocs.length} selected</span>
                    {successCount > 0 && (
                      <span className="text-gray-900 font-medium">✓ {successCount} success</span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-red-600 font-semibold">✗ {errorCount} error{errorCount !== 1 ? 's' : ''}</span>
                    )}
                    {processingCount > 0 && (
                      <span className="text-gray-500">⟳ {processingCount} processing</span>
                    )}
                  </div>
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
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Send to training button - top */}
              {selectedDocs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors w-fit disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : saveSuccess ? (
                      <span>✓ Added to training!</span>
                    ) : (
                      <span>Send to training ({selectedDocs.length} {selectedDocs.length === 1 ? 'document' : 'documents'})</span>
                    )}
                  </button>
                  <p className="text-xs text-gray-500">
                    {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
                  </p>
                </div>
              )}

              {/* Documents list */}
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 transition-colors ${
                      doc.status === 'error'
                        ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-600'
                        : doc.status === 'processing'
                        ? 'bg-gray-50 opacity-60'
                        : doc.selected
                        ? 'bg-gray-100 hover:bg-gray-50 cursor-pointer'
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                    onClick={() => doc.status === 'success' && toggleDocument(doc.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className="flex-shrink-0 mt-1">
                        {doc.status === 'processing' ? (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : doc.status === 'error' ? (
                          <div className="w-5 h-5 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                            <X className="w-3 h-3 text-red-600" />
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              doc.selected
                                ? 'bg-black border-black'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {doc.selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-sm font-medium truncate ${
                                doc.status === 'error' ? 'text-red-900' : 'text-gray-900'
                              }`}>
                                {doc.filename}
                              </h3>
                              {doc.status === 'processing' && (
                                <span className="text-xs text-gray-500 font-medium">Processing...</span>
                              )}
                              {doc.status === 'error' && (
                                <span className="text-xs text-red-600 font-semibold">✗ Failed</span>
                              )}
                            </div>
                            {doc.status === 'error' ? (
                              <div className="mt-1 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
                                <strong>Error:</strong> {doc.errorMessage}
                              </div>
                            ) : (
                              <>
                                <p className="text-xs text-gray-500 mt-1">
                                  {doc.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {doc.textPreview}
                                </p>
                                
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-gray-500 uppercase">
                                    {doc.fileType}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {doc.pages} {doc.pages === 1 ? 'page' : 'pages'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {doc.wordCount.toLocaleString()} words
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {doc.fileSize}
                                  </span>
                                </div>
                                
                                {/* Bottone per vedere contenuto */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDoc(doc);
                                  }}
                                  className="mt-2 px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  View Extracted Text
                                </button>
                              </>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDocument(doc.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Send to training button - bottom */}
              {selectedDocs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors w-fit disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : saveSuccess ? (
                      <span>✓ Added to training!</span>
                    ) : (
                      <span>Send to training ({selectedDocs.length} {selectedDocs.length === 1 ? 'document' : 'documents'})</span>
                    )}
                  </button>
                  <p className="text-xs text-gray-500">
                    {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        
        <PendingChanges alwaysVisible={true} />
      </div>

      {/* Sidebar per vedere contenuto estratto */}
      {selectedDoc && (
        <div 
          className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl flex flex-col z-50"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-400 transition-colors"
            onMouseDown={startResizing}
          />

          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-900">Extracted Text</h2>
            </div>
            <button
              onClick={() => setSelectedDoc(null)}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Document Info */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {selectedDoc.filename}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
              <span className="uppercase">{selectedDoc.fileType}</span>
              <span>•</span>
              <span>{selectedDoc.pages} {selectedDoc.pages === 1 ? 'page' : 'pages'}</span>
              <span>•</span>
              <span>{selectedDoc.wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{selectedDoc.fileSize}</span>
            </div>
          </div>

          {/* Extracted Text Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-xs text-gray-500 mb-3">
                This is the text that will be chunked and embedded into your RAG:
              </p>
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                {selectedDoc.fullText}
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center">
              {selectedDoc.fullText.length.toLocaleString()} characters ready for training
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

