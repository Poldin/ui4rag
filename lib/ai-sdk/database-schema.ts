/**
 * Schema del database per RAG con 2 tabelle:
 * 1. SOURCES: documenti originali
 * 2. CHUNKS: chunks embedded per similarity search
 */

export interface SourceDocument {
  id: string;
  title: string;
  content: string;
  source_type: 'text' | 'website' | 'docs' | 'qa' | 'notion';
  metadata: {
    source_id?: string;
    url?: string;
    filename?: string;
    added_at?: string;
    [key: string]: any;
  };
  created_at: Date;
  updated_at: Date;
}

export interface EmbeddedChunk {
  id: string;
  source_id: string; // foreign key to sources table
  content: string;
  embedding: number[] | string; // vector type in PostgreSQL
  chunk_index: number;
  chunk_total: number;
  metadata: {
    word_count: number;
    start_char: number;
    end_char: number;
    [key: string]: any;
  };
  created_at: Date;
}

/**
 * SQL per creare le tabelle SOURCES e CHUNKS
 */
export function generateDatabaseSchema(
  sourcesTableName: string,
  chunksTableName: string,
  embeddingDimensions: number
): string {
  return `
-- Enable pgvector extension (required for vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLE 1: SOURCES (documenti originali)
-- ============================================
CREATE TABLE IF NOT EXISTS public.${sourcesTableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index per ricerca per tipo
CREATE INDEX IF NOT EXISTS ${sourcesTableName}_source_type_idx 
  ON public.${sourcesTableName}(source_type);

-- Index per timestamp
CREATE INDEX IF NOT EXISTS ${sourcesTableName}_created_at_idx 
  ON public.${sourcesTableName}(created_at DESC);

-- Index GIN per metadata JSONB
CREATE INDEX IF NOT EXISTS ${sourcesTableName}_metadata_idx 
  ON public.${sourcesTableName} USING GIN(metadata);


-- ============================================
-- TABLE 2: CHUNKS (chunks embedded)
-- ============================================
CREATE TABLE IF NOT EXISTS public.${chunksTableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.${sourcesTableName}(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(${embeddingDimensions}),
  chunk_index INTEGER NOT NULL,
  chunk_total INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index per source_id (per trovare tutti i chunks di un source)
CREATE INDEX IF NOT EXISTS ${chunksTableName}_source_id_idx 
  ON public.${chunksTableName}(source_id);

-- Vector similarity search index (IVFFLAT per cosine similarity)
CREATE INDEX IF NOT EXISTS ${chunksTableName}_embedding_idx 
  ON public.${chunksTableName} 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index composto per ordinamento chunks
CREATE INDEX IF NOT EXISTS ${chunksTableName}_source_chunk_idx 
  ON public.${chunksTableName}(source_id, chunk_index);


-- ============================================
-- TRIGGERS per updated_at su SOURCES
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_${sourcesTableName}_updated_at ON public.${sourcesTableName};
CREATE TRIGGER update_${sourcesTableName}_updated_at 
  BEFORE UPDATE ON public.${sourcesTableName} 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- VIEW per join tra sources e chunks (opzionale, utile per query)
-- ============================================
CREATE OR REPLACE VIEW ${chunksTableName}_with_source AS
SELECT 
  c.id as chunk_id,
  c.source_id,
  c.content as chunk_content,
  c.embedding,
  c.chunk_index,
  c.chunk_total,
  c.metadata as chunk_metadata,
  c.created_at as chunk_created_at,
  s.title as source_title,
  s.content as source_content,
  s.source_type,
  s.metadata as source_metadata,
  s.created_at as source_created_at
FROM public.${chunksTableName} c
JOIN public.${sourcesTableName} s ON c.source_id = s.id;
  `.trim();
}

/**
 * Default table names
 */
export const DEFAULT_SOURCES_TABLE = 'gimme_rag_sources';
export const DEFAULT_CHUNKS_TABLE = 'gimme_rag_chunks';

