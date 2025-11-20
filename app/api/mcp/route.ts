import { NextRequest } from 'next/server';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
  type JSONRPCMessage,
  type MessageExtraInfo,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../lib/database_types';
import * as bcrypt from 'bcryptjs';
import { RAGStorage, type RAGStorageConfig } from '../../../lib/ai-sdk/rag-storage';
import { createEmbeddingConfig } from '../../../lib/ai-sdk/embeddings';
import { randomUUID } from 'node:crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Valida l'API key e ritorna i dati del RAG associato
 */
async function validateApiKey(apiKey: string): Promise<{
  userId: string;
  ragId: string;
  ragConfig: any;
} | null> {
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  // Recupera tutte le API keys attive
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, user_id, rag_id, key_hash, last_used_at')
    .eq('is_active', true);

  if (error || !keys) {
    console.error('Error fetching API keys:', error);
    return null;
  }

  // Verifica l'hash per ogni key (più lento ma sicuro)
  let matchedKey = null;
  for (const key of keys) {
    const isValid = await bcrypt.compare(apiKey, key.key_hash);
    if (isValid) {
      matchedKey = key;
      break;
    }
  }

  if (!matchedKey) {
    return null;
  }

  // Aggiorna last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', matchedKey.id);

  // Recupera la config del RAG
  const { data: ragData, error: ragError } = await supabase
    .from('rags')
    .select('config')
    .eq('id', matchedKey.rag_id)
    .eq('user_id', matchedKey.user_id)
    .single();

  if (ragError || !ragData) {
    console.error('Error fetching RAG config:', ragError);
    return null;
  }

  return {
    userId: matchedKey.user_id,
    ragId: matchedKey.rag_id,
    ragConfig: ragData.config,
  };
}

/**
 * Custom Transport per Next.js App Router che usa ReadableStream per SSE
 */
class NextJSSSETransport implements Transport {
  sessionId: string;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  public encoder: TextEncoder;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;

  constructor() {
    this.sessionId = randomUUID();
    this.encoder = new TextEncoder();
  }

  async start(): Promise<void> {
    // No-op, stream is managed externally
  }

  async send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void> {
    if (!this.controller) {
      throw new Error('Transport not connected');
    }
    const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
    this.controller.enqueue(this.encoder.encode(data));
  }

  async close(): Promise<void> {
    if (this.controller) {
      this.controller.close();
      this.controller = null;
      this.onclose?.();
    }
  }

  async handleMessage(message: unknown, extra?: MessageExtraInfo): Promise<void> {
    this.onmessage?.(message as JSONRPCMessage, extra);
  }

  setController(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.controller = controller;
  }
}

/**
 * Crea un'istanza di RAGStorage dalla config
 */
function createRAGStorage(config: any): RAGStorage {
  const embeddingConfig = createEmbeddingConfig(
    config.apiKey,
    config.embeddingModel || 'text-embedding-3-small',
    config.embeddingDimensions || 1536
  );

  const storageConfig: RAGStorageConfig = {
    connectionString: config.connectionString,
    sourcesTableName: config.sourcesTableName || 'gimme_rag_sources',
    chunksTableName: config.chunksTableName || 'gimme_rag_chunks',
    embeddingConfig,
    ssl: true,
  };

  return new RAGStorage(storageConfig);
}

/**
 * Definizione tools riutilizzabile per SSE e HTTP transport
 */
