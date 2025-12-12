/**
 * Storage e retrieval per RAG con 2 tabelle (sources + chunks)
 * Usando Vercel AI SDK 5 per embeddings
 */

import { Pool, PoolClient } from 'pg';
import { generateEmbedding, generateEmbeddingsBatch, arrayToVectorString, type EmbeddingConfig } from './embeddings';
import { chunkText, type Chunk, type ChunkOptions } from '../chunking';
import type { SourceDocument, EmbeddedChunk } from './database-schema';

export interface RAGStorageConfig {
  connectionString: string;
  sourcesTableName: string;
  chunksTableName: string;
  embeddingConfig: EmbeddingConfig;
  ssl?: boolean;
}

export interface SaveSourceResult {
  sourceId: string;
  chunksCreated: number;
  tokensUsed: number;
}

export interface SearchResult {
  chunkId: string;
  sourceId: string;
  chunkContent: string;
  sourceTitle: string;
  sourceType: string;
  similarity: number;
  chunkIndex: number;
  chunkTotal: number;
  metadata: any;
}

/**
 * Risultato hybrid search (semantic + keyword combinati)
 */
export interface HybridSearchResult {
  chunkId: string;
  sourceId: string;
  chunkContent: string;
  sourceTitle: string;
  sourceType: string;
  chunkIndex: number;
  chunkTotal: number;
  metadata: any;
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
  matchType: 'both' | 'semantic_only' | 'keyword_only';
}

/**
 * Chunk con contesto (chunks adiacenti)
 */
export interface ChunkWithContext {
  chunkId: string;
  sourceId: string;
  chunkContent: string;
  sourceTitle: string;
  sourceType: string;
  chunkIndex: number;
  chunkTotal: number;
  metadata: any;
  isTarget: boolean;
  relativePosition: number;
}

/**
 * Modalità di ricerca
 */
export type SearchMode = 'hybrid' | 'semantic' | 'keyword';

/**
 * Classe per gestire storage e retrieval RAG
 */
export class RAGStorage {
  private config: RAGStorageConfig;
  private pool: Pool | null = null;

  constructor(config: RAGStorageConfig) {
    this.config = config;
  }

