'use client';

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, X, Copy, Upload, Check, Loader2 } from "lucide-react";
import PendingChanges from "../../../../components/PendingChanges";
import { addToPendingChanges } from "../../../../../lib/actions/pending-changes";
import { pendingChangesEvents } from "../../../../../lib/events/pending-changes-events";

interface QAPair {
  id: string;
  questions: string[];
  answer: string;
}

export default function QASourcePage() {
  const params = useParams();
  const ragId = params.id as string;
  const [qaPairs, setQaPairs] = useState<QAPair[]>([
    { id: '1', questions: [''], answer: '' }
  ]);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedStructure, setCopiedStructure] = useState(false);
  const [importError, setImportError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const addQAPair = () => {
    setQaPairs([...qaPairs, { 
      id: Date.now().toString(), 
      questions: [''], 
      answer: '' 
    }]);
  };

  const removeQAPair = (id: string) => {
    if (qaPairs.length > 1) {
      setQaPairs(qaPairs.filter(pair => pair.id !== id));
    }
  };

  const updateQuestion = (pairId: string, questionIndex: number, value: string) => {
    setQaPairs(qaPairs.map(pair => {
      if (pair.id === pairId) {
        const newQuestions = [...pair.questions];
        newQuestions[questionIndex] = value;
        return { ...pair, questions: newQuestions };
      }
      return pair;
    }));
  };

  const addQuestionVariant = (pairId: string) => {
    setQaPairs(qaPairs.map(pair => {
      if (pair.id === pairId) {
        return { ...pair, questions: [...pair.questions, ''] };
      }
      return pair;
    }));
  };

  const removeQuestionVariant = (pairId: string, questionIndex: number) => {
    setQaPairs(qaPairs.map(pair => {
      if (pair.id === pairId && pair.questions.length > 1) {
        const newQuestions = pair.questions.filter((_, i) => i !== questionIndex);
        return { ...pair, questions: newQuestions };
      }
      return pair;
    }));
  };

  const updateAnswer = (pairId: string, value: string) => {
    setQaPairs(qaPairs.map(pair => 
      pair.id === pairId ? { ...pair, answer: value } : pair
    ));
  };

  // Calcola le statistiche
  const activePairs = qaPairs.filter(pair => 
    pair.questions.some(q => q.trim()) && pair.answer.trim()
  );
  const totalWords = activePairs.reduce((sum, pair) => {
    const questionWords = pair.questions.reduce((qSum, q) => {
      return qSum + q.trim().split(/\s+/).filter(w => w.length > 0).length;
    }, 0);
    const answerWords = pair.answer.trim().split(/\s+/).filter(w => w.length > 0).length;
    return sum + questionWords + answerWords;
  }, 0);
  const estimatedTokens = Math.ceil(totalWords * 1.33);

  const handleSave = async () => {
    if (activePairs.length === 0) return;
    
    setSaving(true);
    setSaveSuccess(false);

    try {
      const items = activePairs.map(pair => {
        const allQuestions = pair.questions.filter(q => q.trim()).join(' | ');
        const wordCount = pair.questions.reduce((sum, q) => {
          return sum + q.trim().split(/\s+/).filter(w => w.length > 0).length;
        }, 0) + pair.answer.trim().split(/\s+/).filter(w => w.length > 0).length;

        return {
          type: 'qa' as const,
          title: pair.questions[0] || 'Q&A Pair',
          preview: pair.answer.slice(0, 100) + (pair.answer.length > 100 ? '...' : ''),
          content: {
            questions: pair.questions.filter(q => q.trim()),
            answer: pair.answer,
          },
          metadata: {
            wordCount,
            tokens: Math.ceil(wordCount * 1.33),
            questionVariants: pair.questions.length,
          },
        };
      });

      const result = await addToPendingChanges(ragId, items);

      if (result.success) {
        setSaveSuccess(true);
        // Notifica il componente PendingChanges
        pendingChangesEvents.emit();
        // Reset form dopo 1 secondo
        setTimeout(() => {
          setQaPairs([{ id: '1', questions: [''], answer: '' }]);
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

  const aiPrompt = `Generate a comprehensive Q&A dataset in JSON format. Each Q&A pair should have multiple question variants (different ways to ask the same thing) and a single answer.

Use this exact JSON structure:
[
  {
    "questions": ["First variant of question?", "Second variant?", "Third variant?"],
    "answer": "Complete answer to all question variants"
  }
]

Create Q&A pairs about [YOUR TOPIC HERE]. Include 3-5 question variants per answer to cover different phrasings and user intents.`;

  const jsonStructure = `[
  {
    "questions": ["Question variant 1?", "Question variant 2?", "Question variant 3?"],
    "answer": "Answer to all question variants"
  },
  {
    "questions": ["Another question?", "Same question differently?"],
    "answer": "Another answer"
  }
]`;

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const copyStructureToClipboard = () => {
    navigator.clipboard.writeText(jsonStructure);
    setCopiedStructure(true);
    setTimeout(() => setCopiedStructure(false), 2000);
  };

  const handleJsonUpload = () => {
    setImportError('');
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        const newPairs: QAPair[] = parsed.map((item, index) => ({
          id: `imported-${Date.now()}-${index}`,
          questions: Array.isArray(item.questions) ? item.questions : [item.questions || ''],
          answer: item.answer || ''
        }));
        setQaPairs(newPairs);
        setShowJsonDialog(false);
        setJsonInput('');
        setImportError('');
      } else {
        setImportError('JSON must be an array of Q&A pairs');
      }
    } catch (error) {
      setImportError('Invalid JSON format. Please check the structure.');
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Q&A Source</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-3xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Add question-answer pairs to your RAG
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyPromptToClipboard}
                className="px-3 py-1.5 bg-black text-white text-xs rounded-md hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                {copiedPrompt ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                copy prompt for AI
              </button>
              <button
                onClick={() => setShowJsonDialog(true)}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                upload JSON
              </button>
            </div>
          </div>

          {/* Send to training button - top */}
          {activePairs.length > 0 && (
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
                  <span>Send to training ({activePairs.length} {activePairs.length === 1 ? 'pair' : 'pairs'})</span>
                )}
              </button>
              <p className="text-xs text-gray-500">
                {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
              </p>
            </div>
          )}

          {/* Q&A Pairs */}
          <div className="space-y-3">
            {qaPairs.map((pair) => (
              <div key={pair.id} className="border border-gray-200 rounded-lg p-4 relative">
                {qaPairs.length > 1 && (
                  <button
                    onClick={() => removeQAPair(pair.id)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Remove entire Q&A pair"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="space-y-4">
                  {/* Questions section */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Questions (variants)
                    </label>
                    <div className="space-y-2">
                      {pair.questions.map((question, qIndex) => (
                        <div key={qIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={question}
                            onChange={(e) => updateQuestion(pair.id, qIndex, e.target.value)}
                            placeholder={`Question variant ${qIndex + 1}...`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          />
                          {pair.questions.length > 1 && (
                            <button
                              onClick={() => removeQuestionVariant(pair.id, qIndex)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Remove this question variant"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addQuestionVariant(pair.id)}
                        className="border border-dashed border-gray-300 rounded-md px-3 py-2 w-fit hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-xs">add question variant</span>
                      </button>
                    </div>
                  </div>

                  {/* Answer section */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                      rows={3}
                      value={pair.answer}
                      onChange={(e) => updateAnswer(pair.id, e.target.value)}
                      placeholder="Enter answer..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add more button */}
            <button 
              onClick={addQAPair}
              className="border border-dashed border-gray-300 rounded-lg p-3 w-fit hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">add q&a pair</span>
            </button>
          </div>

          {/* Send to training button - bottom */}
          {activePairs.length > 0 && (
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
                  <span>Send to training ({activePairs.length} {activePairs.length === 1 ? 'pair' : 'pairs'})</span>
                )}
              </button>
              <p className="text-xs text-gray-500">
                {totalWords.toLocaleString()} words • ~{estimatedTokens.toLocaleString()} tokens
              </p>
            </div>
          )}
        </div>
      </div>

      {/* JSON Upload Dialog */}
      {showJsonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl min-w-[60vw] h-[95vh] flex flex-col">
            {/* Dialog Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upload Q&A JSON</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyStructureToClipboard}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                >
                  {copiedStructure ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  copy structure
                </button>
                <button
                  onClick={() => {
                    setShowJsonDialog(false);
                    setImportError('');
                    setJsonInput('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste your JSON here
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Expected format: Array of objects with "questions" (array) and "answer" (string)
                  </p>
                  {importError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{importError}</p>
                    </div>
                  )}
                  <textarea
                    value={jsonInput}
                    onChange={(e) => {
                      setJsonInput(e.target.value);
                      setImportError('');
                    }}
                    placeholder={jsonStructure}
                    className="w-full h-[calc(95vh-280px)] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowJsonDialog(false);
                  setJsonInput('');
                  setImportError('');
                }}
                className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJsonUpload}
                disabled={!jsonInput.trim()}
                className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Import Q&A Pairs
              </button>
            </div>
          </div>
        </div>
      )}

      <PendingChanges alwaysVisible={true} />
    </div>
  );
}

