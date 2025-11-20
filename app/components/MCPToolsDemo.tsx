"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, Code, ArrowRight, Zap, Database, Terminal, CheckCircle2 } from "lucide-react";

type Step = 'idle' | 'rag-search' | 'rag-results' | 'keyword-search' | 'keyword-results' | 'complete';

interface ToolCall {
  name: string;
  description: string;
  query: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  results?: any[];
}

const toolCalls: ToolCall[] = [
  {
    name: 'search_docs_rag',
    description: 'Semantic search using vector embeddings (RAG)',
    query: 'How to configure database connection pooling?',
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    results: [
      { title: 'Database Configuration Guide', similarity: 94.5, source: 'docs' },
      { title: 'Connection Pooling Best Practices', similarity: 91.2, source: 'website' },
      { title: 'PostgreSQL Setup Tutorial', similarity: 88.7, source: 'docs' },
    ]
  },
  {
    name: 'search_docs_keyword',
    description: 'Advanced keyword search with context window',
    query: 'connection pooling configuration',
    icon: Search,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    results: [
      { match: 'connection pooling configuration', context: '...configure connection pooling for optimal performance...', rank: 0.95 },
      { match: 'pool size configuration', context: '...set the pool size based on your application needs...', rank: 0.92 },
    ]
  }
];

export default function MCPToolsDemo() {
  const [step, setStep] = useState<Step>('idle');
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      // Start animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('rag-search');
      setCurrentToolIndex(0);
      setPulseAnimation(true);

      // Show RAG search in progress
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowResults(true);
      setStep('rag-results');

      // Show RAG results
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowResults(false);
      setStep('keyword-search');
      setCurrentToolIndex(1);
      setPulseAnimation(true);

      // Show keyword search in progress
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowResults(true);
      setStep('keyword-results');

      // Show keyword results
      await new Promise(resolve => setTimeout(resolve, 3000));
      setStep('complete');
      setPulseAnimation(false);

      // Reset after showing complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep('idle');
      setShowResults(false);
      setCurrentToolIndex(0);
    };

    const interval = setInterval(sequence, 12000);
    sequence(); // Run immediately

    return () => clearInterval(interval);
  }, []);

  const currentTool = toolCalls[currentToolIndex];
  const ToolIcon = currentTool?.icon || Search;

  return (
    <div className="relative w-full" style={{ minHeight: '600px' }}>
      {/* Main Demo Container */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-200 p-8 shadow-xl" style={{ minHeight: '600px' }}>
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-900 text-white rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
            <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>MCP Server Tools</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 px-2">
            Access powerful RAG tools via MCP
          </h3>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
            Your AI agents can access semantic search and keyword search tools through the Model Context Protocol
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {toolCalls.map((tool, index) => {
            const ToolIconComponent = tool.icon;
            const isActive = step !== 'idle' && currentToolIndex === index;
            const isCompleted = 
              step === 'complete' || 
              (index === 0 && step === 'keyword-search');
            const shouldShowQuery = isActive;
            const shouldShowResults = isActive && showResults && tool.results;

            return (
              <div
                key={tool.name}
                className={`relative border-2 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 transition-colors duration-500 h-[400px] sm:h-[450px] md:h-[500px] flex flex-col overflow-hidden ${
                  isActive
                    ? `${tool.borderColor} ${tool.bgColor} shadow-lg`
                    : 'border-gray-200 bg-white'
                } ${isCompleted ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-60'}`}
              >
                {/* Tool Header */}
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white shadow-md' : 'bg-gray-100'
                    }`}>
                      <ToolIconComponent className={`w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 ${isActive ? tool.color : 'text-gray-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <code className="text-xs sm:text-sm font-bold text-gray-900 font-mono break-all">{tool.name}</code>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">{tool.description}</p>
                    </div>
                  </div>
                  {isCompleted && (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 shrink-0 ml-2" />
                  )}
                </div>

                {/* Query Display - sempre presente ma invisibile quando non attivo */}
                <div className={`${tool.bgColor} rounded-lg p-4 mb-4 border ${tool.borderColor} transition-opacity duration-300 ${
                  shouldShowQuery ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`} style={{ minHeight: '60px', visibility: shouldShowQuery ? 'visible' : 'hidden' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Code className={`w-4 h-4 ${tool.color}`} />
                    <span className="text-xs font-semibold text-gray-700 uppercase">Query</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{tool.query}</p>
                </div>

                {/* Results Preview - sempre presente ma invisibile quando non attivo */}
                <div className={`space-y-2 transition-opacity duration-500 flex-1 ${
                  shouldShowResults ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`} style={{ minHeight: '150px', visibility: shouldShowResults ? 'visible' : 'hidden' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                    <Zap className="w-3 h-3" />
                    <span>Results</span>
                  </div>
                  {tool.results && tool.results.slice(0, 2).map((result, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 text-xs">
                      {result.title && (
                        <>
                          <div className="font-semibold text-gray-900 mb-1">{result.title}</div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {result.similarity}% match
                            </span>
                            <span className="text-gray-500">{result.source}</span>
                          </div>
                        </>
                      )}
                      {result.match && (
                        <>
                          <div className="font-semibold text-gray-900 mb-1">
                            <mark className="bg-yellow-100 px-1">{result.match}</mark>
                          </div>
                          <div className="text-gray-600 mt-1 line-clamp-2">{result.context}</div>
                          <div className="text-gray-500 mt-1">Rank: {(result.rank * 100).toFixed(0)}%</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flow Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 px-2">
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-500 ${
            step === 'rag-search' || step === 'rag-results' || step === 'complete'
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
          }`}>
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-semibold">Step 1: RAG</span>
          </div>
          <ArrowRight className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-500 shrink-0 ${
            step === 'keyword-search' || step === 'keyword-results' || step === 'complete'
              ? 'text-gray-900'
              : 'text-gray-300'
          }`} />
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-500 ${
            step === 'keyword-search' || step === 'keyword-results' || step === 'complete'
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
          }`}>
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-semibold">Step 2: Keyword</span>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 text-white">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base sm:text-lg mb-1.5 sm:mb-2">Access via MCP Protocol</h4>
              <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">
                Connect your AI agents to your RAG knowledge base through the Model Context Protocol. 
                Use <code className="bg-white/20 px-1.5 sm:px-2 py-0.5 rounded font-mono text-[10px] sm:text-xs">search_docs_rag</code> for semantic search 
                and <code className="bg-white/20 px-1.5 sm:px-2 py-0.5 rounded font-mono text-[10px] sm:text-xs">search_docs_keyword</code> for precise keyword matching.
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/10 rounded-lg text-[10px] sm:text-xs font-medium border border-white/20">
                  Semantic Search
                </span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/10 rounded-lg text-[10px] sm:text-xs font-medium border border-white/20">
                  Keyword Search
                </span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/10 rounded-lg text-[10px] sm:text-xs font-medium border border-white/20">
                  Context Window
                </span>
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/10 rounded-lg text-[10px] sm:text-xs font-medium border border-white/20">
                  Vector Embeddings
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