  /**
   * Inizializza connessione al database
   */
  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.encodeConnectionString(this.config.connectionString),
        ssl: this.config.ssl !== false ? { rejectUnauthorized: false } : undefined,
      });
    }
    return this.pool;
  }

  /**
   * Encoding della password nel connection string
   */
  private encodeConnectionString(connStr: string): string {
    try {
      const url = new URL(connStr);
      if (url.password) {
        const decodedPassword = decodeURIComponent(url.password);
        const encodedPassword = encodeURIComponent(decodedPassword);
        url.password = encodedPassword;
        return url.toString();
      }
      return connStr;
    } catch (error) {
      return connStr;
    }
  }

  /**
   * Chiudi connessione database
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Salva un documento source e genera i suoi chunks embedded
   */
  async saveSource(
    title: string,
    content: string,
    sourceType: 'text' | 'website' | 'docs' | 'qa' | 'notion',
    metadata: Record<string, any> = {},
    chunkOptions?: ChunkOptions
  ): Promise<SaveSourceResult> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Salva il documento source
      const sourceResult = await client.query(
        `INSERT INTO ${this.config.sourcesTableName} 
         (title, content, source_type, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
         RETURNING id`,
        [title, content, sourceType, JSON.stringify(metadata)]
      );

      const sourceId = sourceResult.rows[0].id;

      // 2. Chunking del contenuto con LangChain (chunking adattivo)
      const enhancedOptions = {
        ...chunkOptions,
        sourceType: sourceType,
      };
      const chunks = await chunkText(content, enhancedOptions);

      if (chunks.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('No chunks generated from content');
      }

      // 3. Genera embeddings in batch per tutti i chunks
      const chunkTexts = chunks.map(c => c.text);
      const { embeddings, tokensUsed } = await generateEmbeddingsBatch(
        chunkTexts,
        this.config.embeddingConfig
      );

      // 4. Salva tutti i chunks con embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const vectorString = arrayToVectorString(embedding);

        const chunkMetadata = {
          word_count: chunk.metadata.wordCount,
          start_char: chunk.metadata.startChar,
          end_char: chunk.metadata.endChar,
        };

        await client.query(
          `INSERT INTO ${this.config.chunksTableName}
           (source_id, content, embedding, chunk_index, chunk_total, metadata, created_at)
           VALUES ($1, $2, $3::vector, $4, $5, $6::jsonb, NOW())`,
          [
            sourceId,
            chunk.text,
            vectorString,
            chunk.index,
            chunks.length,
            JSON.stringify(chunkMetadata),
          ]
        );
      }

      await client.query('COMMIT');

      return {
        sourceId,
        chunksCreated: chunks.length,
        tokensUsed,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Semantic search su chunks embedded
   */
  async search(
    query: string,
    limit: number = 5,
    minSimilarity: number = 0
  ): Promise<SearchResult[]> {
    const pool = this.getPool();

    try {
      // 1. Genera embedding della query
      const { embedding } = await generateEmbedding(
        query,
        this.config.embeddingConfig
      );
      const vectorString = arrayToVectorString(embedding);

      // 2. Similarity search con JOIN alla tabella sources
      const result = await pool.query(
        `SELECT 
          c.id as chunk_id,
          c.source_id,
          c.content as chunk_content,
          c.chunk_index,
          c.chunk_total,
          c.metadata as chunk_metadata,
          s.title as source_title,
          s.source_type,
          s.metadata as source_metadata,
          (c.embedding <=> $1::vector) as distance
         FROM ${this.config.chunksTableName} c
         JOIN ${this.config.sourcesTableName} s ON c.source_id = s.id
         WHERE c.embedding IS NOT NULL
         ORDER BY c.embedding <=> $1::vector
         LIMIT $2`,
        [vectorString, limit]
      );

      // 3. Formatta risultati
      return result.rows
        .map((row) => {
          const similarity = 1 - row.distance; // cosine similarity = 1 - cosine distance
          return {
            chunkId: row.chunk_id,
            sourceId: row.source_id,
            chunkContent: row.chunk_content,
            sourceTitle: row.source_title,
            sourceType: row.source_type,
            similarity: parseFloat((similarity * 100).toFixed(2)),
            chunkIndex: row.chunk_index,
            chunkTotal: row.chunk_total,
            metadata: {
              ...row.chunk_metadata,
              ...row.source_metadata,
            },
          };
        })
        .filter((result) => result.similarity >= minSimilarity);
    } catch (error: any) {
      // Migliora messaggi di errore per debug
      if (error.code === '42P01') {
        // Table does not exist
        throw new Error(
          `Table not found: ${error.message.includes(this.config.chunksTableName) ? this.config.chunksTableName : this.config.sourcesTableName}. ` +
          `Please ensure the tables exist in your database.`
        );
      }
      if (error.code === '42883') {
        // Operator does not exist (pgvector extension not installed)
        throw new Error(
          `PostgreSQL vector extension (pgvector) is not installed or enabled. ` +
          `Please run: CREATE EXTENSION IF NOT EXISTS vector;`
        );
      }
      if (error.code === '42703') {
        // Column does not exist
        throw new Error(
          `Column not found in table. Please check your database schema matches the expected structure. ` +
          `Error: ${error.message}`
        );
      }
      if (error.message?.includes('connection')) {
        throw new Error(
          `Database connection failed: ${error.message}. ` +
          `Please check your connection string and database availability.`
        );
      }
      // Rilancia l'errore originale con più contesto
      throw new Error(
        `Search failed: ${error.message}. ` +
        `Tables: ${this.config.chunksTableName}, ${this.config.sourcesTableName}`
      );
    }
  }

  /**
   * Ottieni un source singolo
   */
  async getSource(sourceId: string): Promise<SourceDocument | null> {
    const pool = this.getPool();

    const result = await pool.query(
      `SELECT * FROM ${this.config.sourcesTableName} WHERE id = $1`,
      [sourceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Ottieni un source completo con tutti i suoi chunks
   */
  async getSourceWithChunks(sourceId: string): Promise<{
    source: SourceDocument;
    chunks: EmbeddedChunk[];
  }> {
    const pool = this.getPool();

    // Get source
    const sourceResult = await pool.query(
      `SELECT * FROM ${this.config.sourcesTableName} WHERE id = $1`,
      [sourceId]
    );

    if (sourceResult.rows.length === 0) {
      throw new Error(`Source ${sourceId} not found`);
    }

    // Get chunks
    const chunksResult = await pool.query(
      `SELECT * FROM ${this.config.chunksTableName} 
       WHERE source_id = $1 
       ORDER BY chunk_index ASC`,
      [sourceId]
    );

    return {
      source: sourceResult.rows[0],
      chunks: chunksResult.rows,
    };
  }

  /**
   * Elimina un source e tutti i suoi chunks (CASCADE)
   */
  async deleteSource(sourceId: string): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      `DELETE FROM ${this.config.sourcesTableName} WHERE id = $1`,
      [sourceId]
    );
  }

  /**
   * Lista tutti i sources
   */
  async listSources(
    limit: number = 100,
    offset: number = 0
  ): Promise<SourceDocument[]> {
    const pool = this.getPool();
    const result = await pool.query(
      `SELECT * FROM ${this.config.sourcesTableName}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Conta sources per tipo
   */
  async countSourcesByType(): Promise<Record<string, number>> {
    const pool = this.getPool();
    const result = await pool.query(
      `SELECT source_type, COUNT(*) as count
       FROM ${this.config.sourcesTableName}
       GROUP BY source_type`
    );

    const counts: Record<string, number> = {};
    result.rows.forEach((row) => {
      counts[row.source_type] = parseInt(row.count);
    });

    return counts;
  }

  /**
   * Statistiche generali
   */
  async getStats(): Promise<{
    totalSources: number;
    totalChunks: number;
    chunksWithEmbeddings: number;
    chunksWithoutEmbeddings: number;
  }> {
    const pool = this.getPool();

    const sourcesResult = await pool.query(
      `SELECT COUNT(*) as count FROM ${this.config.sourcesTableName}`
    );

    const chunksResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(embedding) as with_embeddings,
        COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings
       FROM ${this.config.chunksTableName}`
    );

    return {
      totalSources: parseInt(sourcesResult.rows[0].count),
      totalChunks: parseInt(chunksResult.rows[0].total),
      chunksWithEmbeddings: parseInt(chunksResult.rows[0].with_embeddings),
      chunksWithoutEmbeddings: parseInt(chunksResult.rows[0].without_embeddings),
    };
  }

  /**
   * Ottieni il numero di chunks per ogni source
   */
  async getChunksCountBySource(): Promise<Map<string, number>> {
    const pool = this.getPool();

    const result = await pool.query(
      `SELECT source_id, COUNT(*) as chunk_count
       FROM ${this.config.chunksTableName}
       GROUP BY source_id`
    );

    return new Map(
      result.rows.map((row: any) => [row.source_id, parseInt(row.chunk_count)])
    );
  }

  /**
   * Keyword search avanzata con context window
   * Usa PostgreSQL Full-Text Search per cercare keywords esatte
   */
  async keywordSearch(
    keywords: string,
    options: {
      sourceId?: string;
      contextLines?: number;
      limit?: number;
    } = {}
  ): Promise<Array<{
    sourceId: string;
    sourceTitle: string;
    sourceType: string;
    chunkId: string;
    chunkContent: string;
    matchPosition: number;
    context: string;
    rank: number;
    chunkIndex: number;
    chunkTotal: number;
  }>> {
    const pool = this.getPool();
    const { sourceId, contextLines = 10, limit = 20 } = options;

    // Usa plainto_tsquery per convertire keywords in tsquery (gestisce automaticamente AND)
    let query = `
      WITH ranked_chunks AS (
        SELECT 
          c.id as chunk_id,
          c.source_id,
          c.content as chunk_content,
          c.chunk_index,
          c.chunk_total,
          s.title as source_title,
          s.source_type,
          ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) as rank,
          position(lower($1) in lower(c.content)) as match_position
        FROM ${this.config.chunksTableName} c
        JOIN ${this.config.sourcesTableName} s ON c.source_id = s.id
        WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
    `;

    const params: any[] = [keywords];

    if (sourceId) {
      params.push(sourceId);
      query += ` AND c.source_id = $${params.length}`;
    }

    query += `
        ORDER BY rank DESC, match_position ASC
        LIMIT $${params.length + 1}
      )
      SELECT * FROM ranked_chunks
    `;

    params.push(limit);

    const result = await pool.query(query, params);

    // Formatta risultati con context
    return result.rows.map((row) => {
      const content = row.chunk_content;
      const matchPos = row.match_position - 1; // 0-indexed

      // Calcola context window (in caratteri, approssimato per linee)
      const avgCharsPerLine = 80;
      const contextChars = contextLines * avgCharsPerLine;

      const start = Math.max(0, matchPos - contextChars);
      const end = Math.min(content.length, matchPos + keywords.length + contextChars);

      const context = content.substring(start, end);
      const beforeContext = content.substring(start, matchPos);
      const afterContext = content.substring(matchPos + keywords.length, end);

      return {
        sourceId: row.source_id,
        sourceTitle: row.source_title,
        sourceType: row.source_type,
        chunkId: row.chunk_id,
        chunkContent: content,
        matchPosition: matchPos,
        context: (start > 0 ? '...' : '') + context + (end < content.length ? '...' : ''),
        rank: parseFloat((row.rank * 100).toFixed(2)),
        chunkIndex: row.chunk_index,
        chunkTotal: row.chunk_total,
      };
    });
  }

  /**
   * Hybrid Search: combina semantic search + keyword search
   * Chiama la function Postgres hybrid_search
   */
  async hybridSearch(
    query: string,
    options: {
      limit?: number;
      semanticWeight?: number;
      keywordWeight?: number;
      similarityThreshold?: number;
    } = {}
  ): Promise<HybridSearchResult[]> {
    const pool = this.getPool();
    const {
      limit = 5,
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      similarityThreshold = 0.5,
    } = options;

    try {
      // 1. Genera embedding della query
      const { embedding } = await generateEmbedding(
        query,
        this.config.embeddingConfig
      );
      const vectorString = arrayToVectorString(embedding);

      // 2. Chiama la function Postgres hybrid_search
      const functionName = `${this.config.chunksTableName}_hybrid_search`;
      const result = await pool.query(
        `SELECT * FROM ${functionName}($1, $2::vector, $3, $4, $5, $6)`,
        [query, vectorString, limit, semanticWeight, keywordWeight, similarityThreshold]
      );

      // 3. Formatta risultati
      return result.rows.map((row) => ({
        chunkId: row.id,
        sourceId: row.source_id,
        chunkContent: row.content,
        sourceTitle: row.source_title,
        sourceType: row.source_type,
        chunkIndex: row.chunk_index,
        chunkTotal: row.chunk_total,
        metadata: {
          ...row.metadata,
          ...row.source_metadata,
        },
        semanticScore: parseFloat((row.semantic_score * 100).toFixed(2)),
        keywordScore: parseFloat((row.keyword_score * 100).toFixed(2)),
        combinedScore: parseFloat((row.combined_score * 100).toFixed(2)),
        matchType: row.match_type as 'both' | 'semantic_only' | 'keyword_only',
      }));
    } catch (error: any) {
      // Gestione errori specifica per function non trovata
      if (error.code === '42883') {
        throw new Error(
          `Hybrid search function not found. Please run the database setup script to create the required functions. ` +
          `Expected function: ${this.config.chunksTableName}_hybrid_search`
        );
      }
      throw new Error(`Hybrid search failed: ${error.message}`);
    }
  }

  /**
   * Unified search: seleziona automaticamente la modalità di ricerca
   */
  async unifiedSearch(
    query: string,
    options: {
      mode?: SearchMode;
      limit?: number;
      semanticWeight?: number;
      keywordWeight?: number;
      similarityThreshold?: number;
    } = {}
  ): Promise<HybridSearchResult[]> {
    const { mode = 'hybrid', limit = 5, ...hybridOptions } = options;

    switch (mode) {
      case 'hybrid':
        return this.hybridSearch(query, { limit, ...hybridOptions });

      case 'semantic': {
        // Usa search esistente e converte al formato HybridSearchResult
        const results = await this.search(query, limit);
        return results.map((r) => ({
          chunkId: r.chunkId,
          sourceId: r.sourceId,
          chunkContent: r.chunkContent,
          sourceTitle: r.sourceTitle,
          sourceType: r.sourceType,
          chunkIndex: r.chunkIndex,
          chunkTotal: r.chunkTotal,
          metadata: r.metadata,
          semanticScore: r.similarity,
          keywordScore: 0,
          combinedScore: r.similarity,
          matchType: 'semantic_only' as const,
        }));
      }

      case 'keyword': {
        // Usa keywordSearch esistente e converte al formato HybridSearchResult
        const results = await this.keywordSearch(query, { limit });
        return results.map((r) => ({
          chunkId: r.chunkId,
          sourceId: r.sourceId,
          chunkContent: r.chunkContent,
          sourceTitle: r.sourceTitle,
          sourceType: r.sourceType,
          chunkIndex: r.chunkIndex,
          chunkTotal: r.chunkTotal,
          metadata: {},
          semanticScore: 0,
          keywordScore: r.rank,
          combinedScore: r.rank,
          matchType: 'keyword_only' as const,
        }));
      }

      default:
        throw new Error(`Invalid search mode: ${mode}`);
    }
  }

  /**
   * Get chunk with context: recupera un chunk con i chunks adiacenti
   * Chiama la function Postgres get_chunk_with_context
   */
  async getChunkWithContext(
    chunkId: string,
    windowSize: number = 2
  ): Promise<ChunkWithContext[]> {
    const pool = this.getPool();

    try {
      const functionName = `${this.config.chunksTableName}_get_chunk_with_context`;
      const result = await pool.query(
        `SELECT * FROM ${functionName}($1::uuid, $2)`,
        [chunkId, windowSize]
      );

      if (result.rows.length === 0) {
        throw new Error(`Chunk ${chunkId} not found`);
      }

      return result.rows.map((row) => ({
        chunkId: row.id,
        sourceId: row.source_id,
        chunkContent: row.content,
        sourceTitle: row.source_title,
        sourceType: row.source_type,
        chunkIndex: row.chunk_index,
        chunkTotal: row.chunk_total,
        metadata: row.metadata || {},
        isTarget: row.is_target,
        relativePosition: row.relative_position,
      }));
    } catch (error: any) {
      if (error.code === '42883') {
        throw new Error(
          `Get context function not found. Please run the database setup script to create the required functions. ` +
          `Expected function: ${this.config.chunksTableName}_get_chunk_with_context`
        );
      }
      if (error.message?.includes('Chunk not found')) {
        throw error;
      }
      throw new Error(`Get chunk with context failed: ${error.message}`);
    }
  }
}


