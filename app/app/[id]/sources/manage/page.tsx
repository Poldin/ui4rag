'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, Trash2, RefreshCw, Check, FileText, X } from "lucide-react";
import PendingChanges from "../../../../components/PendingChanges";

interface TrainedResource {
  id: string;
  content: string;
  title?: string;
  metadata: any;
  created_at: string;
}

interface Chunk {
  id: string;
  content: string;
  chunkIndex: number;
  chunkTotal: number;
  metadata: any;
  createdAt: string;
}

interface SourceWithChunks {
  source: {
    id: string;
    title: string;
    content: string;
    sourceType: string;
    metadata: any;
    createdAt: string;
  };
  chunks: Chunk[];
  stats: {
    totalChunks: number;
    sourceLength: number;
  };
}

interface ConnectionStatus {
  connected: boolean;
  error?: string;
  tableName?: string;
  configMissing?: boolean;
  stats?: {
    totalSources: number;
    totalChunks: number;
    chunksWithEmbeddings: number;
    sourcesByType?: Record<string, number>;
  };
  tables?: {
    sources: string;
    chunks: string;
  };
}

export default function ManageSourcesPage() {
  const params = useParams();
  const router = useRouter();
  const ragId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<TrainedResource[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  
  // Sidebar per vedere i chunks
  const [selectedSource, setSelectedSource] = useState<SourceWithChunks | null>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('manage-sidebar-width');
      return saved ? parseInt(saved) : 600;
    }
    return 600;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Carica le risorse dal database configurato
  useEffect(() => {
    loadResources();
  }, [ragId]);

  const loadResources = async () => {
    setLoading(true);
    setConnectionStatus({ connected: false });
    setResources([]);
    
    try {
      const response = await fetch(`/api/manage-resources?ragId=${ragId}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.configMissing) {
          setConnectionStatus({
            connected: false,
            configMissing: true,
            error: 'Database configuration is incomplete. Please configure your RAG first.'
          });
        } else if (data.connectionFailed) {
          setConnectionStatus({
            connected: false,
            error: data.details || data.error || 'Failed to connect to database'
          });
        } else {
          throw new Error(data.error || 'Failed to load resources');
        }
        return;
      }

      setResources(data.resources || []);
      setConnectionStatus({
        connected: true,
        tableName: data.tables?.sources || data.tableName,
        stats: data.stats,
        tables: data.tables,
      });
    } catch (error: any) {
      console.error('Error loading resources:', error);
      setConnectionStatus({
        connected: false,
        error: error.message || 'Failed to load resources'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setSelectedResources(new Set());
    loadResources();
  };

  const toggleResource = (id: string) => {
    const newSelected = new Set(selectedResources);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResources(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedResources(new Set(resources.map(r => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedResources(new Set());
  };

  // Carica i chunks di un source
  const handleViewChunks = async (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita il toggle della selezione
    setLoadingChunks(true);
    setSelectedSource(null);

    try {
      const response = await fetch(`/api/get-source-chunks?ragId=${ragId}&sourceId=${sourceId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load chunks');
      }

      setSelectedSource(data);
    } catch (error: any) {
      console.error('Error loading chunks:', error);
      alert('Failed to load chunks: ' + error.message);
    } finally {
      setLoadingChunks(false);
    }
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
        sessionStorage.setItem('manage-sidebar-width', newWidth.toString());
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (selectedResources.size === 0) return;
    setShowDeleteConfirm(false);
    setDeleting(true);

    try {
      const response = await fetch('/api/manage-resources', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ragId,
          resourceIds: Array.from(selectedResources)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete resources');
      }

      // Rimuovi le risorse eliminate dalla lista
      setResources(prev => prev.filter(r => !selectedResources.has(r.id)));
      setSelectedResources(new Set());
    } catch (error: any) {
      console.error('Error deleting resources:', error);
      setConnectionStatus(prev => ({
        ...prev,
        error: error.message || 'Failed to delete resources'
      }));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceBadge = (sourceType: string) => {
    switch (sourceType) {
      case 'text':
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Text' };
      case 'document':
      case 'docs':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Document' };
      case 'website':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Website' };
      case 'qa':
        return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Q&A' };
      case 'notion':
        return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Notion' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: sourceType || 'Unknown' };
    }
  };

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginRight: selectedSource ? `${sidebarWidth}px` : 0 }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Manage Trained Resources</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and manage all resources currently trained in your RAG system
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-6xl space-y-6">
          {/* Connection Status */}
          <div className={`p-4 rounded-lg border ${
            loading 
              ? 'bg-gray-50 border-gray-200'
              : connectionStatus.connected
              ? 'bg-gray-50 border-gray-200'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center gap-3">
              {loading ? (
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              ) : connectionStatus.connected ? (
                <Check className="w-5 h-5 text-gray-900" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-600" />
              )}
              <div className="flex-1">
                {loading ? (
                  <p className="text-sm font-medium text-gray-900">
                    Connecting to database...
                  </p>
                ) : connectionStatus.connected ? (
                  <>
                    <p className="text-sm font-medium text-gray-900">
                      {connectionStatus.tables ? (
                        <>Connected to: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{connectionStatus.tables.sources}</code> + <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{connectionStatus.tables.chunks}</code></>
                      ) : (
                        <>Connected to table: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{connectionStatus.tableName}</code></>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {connectionStatus.stats ? (
                        <>{connectionStatus.stats.totalSources} sources, {connectionStatus.stats.totalChunks} chunks ({connectionStatus.stats.chunksWithEmbeddings} embedded)</>
                      ) : (
                        <>{resources.length} resource{resources.length !== 1 ? 's' : ''} found</>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900">
                      {connectionStatus.configMissing ? 'Configuration required' : 'Connection error'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {connectionStatus.error}
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* No config or connection error */}
          {!loading && (connectionStatus.configMissing || (!connectionStatus.connected && connectionStatus.error)) && (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">
                {connectionStatus.configMissing ? 'Configuration Required' : 'Connection Error'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {connectionStatus.configMissing 
                  ? 'Please configure your RAG connection settings first'
                  : 'Unable to connect to the configured database. Please check your settings.'}
              </p>
              <button
                onClick={() => router.push(`/app/${ragId}/config`)}
                className="inline-flex items-center px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
              >
                Go to Config
              </button>
            </div>
          )}

          {/* Resources list */}
          {!loading && connectionStatus.connected && resources.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Trained Resources
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {selectedResources.size} selected
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
                  <button
                    onClick={() => selectedResources.size > 0 && setShowDeleteConfirm(true)}
                    disabled={selectedResources.size === 0 || deleting}
                    className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete ({selectedResources.size})
                  </button>
                </div>
              </div>

              {/* Resources table/list */}
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedResources.has(resource.id) ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => toggleResource(resource.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedResources.has(resource.id)
                              ? 'bg-black border-black'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {selectedResources.has(resource.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900">
                              {resource.title || resource.metadata?.source_title || resource.metadata?.url || 'Untitled'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {(() => {
                                // Prova prima source_type (dalla nuova struttura), poi source (legacy)
                                const sourceType = resource.metadata?.source_type || resource.metadata?.source || 'unknown';
                                const badge = getSourceBadge(sourceType);
                                return (
                                  <span className={`text-xs px-2 py-0.5 rounded border ${badge.bg} ${badge.text}`}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              <span className="text-xs text-gray-500">
                                {formatDate(resource.created_at)}
                              </span>
                              {resource.metadata?.wordCount && (
                                <span className="text-xs text-gray-500">
                                  {resource.metadata.wordCount.toLocaleString()} words
                                </span>
                              )}
                              {resource.metadata?.chunkCount !== undefined && (
                                <span className="text-xs text-gray-500">
                                  {resource.metadata.chunkCount.toLocaleString()} chunks
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleViewChunks(resource.id, e)}
                            className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Chunks
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {resource.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && connectionStatus.connected && resources.length === 0 && (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                No resources found
              </h3>
              <p className="text-sm text-gray-600">
                Start training resources from the Sources section
              </p>
            </div>
          )}
        </div>
        </div>

        <PendingChanges />
      </div>

      {/* Sidebar per vedere i chunks */}
      {selectedSource && (
        <div 
          className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl flex flex-col z-50"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
            onMouseDown={startResizing}
          />

          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-900">Chunks Breakdown</h2>
            </div>
            <button
              onClick={() => setSelectedSource(null)}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Source Info */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {selectedSource.source.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>{selectedSource.stats.totalChunks} chunks</span>
              <span>•</span>
              <span>{selectedSource.stats.sourceLength.toLocaleString()} chars</span>
              <span>•</span>
              <span className="capitalize">{selectedSource.source.sourceType}</span>
            </div>
          </div>

          {/* Loading */}
          {loadingChunks && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Chunks List */}
          {!loadingChunks && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-gray-500 mb-2">
                Each chunk is processed independently for embeddings
              </p>
              
              {selectedSource.chunks.map((chunk, idx) => (
                <div
                  key={chunk.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
                >
                  {/* Chunk Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                        Chunk {idx + 1} / {selectedSource.chunks.length}
                      </span>
                      {chunk.metadata?.word_count && (
                        <span className="text-xs text-gray-500">
                          {chunk.metadata.word_count} words
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chunk Content */}
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {chunk.content}
                  </p>

                  {/* Metadata */}
                  {chunk.metadata && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                      {chunk.metadata.start_char !== undefined && (
                        <span>Pos: {chunk.metadata.start_char}-{chunk.metadata.end_char}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Powered by LangChain badge */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center">
              Powered by <span className="font-semibold text-gray-700">LangChain</span> intelligent chunking
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Delete Resources
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete {selectedResources.size} resource{selectedResources.size !== 1 ? 's' : ''}? 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

