"use client";

import { useState } from "react";
import { Search, Loader2, FileText, ExternalLink } from "lucide-react";

interface SearchResult {
  id: string;
  content: string;
  title: string;
  similarity: number;
  source: string;
  sourceUrl?: string;
}

export default function TestingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock results
    const mockResults: SearchResult[] = [
      {
        id: "1",
        title: "Getting Started with RAG",
        content: "RAG (Retrieval-Augmented Generation) combines the power of large language models with external knowledge retrieval. This approach allows AI systems to access up-to-date information and provide more accurate responses based on your specific data...",
        similarity: 0.94,
        source: "documentation",
        sourceUrl: "https://example.com/docs/getting-started"
      },
      {
        id: "2",
        title: "Vector Database Configuration",
        content: "To configure your vector database, you need to set up a connection string and specify the embedding dimensions. PostgreSQL with pgvector extension is recommended for most use cases. Make sure your database has the vector extension enabled...",
        similarity: 0.87,
        source: "notion",
        sourceUrl: "https://notion.so/vector-setup"
      },
      {
        id: "3",
        title: "OpenAI Embeddings Guide",
        content: "OpenAI provides several embedding models with different dimensions and pricing. The text-embedding-3-small model offers a good balance between cost and performance with 1536 dimensions. For higher quality, consider using text-embedding-3-large...",
        similarity: 0.82,
        source: "website",
        sourceUrl: "https://example.com/embeddings-guide"
      },
      {
        id: "4",
        title: "Best Practices for RAG",
        content: "When implementing RAG, consider chunking your documents into smaller pieces (300-500 tokens), maintaining good metadata, and regularly updating your vector database. Use hybrid search combining semantic and keyword search for best results...",
        similarity: 0.78,
        source: "text"
      },
    ];

    setResults(mockResults);
    setLoading(false);
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "documentation":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "notion":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "website":
        return "bg-green-100 text-green-700 border-green-200";
      case "text":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Testing</h1>
        <p className="text-sm text-gray-600 mt-1">
          Test your RAG by searching through your indexed content
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question or search for content..."
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </form>

          {/* Results */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Searching your RAG...</p>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No results found</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Found <strong>{results.length}</strong> results
                </p>
              </div>

              {results.map((result) => (
                <div
                  key={result.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {result.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSourceBadgeColor(result.source)}`}>
                          {result.source}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(result.similarity * 100).toFixed(1)}% match
                        </span>
                      </div>
                    </div>
                    {result.sourceUrl && (
                      <a
                        href={result.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Content */}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          {!hasSearched && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                How to test your RAG
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Enter a question or search query above</li>
                <li>• Results will show matching content from your indexed sources</li>
                <li>• Similarity scores indicate how relevant each result is</li>
                <li>• Click the external link icon to view the original source</li>
              </ul>
              <p className="text-xs text-blue-700 mt-3">
                Note: This is a demo interface. In production, results come from your vector database.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





