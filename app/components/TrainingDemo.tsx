"use client";

import { useState, useEffect } from "react";
import { Zap, FileText, Globe, FileStack, Loader2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

interface PendingItem {
  id: string;
  type: string;
  title: string;
  preview: string;
}

const demoItems: PendingItem[] = [
  {
    id: "1",
    type: "website",
    title: "Product Documentation",
    preview: "https://docs.example.com/getting-started"
  },
  {
    id: "2",
    type: "docs",
    title: "API_Reference_v2.pdf",
    preview: "Technical documentation for REST API endpoints"
  },
  {
    id: "3",
    type: "text",
    title: "Company FAQ",
    preview: "Frequently asked questions about our services and pricing..."
  }
];

const getIcon = (type: string) => {
  switch (type) {
    case "text": return <FileText className="w-3.5 h-3.5" />;
    case "website": return <Globe className="w-3.5 h-3.5" />;
    case "docs": return <FileStack className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
};

type TrainingState = "idle" | "processing" | "complete";

export default function TrainingDemo() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [trainingState, setTrainingState] = useState<TrainingState>("idle");
  const [currentItem, setCurrentItem] = useState(0);
  const [processedChunks, setProcessedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [items, setItems] = useState<PendingItem[]>(demoItems);

  // Auto-replay demo
  useEffect(() => {
    const interval = setInterval(() => {
      if (trainingState === "idle") {
        // Start training after 2 seconds of idle
        setTimeout(() => startTraining(), 2000);
      }
    }, 12000); // Full cycle: 12s

    return () => clearInterval(interval);
  }, [trainingState]);

  const startTraining = async () => {
    setIsExpanded(true);
    setTrainingState("processing");
    setCurrentItem(0);
    setProcessedChunks(0);
    setTotalChunks(45);

    // Simulate processing items
    for (let i = 0; i < items.length; i++) {
      setCurrentItem(i + 1);
      
      // Simulate chunk processing
      const chunksForThisItem = [15, 18, 12][i];
      for (let c = 0; c < chunksForThisItem; c++) {
        await new Promise(resolve => setTimeout(resolve, 80));
        setProcessedChunks(prev => prev + 1);
      }
    }

    // Complete
    setTrainingState("complete");
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Reset
    setItems(demoItems);
    setTrainingState("idle");
    setProcessedChunks(0);
    setTotalChunks(0);
    setCurrentItem(0);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {!isExpanded ? (
        // Collapsed Badge
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-900 text-white rounded-full px-4 py-2.5 shadow-lg transition-all flex items-center gap-2 border border-gray-800 hover:bg-gray-800 mx-auto"
        >
          <Zap className="w-5 h-5" />
          <span className="text-sm font-medium">{items.length}</span>
        </button>
      ) : (
        // Expanded Panel
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Pending Changes
                  </h3>
                  <p className="text-xs text-gray-300">
                    {items.length} item{items.length !== 1 ? 's' : ''} not indexed yet
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
          <div className="p-4">
            {/* Items List */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`border rounded-md p-3 transition-all ${
                    trainingState === "processing" && idx < currentItem
                      ? "bg-green-50 border-green-200 opacity-60"
                      : trainingState === "processing" && idx === currentItem
                      ? "bg-blue-50 border-blue-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-gray-600 mt-0.5">
                      {trainingState === "processing" && idx < currentItem ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : trainingState === "processing" && idx === currentItem ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        getIcon(item.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {item.preview}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="bg-gray-100 border border-gray-300 rounded-md p-3 mb-3">
              <p className="text-xs text-gray-700">
                <strong>What happens next?</strong> When you run training, we'll generate embeddings for all pending items and save them to your vector database.
              </p>
            </div>

            {/* Run Training Button */}
            <button
              onClick={trainingState === "idle" ? startTraining : undefined}
              disabled={trainingState === "processing"}
              className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-md font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {trainingState === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : trainingState === "complete" ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Training Complete!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Run Training</span>
                </>
              )}
            </button>

            {/* Progress */}
            {trainingState === "processing" && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(processedChunks / totalChunks) * 100}%` 
                    }}
                  ></div>
                </div>
                
                <div className="p-3 rounded border bg-gray-50 border-gray-200">
                  <p className="text-xs text-gray-700 font-medium mb-1">
                    Processing item {currentItem} of {items.length}
                  </p>
                  <p className="text-xs text-gray-600">
                    {currentItem > 0 && items[currentItem - 1] 
                      ? `Processing: ${items[currentItem - 1].title}`
                      : 'Initializing...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Chunks: {processedChunks} / {totalChunks}
                  </p>
                </div>
              </div>
            )}

            {trainingState === "complete" && (
              <div className="mt-3 p-3 rounded border bg-green-50 border-green-300">
                <p className="text-xs text-green-800 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Training completed successfully!
                </p>
                <p className="text-xs text-green-700 mt-1">
                  All {items.length} items have been indexed and are ready for semantic search.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

