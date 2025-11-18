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
      tools: [
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
      ],
    }));

    // Implementazione tools
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Crea RAGStorage per questo RAG
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
 * Gestisce i messaggi MCP in arrivo
 */
export async function POST(request: NextRequest) {
  // Il transport SSE gestisce automaticamente i POST
  // Questo endpoint è necessario per il protocollo MCP via SSE
  return GET(request);
}

