'use client';

import { useState } from "react";
import PendingChanges from "../../../../components/PendingChanges";

export default function TextSourcePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Calcola le statistiche
  const hasContent = content.trim().length > 0;
  const totalWords = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const estimatedTokens = Math.ceil(totalWords * 1.33);

  const handleSave = () => {
    // TODO: Implementare salvataggio nel database
    console.log('Ready to send text to training', { title, content, totalWords, estimatedTokens });
  };

  const handleClear = () => {
    setTitle('');
    setContent('');
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Text Source</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm text-gray-600">
            Add text content directly to your RAG
          </p>

          {/* Send to training button - top */}
          {hasContent && (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors w-fit"
              >
                Send to training
              </button>
              <p className="text-xs text-gray-500">
                {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this content..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
            <textarea
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type your text content here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-none"
            />
          </div>

          {/* Send to training button - bottom */}
          {hasContent && (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors w-fit"
              >
                Send to training
              </button>
              <p className="text-xs text-gray-500">
                {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
              </p>
            </div>
          )}

          {content.trim().length > 0 && (
            <button 
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <PendingChanges />
    </div>
  );
}