function getToolsDefinition() {
  return [
    {
      name: 'search_docs_rag',
      description: 'Semantic search using vector embeddings (RAG). Use this FIRST to identify relevant documents. Returns most relevant chunks ranked by similarity score.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 5)',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_docs_keyword',
      description: 'Advanced keyword search with context window using PostgreSQL Full-Text Search. Use this AFTER RAG search to explore specific documents in detail. Returns exact keyword matches with surrounding context.',
      inputSchema: {
        type: 'object',
        properties: {
          keywords: {
            type: 'string',
            description: 'Keywords or phrase to search for',
          },
          sourceId: {
            type: 'string',
            description: 'Optional: Limit search to specific document (from RAG results)',
          },
          contextLines: {
            type: 'number',
            description: 'Number of lines of context around each match (default: 10, min: 10)',
            default: 10,
          },
          limit: {
            type: 'number',
            description: 'Maximum number of matches to return (default: 20)',
            default: 20,
          },
        },
        required: ['keywords'],
      },
    },
    {
      name: 'get_document',
      description: 'Get a full document by its source ID, including all chunks.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceId: {
            type: 'string',
            description: 'The UUID of the source document',
          },
        },
        required: ['sourceId'],
      },
    },
    {
      name: 'list_sources',
      description: 'List all available sources in the knowledge base with pagination.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of sources to return (default: 50)',
            default: 50,
          },
          offset: {
            type: 'number',
            description: 'Number of sources to skip (default: 0)',
            default: 0,
          },
        },
      },
    },
    {
      name: 'get_stats',
      description: 'Get statistics about the knowledge base (total sources, chunks, etc.)',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

/**
 * Esegue un tool e ritorna il risultato
 * Funzione riutilizzabile per SSE e HTTP transport
 */
async function executeTool(
  name: string,
  args: any,
  config: any
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const ragStorage = createRAGStorage(config);

  try {
    switch (name) {
      case 'search_docs_rag': {
        const { query, limit = 5 } = args as { query: string; limit?: number };
        
        if (!query) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Query parameter is required'
          );
        }

        const results = await ragStorage.search(query, limit, 0);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                count: results.length,
                results: results.map((r) => ({
                  sourceId: r.sourceId,
                  sourceTitle: r.sourceTitle,
                  sourceType: r.sourceType,
                  content: r.chunkContent,
                  similarity: r.similarity,
                  chunkIndex: r.chunkIndex,
                  chunkTotal: r.chunkTotal,
                  metadata: r.metadata,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'search_docs_keyword': {
        const { keywords, sourceId, contextLines = 10, limit = 20 } = args as {
          keywords: string;
          sourceId?: string;
          contextLines?: number;
          limit?: number;
        };
        
        if (!keywords) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Keywords parameter is required'
          );
        }

        // Enforce minimum context lines
        const adjustedContextLines = Math.max(10, contextLines);

        const results = await ragStorage.keywordSearch(keywords, {
          sourceId,
          contextLines: adjustedContextLines,
          limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query: keywords,
                sourceId: sourceId || 'all',
                contextLines: adjustedContextLines,
                count: results.length,
                matches: results.map((r) => ({
                  sourceId: r.sourceId,
                  sourceTitle: r.sourceTitle,
                  sourceType: r.sourceType,
                  chunkId: r.chunkId,
                  matchPosition: r.matchPosition,
                  context: r.context,
                  rank: r.rank,
                  chunkIndex: r.chunkIndex,
                  chunkTotal: r.chunkTotal,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'get_document': {
        const { sourceId } = args as { sourceId: string };
        
        if (!sourceId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'sourceId parameter is required'
          );
        }

        const data = await ragStorage.getSourceWithChunks(sourceId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                source: {
                  id: data.source.id,
                  title: data.source.title,
                  sourceType: data.source.source_type,
                  content: data.source.content,
                  metadata: data.source.metadata,
                  createdAt: data.source.created_at,
                  updatedAt: data.source.updated_at,
                },
                chunks: data.chunks.map((c) => ({
                  id: c.id,
                  content: c.content,
                  chunkIndex: c.chunk_index,
                  chunkTotal: c.chunk_total,
                  metadata: c.metadata,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'list_sources': {
        const { limit = 50, offset = 0 } = args as { limit?: number; offset?: number };
        
        const sources = await ragStorage.listSources(limit, offset);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: sources.length,
                sources: sources.map((s) => ({
                  id: s.id,
                  title: s.title,
                  sourceType: s.source_type,
                  metadata: s.metadata,
                  createdAt: s.created_at,
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'get_stats': {
        const stats = await ragStorage.getStats();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } finally {
    await ragStorage.close();
  }
}

/**
 * Helper per parsare e validare richieste JSON-RPC 2.0
 */
interface JSONRPCRequest {
  jsonrpc: string;
  id: string | number | null;
  method: string;
  params?: any;
}

function parseJSONRPCRequest(body: any): JSONRPCRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid JSON-RPC request: body must be an object');
  }

  if (body.jsonrpc !== '2.0') {
    throw new Error('Invalid JSON-RPC version: must be "2.0"');
  }

  if (!body.method || typeof body.method !== 'string') {
    throw new Error('Invalid JSON-RPC request: method is required and must be a string');
  }

  if (body.id === undefined) {
    throw new Error('Invalid JSON-RPC request: id is required');
  }

  return {
    jsonrpc: body.jsonrpc,
    id: body.id,
    method: body.method,
    params: body.params,
  };
}

/**
 * Helper per creare risposte JSON-RPC 2.0 di successo
 */
function createJSONRPCSuccessResponse(id: string | number | null, result: any) {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Helper per creare risposte JSON-RPC 2.0 di errore
 */
function createJSONRPCErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: any
) {
  const error: any = {
    code,
    message,
  };
  if (data !== undefined) {
    error.data = data;
  }
  return {
    jsonrpc: '2.0',
    id,
    error,
  };
}

/**
 * Mappa McpError a JSON-RPC error code
 */
function mapMcpErrorToJSONRPC(error: McpError): { code: number; message: string; data?: any } {
  // JSON-RPC error codes: -32700 to -32768 reserved, -32000 to -32099 server errors
  // MCP error codes: vedi ErrorCode enum
  switch (error.code) {
    case ErrorCode.InvalidParams:
      return { code: -32602, message: error.message || 'Invalid params' };
    case ErrorCode.MethodNotFound:
      return { code: -32601, message: error.message || 'Method not found' };
    case ErrorCode.InternalError:
      return { code: -32603, message: error.message || 'Internal error' };
    case ErrorCode.InvalidRequest:
      return { code: -32600, message: error.message || 'Invalid request' };
    default:
      return { code: -32000, message: error.message || 'Server error', data: { mcpCode: error.code } };
  }
}

/**
 * GET /api/mcp
 * MCP Server con SSE transport
 */
export async function GET(request: NextRequest) {
  try {
    // Estrai API key dall'header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized: Missing or invalid Authorization header', {
        status: 401,
      });
    }

    const apiKey = authHeader.substring(7); // Rimuovi "Bearer "

    // Valida API key
    const authData = await validateApiKey(apiKey);
    if (!authData) {
      return new Response('Unauthorized: Invalid API key', {
        status: 401,
      });
    }

    console.log('✅ MCP Connection authenticated:', {
      userId: authData.userId,
      ragId: authData.ragId,
    });

    // Verifica che la config sia completa
    const config = authData.ragConfig;
    if (!config?.connectionString || !config?.apiKey) {
      return new Response('RAG configuration incomplete', {
        status: 400,
      });
    }

    // Crea MCP Server
    const server = new Server(
      {
        name: 'gimme-rag-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Tools list
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: getToolsDefinition(),
    }));

    // Implementazione tools
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return executeTool(name, args, config);
    });

    // Crea custom SSE transport per Next.js
    const transport = new NextJSSSETransport();
    
    // Crea ReadableStream per SSE
    const stream = new ReadableStream({
      start(controller) {
        transport.setController(controller);
        
        // Invia endpoint event con session ID
        const endpointUrl = `/api/mcp?sessionId=${transport.sessionId}`;
        const endpointData = `event: endpoint\ndata: ${endpointUrl}\n\n`;
        controller.enqueue(transport.encoder.encode(endpointData));
        
        // Connetti server a transport
        server.connect(transport).then(() => {
          console.log('🚀 MCP Server connected via SSE');
        }).catch((error) => {
          console.error('Error connecting MCP server:', error);
          controller.error(error);
        });
      },
      cancel() {
        transport.close();
      },
    });

    // Ritorna la response SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('❌ MCP Server error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /api/mcp
 * Gestisce richieste MCP via SSE o HTTP transport
 */
export async function POST(request: NextRequest) {
  try {
    // Distingui tra SSE e HTTP transport basandoti sull'header Accept
    const acceptHeader = request.headers.get('accept') || '';
    const isSSE = acceptHeader.includes('text/event-stream');

    if (isSSE) {
      // Richiesta SSE: reindirizza a GET (comportamento esistente)
      return GET(request);
    }

    // HTTP transport: gestisci richiesta JSON-RPC 2.0 standard
    console.log('📡 HTTP Transport request received');

    // Estrai API key dall'header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorResponse = createJSONRPCErrorResponse(
        null,
        -32000,
        'Unauthorized: Missing or invalid Authorization header'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = authHeader.substring(7); // Rimuovi "Bearer "

    // Valida API key
    const authData = await validateApiKey(apiKey);
    if (!authData) {
      const errorResponse = createJSONRPCErrorResponse(
        null,
        -32000,
        'Unauthorized: Invalid API key'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ HTTP Transport authenticated:', {
      userId: authData.userId,
      ragId: authData.ragId,
    });

    // Verifica che la config sia completa
    const config = authData.ragConfig;
    if (!config?.connectionString || !config?.apiKey) {
      const errorResponse = createJSONRPCErrorResponse(
        null,
        -32000,
        'RAG configuration incomplete'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parsa body della richiesta
    let body;
    try {
      body = await request.json();
    } catch (error) {
      const errorResponse = createJSONRPCErrorResponse(
        null,
        -32700,
        'Parse error: Invalid JSON'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parsa e valida richiesta JSON-RPC
    let jsonrpcRequest: JSONRPCRequest;
    try {
      jsonrpcRequest = parseJSONRPCRequest(body);
    } catch (error: any) {
      const errorResponse = createJSONRPCErrorResponse(
        body.id || null,
        -32600,
        error.message || 'Invalid Request'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('📥 HTTP Transport request:', {
      method: jsonrpcRequest.method,
      id: jsonrpcRequest.id,
    });

    // Gestisci i metodi JSON-RPC
    try {
      switch (jsonrpcRequest.method) {
        case 'tools/list': {
          const tools = getToolsDefinition();
          const response = createJSONRPCSuccessResponse(jsonrpcRequest.id, {
            tools,
          });
          console.log('✅ HTTP Transport response: tools/list');
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        case 'tools/call': {
          if (!jsonrpcRequest.params) {
            throw new Error('Missing params in tools/call request');
          }

          const { name, arguments: args } = jsonrpcRequest.params as {
            name: string;
            arguments: any;
          };

          if (!name) {
            throw new Error('Missing tool name in params');
          }

          console.log('🔧 Executing tool:', name);

          const toolResult = await executeTool(name, args || {}, config);

          // Estrai il testo dal risultato MCP e parsalo come JSON per la risposta
          const resultText = toolResult.content[0]?.text || '{}';
          let resultData;
          try {
            resultData = JSON.parse(resultText);
          } catch {
            // Se non è JSON valido, restituisci il testo come stringa
            resultData = resultText;
          }

          const response = createJSONRPCSuccessResponse(jsonrpcRequest.id, resultData);
          console.log('✅ HTTP Transport response: tools/call', name);
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        case 'initialize': {
          // MCP HTTP transport potrebbe richiedere initialize
          // Restituiamo capabilities del server
          const response = createJSONRPCSuccessResponse(jsonrpcRequest.id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'gimme-rag-mcp',
              version: '1.0.0',
            },
          });
          console.log('✅ HTTP Transport response: initialize');
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        default: {
          const errorResponse = createJSONRPCErrorResponse(
            jsonrpcRequest.id,
            -32601,
            `Method not found: ${jsonrpcRequest.method}`
          );
          console.log('❌ HTTP Transport error: Method not found', jsonrpcRequest.method);
          return new Response(JSON.stringify(errorResponse), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (error: any) {
      console.error('❌ HTTP Transport error:', error);

      // Se è un McpError, mappalo a JSON-RPC error
      if (error instanceof McpError) {
        const mappedError = mapMcpErrorToJSONRPC(error);
        const errorResponse = createJSONRPCErrorResponse(
          jsonrpcRequest.id,
          mappedError.code,
          mappedError.message,
          mappedError.data
        );
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Errore generico
      const errorResponse = createJSONRPCErrorResponse(
        jsonrpcRequest.id,
        -32603,
        error.message || 'Internal error'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('❌ HTTP Transport fatal error:', error);
    const errorResponse = createJSONRPCErrorResponse(
      null,
      -32603,
      error.message || 'Internal server error'
    );
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

