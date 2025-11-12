"use client";

import { useState } from "react";
import { Zap, ChevronDown, ChevronUp, FileText, Globe, FileStack, MessageSquare, StickyNote, Loader2 } from "lucide-react";

interface PendingItem {
  id: string;
  type: "text" | "website" | "docs" | "qa" | "notion";
  title: string;
  preview: string;
  addedAt: Date;
}

export default function PendingChanges() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock pending items - in production, fetch from database
  const pendingItems: PendingItem[] = [
    {
      id: "1",
      type: "text",
      title: "How to use RAG",
      preview: "RAG combines retrieval with generation...",
      addedAt: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
    },
    {
      id: "2",
      type: "website",
      title: "example.com/docs",
      preview: "Scraped 15 pages from documentation",
      addedAt: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes ago
    },
    {
      id: "3",
      type: "qa",
      title: "Q&A Pair",
      preview: "What is vector similarity search?",
      addedAt: new Date(Date.now() - 1000 * 60 * 2) // 2 minutes ago
    },
  ];

  const handleRunTraining = async () => {
    setIsProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsProcessing(false);
    // In production: generate embeddings and save to vector DB
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

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (pendingItems.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isExpanded ? (
        // Collapsed - Small Badge
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-900 text-white rounded-full px-3 py-2 shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 border border-gray-800"
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
                  className="border border-gray-200 rounded-md p-2 bg-gray-50"
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
              onClick={handleRunTraining}
              disabled={isProcessing}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded-md font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Run Training</span>
                </>
              )}
            </button>

            {isProcessing && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gray-900 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  Generating embeddings and saving to database...
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

