'use client';

import { useState } from "react";
import { useParams } from "next/navigation";
import PendingChanges from "../../../../components/PendingChanges";
import { addToPendingChangesWithChunking } from "../../../../../lib/utils/pending-changes-helper";
import { pendingChangesEvents } from "../../../../../lib/events/pending-changes-events";
import { Loader2 } from "lucide-react";

export default function TextSourcePage() {
  const params = useParams();
  const ragId = params.id as string;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calcola le statistiche
  const hasContent = content.trim().length > 0;
  const totalWords = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const estimatedTokens = Math.ceil(totalWords * 1.33);

  const handleSave = async () => {
    if (!hasContent) return;
    
    setSaving(true);
    setSaveSuccess(false);

    try {
      const result = await addToPendingChangesWithChunking(ragId, [
        {
          type: 'text',
          title: title || 'Untitled Text',
          preview: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
          content: {
            title,
            text: content,
          },
          metadata: {
            wordCount: totalWords,
            tokens: estimatedTokens,
          },
        },
      ]);

      if (result.success) {
        setSaveSuccess(true);
        // Notifica il componente PendingChanges
        pendingChangesEvents.emit();
        // Clear form dopo 1 secondo
        setTimeout(() => {
          setTitle('');
          setContent('');
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
                  <span>Send to training</span>
                )}
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
                  <span>Send to training</span>
                )}
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
      <PendingChanges alwaysVisible={true} />
    </div>
  );
}

