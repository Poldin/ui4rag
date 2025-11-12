'use client';

import { useState, useRef } from "react";
import { Upload, Loader2, Check, X } from "lucide-react";
import PendingChanges from "../../../../components/PendingChanges";

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
}

export default function DocsSourcePage() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError('');
    setUploading(true);

    try {
      const newDocuments: DocumentData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Verifica dimensione (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File ${file.name} is too large (max 10MB)`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse-document', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Failed to parse ${file.name}`);
        }

        newDocuments.push({
          id: `${Date.now()}-${i}`,
          ...data.document,
          selected: true,
        });
      }

      setDocuments(prev => [...prev, ...newDocuments]);
    } catch (err: any) {
      setError(err.message || 'Failed to process documents');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    setDocuments(prev => prev.map(doc => ({ ...doc, selected: true })));
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

  // Calcola statistiche
  const selectedDocs = documents.filter(doc => doc.selected);
  const totalWords = selectedDocs.reduce((sum, doc) => sum + doc.wordCount, 0);
  const estimatedTokens = Math.ceil(totalWords * 1.33);

  const handleSave = () => {
    // TODO: Implementare salvataggio nel database
    console.log('Ready to send documents to training', selectedDocs);
  };

  return (
    <div className="h-full flex flex-col relative">
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
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
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
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-600">
                  PDF, DOCX, PPTX, TXT, MD up to 10MB
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
                  <p className="text-sm text-gray-600 mt-0.5">
                    {selectedDocs.length} selected for training
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
                    className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors w-fit"
                  >
                    Send to training ({selectedDocs.length} {selectedDocs.length === 1 ? 'document' : 'documents'})
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
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      doc.selected ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => toggleDocument(doc.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            doc.selected
                              ? 'bg-black border-black'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {doc.selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {doc.filename}
                            </h3>
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
                    className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors w-fit"
                  >
                    Send to training ({selectedDocs.length} {selectedDocs.length === 1 ? 'document' : 'documents'})
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
      <PendingChanges />
    </div>
  );
}

