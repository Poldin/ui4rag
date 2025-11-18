"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Eye,
  EyeOff,
  X,
  Terminal,
  Settings
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";

interface ApiKey {
  id: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  scopes: string[];
}

export default function MCPPage() {
  const params = useParams();
  const ragId = params.id as string;

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [ragName, setRagName] = useState("");
  const [isConfigComplete, setIsConfigComplete] = useState(false);
  
  // Generate key modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [generating, setGenerating] = useState(false);
  
  // Success modal (mostra la key generata)
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [showKey, setShowKey] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'typescript' | 'python' | 'curl' | 'claude'>('typescript');
  const [activeModalTab, setActiveModalTab] = useState<'claude' | 'typescript' | 'curl'>('claude');

  // Load RAG info and keys
  useEffect(() => {
    loadData();
  }, [ragId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carica info RAG
      const { data: ragData, error: ragError } = await supabase
        .from("rags")
        .select("name, config")
        .eq("id", ragId)
        .eq("user_id", user.id)
        .single();

      if (ragError) throw ragError;
      
      setRagName(ragData.name);
      
      // Verifica config completa
      const config = ragData.config as any;
      setIsConfigComplete(
        !!config?.connectionString && 
        !!config?.apiKey && 
        !!config?.sourcesTableName && 
        !!config?.chunksTableName
      );

      // Carica API keys
      const response = await fetch(`/api/mcp/keys/list?ragId=${ragId}`);
      const data = await response.json();
      
      if (data.success) {
        setKeys(data.keys);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/mcp/keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ragId,
          name: keyName.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedKey(data.apiKey);
        setShowGenerateModal(false);
        setShowKeyModal(true);
        setKeyName("");
        await loadData();
      } else {
        alert(data.error || "Failed to generate API key");
      }
    } catch (error) {
      console.error("Error generating key:", error);
      alert("Failed to generate API key");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/mcp/keys/revoke", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });

      const data = await response.json();

      if (data.success) {
        await loadData();
      } else {
        alert(data.error || "Failed to revoke API key");
      }
    } catch (error) {
      console.error("Error revoking key:", error);
      alert("Failed to revoke API key");
    }
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyConfig = async () => {
    const config = {
      mcpServers: {
        "gimme-rag": {
          url: `${window.location.origin}/api/mcp`,
          headers: {
            Authorization: `Bearer ${generatedKey}`
          }
        }
      }
    };
    
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const generateMarkdownDocs = () => {
    return `# MCP Server API Documentation

## Connection

- **Endpoint:** \`${window.location.origin}/api/mcp\`
- **Method:** \`POST\`
- **Content-Type:** \`application/json\`
- **Authorization:** \`Bearer YOUR_API_KEY\`

---

## Available Tools

### 1. search_docs_rag

**Description:** Performs semantic search across your knowledge base using vector embeddings (RAG). Returns the most relevant document chunks ranked by similarity score. **Use this first to identify relevant documents.**

**Parameters:**
- \`query\` (string, required) - The search query text
- \`limit\` (number, optional, default: 5) - Maximum number of results to return

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_docs_rag",
    "arguments": {
      "query": "database configuration",
      "limit": 5
    }
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "query": "database configuration",
  "count": 3,
  "results": [
    {
      "sourceId": "uuid",
      "sourceTitle": "Setup Guide",
      "sourceType": "docs",
      "content": "To configure the database...",
      "similarity": 94.5,
      "chunkIndex": 0,
      "chunkTotal": 10,
      "metadata": {...}
    }
  ]
}
\`\`\`

---

### 2. search_docs_keyword

**Description:** Advanced keyword search with configurable context window. Searches for exact keywords or phrases in documents using PostgreSQL Full-Text Search. **Use this after RAG search to explore specific documents in detail.**

**Parameters:**
- \`keywords\` (string, required) - Keywords or phrase to search for
- \`sourceId\` (string, optional) - Limit search to specific document
- \`contextLines\` (number, optional, default: 10) - Number of lines of context around each match
- \`limit\` (number, optional, default: 20) - Maximum number of matches to return

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_docs_keyword",
    "arguments": {
      "keywords": "API endpoint configuration",
      "sourceId": "uuid-from-rag-search",
      "contextLines": 15,
      "limit": 20
    }
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "query": "API endpoint configuration",
  "count": 12,
  "matches": [
    {
      "sourceId": "uuid",
      "sourceTitle": "Setup Guide",
      "matchPosition": 245,
      "matchLine": 12,
      "context": "...full context with highlighted match...",
      "beforeContext": "Previous lines...",
      "matchText": "API endpoint configuration",
      "afterContext": "Following lines...",
      "rank": 0.95
    }
  ]
}
\`\`\`

---

### 3. get_document

**Description:** Retrieves a complete document by its source ID, including all chunks and metadata. Useful for getting full context after finding relevant chunks via search.

**Parameters:**
- \`sourceId\` (string, required) - UUID of the source document

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_document",
    "arguments": {
      "sourceId": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "source": {
    "id": "uuid",
    "title": "Setup Guide",
    "sourceType": "docs",
    "content": "Full document content...",
    "metadata": {...},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "chunks": [
    {
      "id": "uuid",
      "content": "Chunk content...",
      "chunkIndex": 0,
      "chunkTotal": 10,
      "metadata": {...}
    }
  ]
}
\`\`\`

---

### 4. list_sources

**Description:** Lists all available source documents in the knowledge base with pagination support. Useful for browsing available content and discovering document IDs.

**Parameters:**
- \`limit\` (number, optional, default: 50) - Maximum number of sources to return
- \`offset\` (number, optional, default: 0) - Number of sources to skip for pagination

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "list_sources",
    "arguments": {
      "limit": 50,
      "offset": 0
    }
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "count": 42,
  "sources": [
    {
      "id": "uuid",
      "title": "Setup Guide",
      "sourceType": "docs",
      "metadata": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "title": "API Reference",
      "sourceType": "docs",
      "metadata": {...},
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ]
}
\`\`\`

---

### 5. get_stats

**Description:** Returns statistics about the knowledge base including total sources, chunks, and embedding status. Useful for monitoring and understanding the knowledge base size.

**Parameters:**
- No parameters required

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_stats",
    "arguments": {}
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "totalSources": 42,
  "totalChunks": 538,
  "chunksWithEmbeddings": 538,
  "chunksWithoutEmbeddings": 0
}
\`\`\`

---

## Usage Notes

1. Replace \`YOUR_API_KEY\` with your actual API key from the dashboard
2. All requests use JSON-RPC 2.0 protocol
3. The \`id\` field in requests can be any unique identifier
4. All responses follow the JSON-RPC 2.0 response format
`;
  };

  const handleCopyMarkdown = async () => {
    const markdown = generateMarkdownDocs();
    await navigator.clipboard.writeText(markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">MCP Server</h1>
            {isConfigComplete ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700">Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700">Config needed</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={!isConfigComplete}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            <Plus className="w-4 h-4" />
            Generate API Key
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-4xl space-y-6">
          {/* Warning if config incomplete */}
          {!isConfigComplete && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-900">Configuration Required</h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    Before generating API keys, please complete your RAG configuration in the{" "}
                    <a href={`/app/${ragId}/config`} className="underline font-medium">
                      Config page
                    </a>
                    . You need to set up your database connection and OpenAI API key.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900">What is MCP?</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Model Context Protocol (MCP) allows AI agents, applications, and web portals to access your RAG knowledge base programmatically. 
                  Generate an API key below and integrate it anywhere - from Claude Desktop to your custom web app, Python scripts, or any HTTP client.
                </p>
                <div className="mt-3 space-y-1 text-xs text-blue-700">
                  <p><strong>Available tools:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded">search_docs_rag</code> - Semantic search with embeddings (Step 1)</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded">search_docs_keyword</code> - Advanced keyword search with context (Step 2)</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded">get_document</code> - Retrieve full document by ID</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded">list_sources</code> - List all available sources</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded">get_stats</code> - Get knowledge base statistics</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* API Keys List */}
          <div>
            <h2 className="text-base font-medium text-gray-900 mb-3">API Keys</h2>
            
            {keys.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <Key className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No API keys yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Generate your first API key to connect AI agents, web apps, or any client
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {key.name || "Unnamed key"}
                          </span>
                          {key.is_active ? (
                            <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded">
                              Revoked
                            </span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          <p>Created: {formatDate(key.created_at)}</p>
                          {key.last_used_at && (
                            <p>Last used: {formatDate(key.last_used_at)}</p>
                          )}
                          <p>Scopes: {Array.isArray(key.scopes) ? key.scopes.join(", ") : "read"}</p>
                        </div>
                      </div>
                      {key.is_active && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API Documentation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">API Documentation</h2>
              <div className="flex items-center gap-3">
                <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs text-gray-700">POST {window.location.origin}/api/mcp</code>
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md hover:bg-gray-800 transition-colors font-medium"
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Connection Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Connection</h3>
              <div className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <span className="text-gray-700 font-medium min-w-24">Endpoint:</span>
                  <code className="bg-white px-2 py-0.5 rounded border border-gray-300 font-mono text-gray-700">{window.location.origin}/api/mcp</code>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-700 font-medium min-w-24">Method:</span>
                  <code className="bg-white px-2 py-0.5 rounded border border-gray-300 text-gray-700">POST</code>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-700 font-medium min-w-24">Content-Type:</span>
                  <code className="bg-white px-2 py-0.5 rounded border border-gray-300 text-gray-700">application/json</code>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-700 font-medium min-w-24">Authorization:</span>
                  <code className="bg-white px-2 py-0.5 rounded border border-gray-300 text-gray-700">Bearer YOUR_API_KEY</code>
                </div>
              </div>
            </div>

            {/* Tools Documentation */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Available Tools</h3>

              {/* Tool 1: search_docs_rag */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-semibold text-gray-900">search_docs_rag</code>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">Step 1</span>
                    </div>
                    <span className="text-xs text-gray-600">RAG / Semantic Search</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-700">
                    Performs semantic search using vector embeddings (RAG). Returns the most relevant document chunks ranked by similarity score. <strong>Use this first to identify relevant documents.</strong>
                  </p>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Parameters:</p>
                    <div className="bg-gray-50 rounded-md p-3 space-y-2 text-xs">
                      <div>
                        <code className="text-gray-900 font-medium">query</code>
                        <span className="text-gray-600"> (string, required)</span>
                        <p className="text-gray-600 mt-0.5">The search query text</p>
                      </div>
                      <div>
                        <code className="text-gray-900 font-medium">limit</code>
                        <span className="text-gray-600"> (number, optional, default: 5)</span>
                        <p className="text-gray-600 mt-0.5">Maximum number of results to return</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Request:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_docs_rag",
    "arguments": {
      "query": "database configuration",
      "limit": 5
    }
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Response:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "query": "database configuration",
  "count": 3,
  "results": [
    {
      "sourceId": "uuid",
      "sourceTitle": "Setup Guide",
      "sourceType": "docs",
      "content": "To configure the database...",
      "similarity": 94.5,
      "chunkIndex": 0,
      "chunkTotal": 10,
      "metadata": {...}
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Tool 2: search_docs_keyword */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-semibold text-gray-900">search_docs_keyword</code>
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Step 2</span>
                    </div>
                    <span className="text-xs text-gray-600">Keyword Search + Context</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-700">
                    Advanced keyword search with configurable context window using PostgreSQL Full-Text Search. <strong>Use this after RAG search to explore specific documents in detail.</strong> Returns exact keyword matches with surrounding context.
                  </p>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Parameters:</p>
                    <div className="bg-gray-50 rounded-md p-3 space-y-2 text-xs">
                      <div>
                        <code className="text-gray-900 font-medium">keywords</code>
                        <span className="text-gray-600"> (string, required)</span>
                        <p className="text-gray-600 mt-0.5">Keywords or phrase to search for</p>
                      </div>
                      <div>
                        <code className="text-gray-900 font-medium">sourceId</code>
                        <span className="text-gray-600"> (string, optional)</span>
                        <p className="text-gray-600 mt-0.5">Limit search to specific document (from RAG results)</p>
                      </div>
                      <div>
                        <code className="text-gray-900 font-medium">contextLines</code>
                        <span className="text-gray-600"> (number, optional, default: 10, min: 10)</span>
                        <p className="text-gray-600 mt-0.5">Number of lines of context around each match</p>
                      </div>
                      <div>
                        <code className="text-gray-900 font-medium">limit</code>
                        <span className="text-gray-600"> (number, optional, default: 20)</span>
                        <p className="text-gray-600 mt-0.5">Maximum number of matches to return</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Request:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_docs_keyword",
    "arguments": {
      "keywords": "API endpoint configuration",
      "sourceId": "uuid-from-rag-search",
      "contextLines": 15,
      "limit": 20
    }
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Response:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "query": "API endpoint configuration",
  "count": 12,
  "matches": [
    {
      "sourceId": "uuid",
      "sourceTitle": "Setup Guide",
      "chunkId": "uuid",
      "matchPosition": 245,
      "context": "Full context with match...",
      "beforeContext": "Lines before match...",
      "matchText": "API endpoint configuration",
      "afterContext": "Lines after match...",
      "rank": 0.95
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Tool 3: get_document */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-semibold text-gray-900">get_document</code>
                    <span className="text-xs text-gray-600">Get Full Document</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-700">
                    Retrieves a complete document by its source ID, including all chunks and metadata. Useful for getting full context after finding relevant chunks via search.
                  </p>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Parameters:</p>
                    <div className="bg-gray-50 rounded-md p-3 space-y-2 text-xs">
                      <div>
                        <code className="text-gray-900 font-medium">sourceId</code>
                        <span className="text-gray-600"> (string, required)</span>
                        <p className="text-gray-600 mt-0.5">UUID of the source document</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Request:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_document",
    "arguments": {
      "sourceId": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Response:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "source": {
    "id": "uuid",
    "title": "Setup Guide",
    "sourceType": "docs",
    "content": "Full document content...",
    "metadata": {...},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "chunks": [
    {
      "id": "uuid",
      "content": "Chunk content...",
      "chunkIndex": 0,
      "chunkTotal": 10,
      "metadata": {...}
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Tool 4: list_sources */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-semibold text-gray-900">list_sources</code>
                    <span className="text-xs text-gray-600">List All Sources</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-700">
                    Lists all available source documents in the knowledge base with pagination support. Useful for browsing available content and discovering document IDs.
                  </p>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Parameters:</p>
                    <div className="bg-gray-50 rounded-md p-3 space-y-2 text-xs">
                      <div>
                        <code className="text-gray-900 font-medium">limit</code>
                        <span className="text-gray-600"> (number, optional, default: 50)</span>
                        <p className="text-gray-600 mt-0.5">Maximum number of sources to return</p>
                      </div>
                      <div>
                        <code className="text-gray-900 font-medium">offset</code>
                        <span className="text-gray-600"> (number, optional, default: 0)</span>
                        <p className="text-gray-600 mt-0.5">Number of sources to skip for pagination</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Request:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "list_sources",
    "arguments": {
      "limit": 50,
      "offset": 0
    }
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Response:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "count": 42,
  "sources": [
    {
      "id": "uuid",
      "title": "Setup Guide",
      "sourceType": "docs",
      "metadata": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "title": "API Reference",
      "sourceType": "docs",
      "metadata": {...},
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Tool 5: get_stats */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-semibold text-gray-900">get_stats</code>
                    <span className="text-xs text-gray-600">Knowledge Base Statistics</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-700">
                    Returns statistics about the knowledge base including total sources, chunks, and embedding status. Useful for monitoring and understanding the knowledge base size.
                  </p>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Parameters:</p>
                    <div className="bg-gray-50 rounded-md p-3 text-xs">
                      <p className="text-gray-600">No parameters required</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Request:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_stats",
    "arguments": {}
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Response:</p>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto font-mono">
{`{
  "totalSources": 42,
  "totalChunks": 538,
  "chunksWithEmbeddings": 538,
  "chunksWithoutEmbeddings": 0
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Key Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Generate API Key</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Key Name (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Claude Desktop - MacBook"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <p className="text-xs text-gray-700">
                  <strong>⚠️ Important:</strong> The API key will be shown only once. Make sure to copy and save it securely.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setKeyName("");
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateKey}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Generated Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">API Key Generated</h2>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setGeneratedKey("");
                  setShowKey(false);
                  setCopied(false);
                  setCopiedConfig(false);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-900 font-medium">
                  ⚠️ Copy this key now - it will not be shown again!
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5 font-medium">
                  Your API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={generatedKey}
                    readOnly
                    className="w-full px-3 py-2 pr-24 border border-gray-300 rounded-md text-sm text-gray-700 bg-gray-50 font-mono"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={handleCopyKey}
                      className="px-2 py-1.5 bg-gray-900 hover:bg-gray-800 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span className="text-white">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-white" />
                          <span className="text-white">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Start with Tabs */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-700 font-medium">
                  Quick Start - Choose Your Platform
                </label>

                {/* Tabs */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                      onClick={() => setActiveModalTab('claude')}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        activeModalTab === 'claude'
                          ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Claude Desktop
                    </button>
                    <button
                      onClick={() => setActiveModalTab('typescript')}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        activeModalTab === 'typescript'
                          ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      JavaScript
                    </button>
                    <button
                      onClick={() => setActiveModalTab('curl')}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        activeModalTab === 'curl'
                          ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      cURL
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="bg-white">
                    {activeModalTab === 'claude' && (
                      <div>
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                          <span className="text-xs text-gray-600">Claude Desktop Configuration</span>
                          <button
                            onClick={handleCopyConfig}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors"
                          >
                            {copiedConfig ? (
                              <>
                                <Check className="w-3 h-3 text-gray-700" />
                                <span className="text-gray-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-gray-700" />
                                <span className="text-gray-700">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto font-mono">
{`{
  "mcpServers": {
    "gimme-rag": {
      "url": "${window.location.origin}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${generatedKey}"
      }
    }
  }
}`}
                        </pre>
                        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                          <p className="text-xs text-gray-600">
                            <strong>File:</strong> <code className="bg-white px-1 py-0.5 rounded border border-gray-200">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                          </p>
                        </div>
                      </div>
                    )}

                    {activeModalTab === 'typescript' && (
                      <div>
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <span className="text-xs text-gray-600">JavaScript / TypeScript Example</span>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto font-mono">
{`// Search documents
const response = await fetch('${window.location.origin}/api/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${generatedKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search_docs',
      arguments: {
        query: 'your search query',
        limit: 5
      }
    }
  })
});

const data = await response.json();
console.log(data.result);`}
                        </pre>
                      </div>
                    )}

                    {activeModalTab === 'curl' && (
                      <div>
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <span className="text-xs text-gray-600">cURL / Terminal Command</span>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto font-mono">
{`curl -X POST '${window.location.origin}/api/mcp' \\
  -H 'Authorization: Bearer ${generatedKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_docs",
      "arguments": {
        "query": "test query",
        "limit": 3
      }
    }
  }'`}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  <p className="text-xs text-blue-800">
                    💡 <strong>More examples:</strong> Scroll down to see Python, advanced usage, and all available tools
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setGeneratedKey("");
                  setShowKey(false);
                  setCopied(false);
                  setCopiedConfig(false);
                }}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

