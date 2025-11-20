"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, ChevronRight, X } from "lucide-react";

interface SearchCard {
  query: string;
  results: {
    title: string;
    preview: string;
    similarity: number;
    source: string;
    fullContent: string;
  }[];
}

const searchExamples: SearchCard[] = [
  {
    query: "How to implement user authentication?",
    results: [
      {
        title: "Authentication Guide",
        preview: "User authentication is the process of verifying the identity of users accessing your application...",
        similarity: 94.2,
        source: "docs",
        fullContent: "User authentication is the process of verifying the identity of users accessing your application. This comprehensive guide covers various authentication methods including session-based authentication, token-based authentication, and OAuth 2.0.\n\nSession-based authentication stores user session data on the server, while token-based authentication uses JWT (JSON Web Tokens) for stateless authentication. Each approach has its own advantages and use cases.\n\nFor modern web applications, JWT tokens are often preferred because they enable horizontal scaling and work well with microservices architectures. The token contains encoded user information and is signed using a secret key to prevent tampering.\n\nImplementing authentication requires careful consideration of security best practices, including proper password hashing, secure session management, and protection against common vulnerabilities like CSRF and XSS attacks."
      },
      {
        title: "Security Best Practices",
        preview: "Always use secure password hashing algorithms like bcrypt or Argon2 for storing user credentials...",
        similarity: 89.7,
        source: "website",
        fullContent: "Security best practices are essential for protecting your application and user data. Always use secure password hashing algorithms like bcrypt or Argon2 for storing user credentials. Never store passwords in plain text.\n\nImplement rate limiting to prevent brute force attacks. Use HTTPS for all communications to prevent man-in-the-middle attacks. Implement proper CORS policies and validate all user input to prevent injection attacks.\n\nRegularly update dependencies and monitor for security vulnerabilities. Use environment variables for sensitive configuration and never commit secrets to version control."
      },
      {
        title: "JWT Token Implementation",
        preview: "JSON Web Tokens provide a stateless way to handle user sessions and authentication...",
        similarity: 87.3,
        source: "text",
        fullContent: "JSON Web Tokens (JWT) provide a stateless way to handle user sessions and authentication. A JWT consists of three parts: header, payload, and signature. The header contains metadata about the token, the payload contains claims (user information), and the signature ensures token integrity.\n\nWhen a user logs in, the server generates a JWT and sends it to the client. The client includes this token in subsequent requests, typically in the Authorization header. The server verifies the token signature to ensure it hasn't been tampered with."
      }
    ]
  },
  {
    query: "¿Cómo optimizar el rendimiento de la base de datos?",
    results: [
      {
        title: "Database Optimization Techniques",
        preview: "Optimizing database performance involves indexing strategies, query optimization, and connection pooling...",
        similarity: 92.8,
        source: "docs",
        fullContent: "Optimizing database performance involves indexing strategies, query optimization, and connection pooling. Proper indexing is crucial for fast query execution. Create indexes on columns that are frequently used in WHERE clauses, JOIN conditions, and ORDER BY statements.\n\nQuery optimization includes analyzing execution plans, avoiding N+1 queries, and using appropriate JOIN types. Connection pooling reduces the overhead of creating new database connections for each request.\n\nFor PostgreSQL specifically, tune configuration parameters like shared_buffers, work_mem, and effective_cache_size based on your hardware and workload. Regular VACUUM and ANALYZE operations maintain database health and query planner statistics."
      },
      {
        title: "PostgreSQL Performance Tuning",
        preview: "Configure proper indexes on frequently queried columns to dramatically improve query response times...",
        similarity: 88.5,
        source: "website",
        fullContent: "Configure proper indexes on frequently queried columns to dramatically improve query response times. PostgreSQL offers various index types including B-tree, Hash, GiST, and GIN indexes.\n\nB-tree indexes are the default and work well for most use cases. Use GIN indexes for full-text search and array operations. Monitor slow queries using pg_stat_statements extension."
      },
      {
        title: "Vector Database Best Practices",
        preview: "When working with pgvector, ensure your embeddings are properly indexed using IVFFlat or HNSW...",
        similarity: 85.1,
        source: "notion",
        fullContent: "When working with pgvector, ensure your embeddings are properly indexed using IVFFlat or HNSW algorithms. IVFFlat is faster for insertions while HNSW provides better query performance.\n\nChoose appropriate distance metrics (L2, inner product, or cosine) based on your embedding model. Consider dimensionality reduction techniques if working with high-dimensional vectors."
      }
    ]
  },
  {
    query: "Comment gérer les erreurs dans une API REST?",
    results: [
      {
        title: "API Error Handling",
        preview: "Implement consistent error handling across your REST API using proper HTTP status codes and error messages...",
        similarity: 95.3,
        source: "docs",
        fullContent: "Implement consistent error handling across your REST API using proper HTTP status codes and error messages. Use 4xx codes for client errors (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found) and 5xx codes for server errors (500 Internal Server Error, 503 Service Unavailable).\n\nProvide detailed error messages that help developers understand what went wrong without exposing sensitive system information. Include error codes for programmatic handling and human-readable messages for debugging.\n\nImplement global error handlers to catch unhandled exceptions and return consistent error responses. Log errors with appropriate severity levels and include request context for debugging."
      },
      {
        title: "Error Response Format",
        preview: "Use a standardized error response format with error codes, messages, and optional debugging information...",
        similarity: 91.2,
        source: "text",
        fullContent: "Use a standardized error response format with error codes, messages, and optional debugging information. A typical error response includes: error code (string), error message (human-readable), timestamp, request ID for tracking, and optional details array for field-specific errors.\n\nConsistency is key - use the same error format across all endpoints. Consider RFC 7807 (Problem Details) for a standardized approach."
      },
      {
        title: "Logging and Monitoring",
        preview: "Track API errors using monitoring tools like Sentry or DataDog to identify patterns and issues...",
        similarity: 86.9,
        source: "qa",
        fullContent: "Track API errors using monitoring tools like Sentry or DataDog to identify patterns and issues. Set up alerts for error rate spikes and track error trends over time. Include contextual information like user ID, request parameters, and stack traces in your logs."
      }
    ]
  },
  {
    query: "Best practices for API rate limiting",
    results: [
      {
        title: "Rate Limiting Strategies",
        preview: "Implement rate limiting to protect your API from abuse using token bucket or sliding window algorithms...",
        similarity: 96.1,
        source: "docs",
        fullContent: "Implement rate limiting to protect your API from abuse using token bucket or sliding window algorithms. The token bucket algorithm allows burst traffic while maintaining an average rate, while sliding window provides more consistent rate limiting.\n\nDefine rate limits based on user tiers (free, paid, enterprise) and endpoint sensitivity. Critical operations should have stricter limits. Return 429 Too Many Requests status code with Retry-After header to indicate when the client can retry.\n\nImplement rate limiting at multiple layers: application level, API gateway, and infrastructure level for comprehensive protection. Consider using Redis for distributed rate limiting in multi-server deployments."
      },
      {
        title: "Redis for Rate Limiting",
        preview: "Use Redis to track request counts and implement distributed rate limiting across multiple servers...",
        similarity: 91.8,
        source: "website",
        fullContent: "Use Redis to track request counts and implement distributed rate limiting across multiple servers. Redis provides fast, atomic operations perfect for rate limiting. Use INCR with EXPIRE for simple counter-based limiting, or sorted sets for sliding window implementations.\n\nRedis clustering ensures rate limits work correctly across distributed systems. Implement circuit breakers to handle Redis failures gracefully."
      },
      {
        title: "User-Friendly Error Messages",
        preview: "When rate limits are exceeded, provide clear error messages with retry-after headers...",
        similarity: 88.4,
        source: "qa",
        fullContent: "When rate limits are exceeded, provide clear error messages with retry-after headers. Include information about the current limit, how many requests were used, and when the limit resets. This helps developers adjust their integration without frustration."
      }
    ]
  }
];

