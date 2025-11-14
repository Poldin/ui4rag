"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Zap, ChevronDown, ChevronUp, FileText, Globe, FileStack, MessageSquare, StickyNote, Loader2, X } from "lucide-react";
import { getPendingChanges, clearPendingChanges, removeFromPendingChanges, type PendingItem } from "../../lib/actions/pending-changes";
import { pendingChangesEvents } from "../../lib/events/pending-changes-events";

interface PendingChangesProps {
  alwaysVisible?: boolean; // Se true, mostra sempre il badge anche con 0 items
}

export default function PendingChanges({ alwaysVisible = false }: PendingChangesProps) {
  const params = useParams();
  const ragId = params?.id as string | undefined;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Funzione per caricare i pending items
  const loadPendingItems = useCallback(async () => {
    if (!ragId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await getPendingChanges(ragId);
      if (result.success && result.items) {
        setPendingItems(result.items);
      } else {
        setError(result.error || 'Failed to load pending changes');
      }
    } catch (err) {
      console.error('Error loading pending items:', err);
      setError('Failed to load pending changes');
    } finally {
      setLoading(false);
    }
  }, [ragId]);

  // Carica i pending items dal database all'avvio
  useEffect(() => {
    loadPendingItems();
  }, [loadPendingItems]);

  // Ascolta eventi di aggiornamento per refresh immediato
  useEffect(() => {
    const unsubscribe = pendingChangesEvents.subscribe(() => {
      loadPendingItems();
    });

    return unsubscribe;
  }, [loadPendingItems]);

  const [trainingProgress, setTrainingProgress] = useState<{
    currentItem: number;
    totalItems: number;
    currentItemTitle: string;
    processedChunks: number;
    totalChunks: number;
    message: string;
    warnings: string[];
  } | null>(null);

  const handleRemoveItem = async (itemId: string) => {
    if (!ragId || !itemId) return;
    
    setDeletingItemId(itemId);
    try {
      const result = await removeFromPendingChanges(ragId, itemId);
      if (result.success) {
        // Rimuovi l'item localmente
        setPendingItems(prev => prev.filter(item => item.id !== itemId));
        // Emetti evento per aggiornare altri componenti
        pendingChangesEvents.emit();
      } else {
        console.error('Failed to remove item:', result.error);
        alert(`Failed to remove item: ${result.error}`);
      }
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleRunTraining = async () => {
    if (!ragId || pendingItems.length === 0) return;
    
    setIsProcessing(true);
    setTrainingProgress({
      currentItem: 0,
      totalItems: pendingItems.length,
      currentItemTitle: '',
      processedChunks: 0,
      totalChunks: 0,
      message: 'Initializing training...',
      warnings: [],
    });

    try {
      const response = await fetch('/api/run-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ragId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start training');
      }

      // Leggi lo stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Stream not available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decodifica i chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Processa le linee complete
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              
              switch (message.type) {
                case 'start':
                  setTrainingProgress(prev => ({
                    ...prev!,
                    totalItems: message.data.totalItems,
                    message: 'Training started...',
                  }));
                  break;

                case 'progress':
                  setTrainingProgress(prev => ({
                    ...prev!,
                    currentItem: message.data.currentItem,
                    currentItemTitle: message.data.itemTitle,
                    message: `Processing: ${message.data.itemTitle}`,
                  }));
                  break;

                case 'chunking':
                  setTrainingProgress(prev => ({
                    ...prev!,
                    totalChunks: (prev?.totalChunks || 0) + message.data.chunksCreated,
                    message: `Created ${message.data.chunksCreated} chunks for ${message.data.item}`,
                  }));
                  break;

                case 'chunk_processed':
                  setTrainingProgress(prev => ({
                    ...prev!,
                    processedChunks: (prev?.processedChunks || 0) + 1,
                    message: `Processed chunk ${message.data.chunk}/${message.data.totalChunks} of ${message.data.item}`,
                  }));
                  break;

                case 'info':
                  setTrainingProgress(prev => ({
                    ...prev!,
                    message: message.data.message,
                  }));
                  break;

                case 'warning':
                  console.warn('Training warning:', message.data.message);
                  setTrainingProgress(prev => ({
                    ...prev!,
                    warnings: [...(prev?.warnings || []), message.data.message],
                  }));
                  break;

                case 'complete':
                  const hasWarnings = (trainingProgress?.warnings || []).length > 0;
                  const completionMsg = hasWarnings 
                    ? `Training completed with ${trainingProgress?.warnings.length} warning(s)` 
                    : 'Training completed successfully!';
                  
                  setTrainingProgress(prev => ({
                    ...prev!,
                    message: completionMsg,
                  }));
                  
                  // Aspetta un momento per mostrare il messaggio
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  // Ricarica pending items
                  setPendingItems([]);
                  
                  // NON chiudere automaticamente - lascia decidere all'utente
                  break;

                case 'error':
                  throw new Error(message.data.message);
              }
            } catch (parseError) {
              console.error('Error parsing message:', parseError);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Training failed:', error);
      setTrainingProgress(prev => ({
        ...prev!,
        message: `❌ Training failed: ${error.message}`,
        warnings: [...(prev?.warnings || []), `CRITICAL ERROR: ${error.message}`],
      }));
      // NON chiudere/aprire il pannello - lascia decidere all'utente
    } finally {
      setIsProcessing(false);
      // NON resettare il progress automaticamente
      // L'utente può chiudere manualmente il pannello
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "text": return <FileText className="w-3.5 h-3.5" />;
      case "website": return <Globe className="w-3.5 h-3.5" />;
      case "docs": return <FileStack className="w-3.5 h-3.5" />;
      case "qa": return <MessageSquare className="w-3.5 h-3.5" />;
      case "notion": return <StickyNote className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Non mostrare nulla se non c'è ragId
  if (!ragId) return null;
  
  // Se alwaysVisible è false, nascondi se non ci sono items
  if (!alwaysVisible && pendingItems.length === 0 && !loading) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isExpanded ? (
        // Collapsed - Small Badge
        <button
          onClick={() => setIsExpanded(true)}
          className={`${
            pendingItems.length > 0 
              ? 'bg-gray-900 text-white hover:bg-gray-800' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          } rounded-full px-3 py-2 shadow-lg transition-all flex items-center gap-2 border ${
            pendingItems.length > 0 ? 'border-gray-800' : 'border-gray-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">{pendingItems.length}</span>
        </button>
      ) : (
        // Expanded - Full Panel
        <div className="w-96">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Pending Changes
                    </h3>
                    <p className="text-xs text-gray-300">
                      {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} not indexed yet
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
            <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-md p-2 bg-gray-50 group hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-gray-600 mt-0.5">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {item.preview}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTimeAgo(item.addedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={deletingItemId === item.id || isProcessing}
                      className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Remove from queue"
                    >
                      {deletingItemId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-100 border border-gray-300 rounded-md p-2 mb-3">
              <p className="text-xs text-gray-700">
                <strong>What happens next?</strong> When you run training, we'll generate embeddings for all pending items and save them to your vector database.
              </p>
            </div>

            <button
              onClick={() => {
                if (trainingProgress && !isProcessing) {
                  // Se il training è finito (con o senza errori), resetta
                  setTrainingProgress(null);
                } else {
                  // Altrimenti avvia il training
                  handleRunTraining();
                }
              }}
              disabled={isProcessing}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded-md font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : trainingProgress && !isProcessing ? (
                <span>Close Training Log</span>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Run Training</span>
                </>
              )}
            </button>

            {trainingProgress && (
              <div className="mt-2">
                {isProcessing && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                    <div 
                      className="bg-gray-900 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: trainingProgress.totalChunks > 0 
                          ? `${(trainingProgress.processedChunks / trainingProgress.totalChunks) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                )}
                
                <div className={`p-3 rounded border ${
                  isProcessing 
                    ? 'bg-gray-50 border-gray-200' 
                    : trainingProgress.warnings.length > 0 
                      ? 'bg-yellow-50 border-yellow-300' 
                      : 'bg-green-50 border-green-300'
                }`}>
                  <p className="text-xs text-gray-700 font-medium mb-1">
                    {isProcessing 
                      ? `Processing item ${trainingProgress.currentItem} of ${trainingProgress.totalItems}`
                      : 'Training Summary'
                    }
                  </p>
                  <p className="text-xs text-gray-600">
                    {trainingProgress.message}
                  </p>
                  {trainingProgress.totalChunks > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Chunks: {trainingProgress.processedChunks} / {trainingProgress.totalChunks}
                    </p>
                  )}
                </div>

                {trainingProgress.warnings.length > 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded text-xs">
                    <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-1">
                      ⚠️ Warnings/Errors ({trainingProgress.warnings.length})
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1.5 bg-white p-2 rounded border border-yellow-200">
                      {trainingProgress.warnings.map((warning, idx) => (
                        <p key={idx} className="text-yellow-800 text-xs leading-relaxed">
                          <span className="font-medium">#{idx + 1}:</span> {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

