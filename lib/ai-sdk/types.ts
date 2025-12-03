/**
 * TypeScript types per le tabelle RAG (sources + chunks)
 * Queste tabelle sono nel database PostgreSQL esterno (non Supabase)
 */

/**
 * Tabella SOURCES - Documenti originali
 */
export interface SourcesTable {
  Row: {
    id: string;
    title: string;
    content: string;
    source_type: 'text' | 'website' | 'docs' | 'qa' | 'notion';
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    title: string;
    content: string;
    source_type: 'text' | 'website' | 'docs' | 'qa' | 'notion';
    metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    title?: string;
    content?: string;
    source_type?: 'text' | 'website' | 'docs' | 'qa' | 'notion';
    metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
  };
}

/**
 * Tabella CHUNKS - Chunks embedded
 */
export interface ChunksTable {
  Row: {
    id: string;
    source_id: string; // FK to sources.id
    content: string;
    embedding: number[] | string; // vector type in PostgreSQL
    chunk_index: number;
    chunk_total: number;
    metadata: Record<string, any>;
    created_at: string;
  };
  Insert: {
    id?: string;
    source_id: string;
    content: string;
    embedding: number[] | string;
    chunk_index: number;
    chunk_total: number;
    metadata?: Record<string, any>;
    created_at?: string;
  };
  Update: {
    id?: string;
    source_id?: string;
    content?: string;
    embedding?: number[] | string;
    chunk_index?: number;
    chunk_total?: number;
    metadata?: Record<string, any>;
    created_at?: string;
  };
}

/**
 * View unificata chunks_with_source
 */
export interface ChunksWithSourceView {
  chunk_id: string;
  source_id: string;
  chunk_content: string;
  embedding: number[] | string;
  chunk_index: number;
  chunk_total: number;
  chunk_metadata: Record<string, any>;
  chunk_created_at: string;
  source_title: string;
  source_content: string;
  source_type: 'text' | 'website' | 'docs' | 'qa' | 'notion';
  source_metadata: Record<string, any>;
  source_created_at: string;
}

/**
 * Helper types per source types
 */
export type SourceType = 'text' | 'website' | 'docs' | 'qa' | 'notion';

/**
 * Metadata types per diversi source types
 */
export interface TextSourceMetadata {
  source_id?: string;
  added_at?: string;
}

export interface WebsiteSourceMetadata extends TextSourceMetadata {
  url: string;
  description?: string;
}

export interface DocsSourceMetadata extends TextSourceMetadata {
  filename: string;
  file_type?: string;
  file_size?: number;
}

export interface QASourceMetadata extends TextSourceMetadata {
  questions: string[];
  answer: string;
}

export interface NotionSourceMetadata extends TextSourceMetadata {
  page_id?: string;
  workspace?: string;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  word_count: number;
  start_char: number;
  end_char: number;
}