const getSourceColor = (source: string) => {
  switch (source) {
    case "docs": return "bg-blue-100 text-blue-700 border-blue-200";
    case "website": return "bg-green-100 text-green-700 border-green-200";
    case "text": return "bg-gray-100 text-gray-700 border-gray-200";
    case "qa": return "bg-purple-100 text-purple-700 border-purple-200";
    case "notion": return "bg-orange-100 text-orange-700 border-orange-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function SearchCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarWidth] = useState(420);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const runAnimation = async () => {
      // Reset state
      setIsAnimating(true);
      setSelectedResultIndex(null);
      setShowSidebar(false);

      // Wait for fade out
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Change to next example
      setCurrentIndex((prev) => (prev + 1) % searchExamples.length);
      setIsAnimating(false);

      // Wait to show results (2.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Select first result
      setSelectedResultIndex(0);
      
      // Wait a bit then show sidebar
      await new Promise(resolve => setTimeout(resolve, 300));
      setShowSidebar(true);

      // Wait with sidebar visible (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Start next cycle
      timeoutId = setTimeout(runAnimation, 500);
    };

    timeoutId = setTimeout(runAnimation, 4000);

    return () => clearTimeout(timeoutId);
  }, []);

  const currentCard = searchExamples[currentIndex];
  const selectedResult = selectedResultIndex !== null ? currentCard.results[selectedResultIndex] : null;

  return (
    <div className="relative overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex relative" style={{ height: '580px' }}>
        {/* Main Content */}
        <div 
          className={`transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          style={{ 
            width: showSidebar ? `calc(100% - ${sidebarWidth}px - 8px)` : '100%',
            paddingRight: showSidebar ? '8px' : '0px'
          }}
        >
          {/* Search Bar */}
          <div className="mb-6 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <div className="pl-12 pr-4 py-3.5 bg-white border-2 border-gray-300 rounded-xl shadow-sm">
              <p className="text-sm text-gray-900 font-medium">{currentCard.query}</p>
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-900">{currentCard.results.length}</span> relevant results found
              </p>
              <div className="flex gap-1.5">
                {searchExamples.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentIndex 
                        ? 'w-6 bg-gray-900' 
                        : 'w-1.5 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {currentCard.results.map((result, idx) => (
              <div
                key={idx}
                className={`bg-white border rounded-lg p-4 transition-all cursor-pointer group ${
                  selectedResultIndex === idx
                    ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
                    : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                }`}
                style={{
                  animationDelay: `${idx * 100}ms`
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{result.title}</h4>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSourceColor(result.source)}`}>
                      {result.source}
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      {result.similarity.toFixed(1)}%
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-colors ${
                      selectedResultIndex === idx ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                  {result.preview}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Sidebar */}
        {selectedResult && (
          <div
            className={`absolute right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl flex flex-col transition-all duration-500 ${
              showSidebar ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Sidebar Header */}
            <div className="border-b border-gray-200 px-4 py-3 flex items-start justify-between bg-gray-50">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {selectedResult.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSourceColor(selectedResult.source)}`}>
                    {selectedResult.source}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedResult.similarity.toFixed(1)}% match
                  </span>
                </div>
              </div>
              <button className="ml-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 font-medium mb-1">
                    Full Source Content
                  </p>
                  <p className="text-xs text-blue-700">
                    This is the complete content from the matched source. The AI uses this context to generate accurate responses.
                  </p>
                </div>

                {/* Full Content */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                    Content
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      <mark className="bg-yellow-100 px-1">
                        {selectedResult.preview}
                      </mark>
                      {selectedResult.fullContent.replace(selectedResult.preview, '')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden" style={{ minHeight: '500px' }}>
        <div className={`transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Search Bar */}
          <div className="mb-4 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <div className="pl-10 pr-3 py-2.5 bg-white border-2 border-gray-300 rounded-lg shadow-sm">
              <p className="text-xs text-gray-900 font-medium leading-snug">{currentCard.query}</p>
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-900">{currentCard.results.length}</span> results
              </p>
              <div className="flex gap-1">
                {searchExamples.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === currentIndex 
                        ? 'w-4 bg-gray-900' 
                        : 'w-1 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {currentCard.results.map((result, idx) => (
              <div
                key={idx}
                className={`bg-white border rounded-lg p-3 transition-all ${
                  selectedResultIndex === idx
                    ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h4 className="text-xs font-semibold text-gray-900 flex-1 pr-2">{result.title}</h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getSourceColor(result.source)}`}>
                      {result.source}
                    </span>
                    <span className="text-[10px] font-medium text-green-600">
                      {result.similarity.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
                  {result.preview}
                </p>
              </div>
            ))}
          </div>

          {/* Mobile Expanded Content */}
          {selectedResult && showSidebar && (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-200 px-3 py-2.5 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-gray-900 mb-1">
                      {selectedResult.title}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getSourceColor(selectedResult.source)}`}>
                        {selectedResult.source}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {selectedResult.similarity.toFixed(1)}% match
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-3 py-3 max-h-64 overflow-y-auto">
                <div className="space-y-3">
                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-[10px] text-blue-800 font-medium mb-1">
                      Full Source Content
                    </p>
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                      This is the complete content from the matched source. The AI uses this context to generate accurate responses.
                    </p>
                  </div>

                  {/* Full Content */}
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-900 mb-1.5 uppercase tracking-wide">
                      Content
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                        <mark className="bg-yellow-100 px-1">
                          {selectedResult.preview}
                        </mark>
                        {selectedResult.fullContent.replace(selectedResult.preview, '')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

