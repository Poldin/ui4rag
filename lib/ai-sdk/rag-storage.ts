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

      // 2. Chunking del contenuto
      const chunks = chunkText(content, chunkOptions);

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
}

