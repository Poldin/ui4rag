/**
 * Schema del database per RAG con 2 tabelle:
 * 1. SOURCES: documenti originali
 * 2. CHUNKS: chunks embedded per similarity search
 * 
 * Include supporto per Hybrid Search (semantic + keyword)
 * FTS usa sempre 'simple' (language-agnostic, funziona con qualsiasi lingua)
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
  fts?: any; // tsvector for full-text search (auto-generated)
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
 * Include colonna fts, indici e functions per Hybrid Search
 */
export function generateDatabaseSchema(
  sourcesTableName: string,
  chunksTableName: string,
  embeddingDimensions: number
): string {
  return `
-- Enable required extensions
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
-- TABLE 2: CHUNKS (chunks embedded + FTS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.${chunksTableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.${sourcesTableName}(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(${embeddingDimensions}),
  fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  chunk_index INTEGER NOT NULL,
  chunk_total INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index per source_id (per trovare tutti i chunks di un source)
CREATE INDEX IF NOT EXISTS ${chunksTableName}_source_id_idx 
  ON public.${chunksTableName}(source_id);

-- Vector similarity search index (IVFFLAT per cosine similarity)
-- Nota: IVFFLAT richiede almeno ~1000 vettori per essere efficace
CREATE INDEX IF NOT EXISTS ${chunksTableName}_embedding_idx 
  ON public.${chunksTableName} 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index GIN per Full-Text Search
CREATE INDEX IF NOT EXISTS ${chunksTableName}_fts_idx 
  ON public.${chunksTableName} USING GIN(fts);

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
-- FUNCTION: hybrid_search
-- Combina semantic search (pgvector) + keyword search (FTS)
-- Usa sempre 'simple' per FTS (language-agnostic)
-- ============================================
CREATE OR REPLACE FUNCTION ${chunksTableName}_hybrid_search(
  query_text TEXT,
  query_embedding vector(${embeddingDimensions}),
  match_count INT DEFAULT 5,
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  chunk_index INT,
  chunk_total INT,
  metadata JSONB,
  source_title TEXT,
  source_type TEXT,
  source_metadata JSONB,
  semantic_score FLOAT,
  keyword_score FLOAT,
  combined_score FLOAT,
  match_type TEXT
) AS $$
DECLARE
  expanded_count INT := match_count * 3;
BEGIN
  RETURN QUERY
  WITH 
  -- Semantic search (pgvector cosine similarity)
  semantic AS (
    SELECT 
      c.id, c.source_id, c.content, c.chunk_index, c.chunk_total, c.metadata,
      s.title as source_title, s.source_type, s.metadata as source_metadata,
      1 - (c.embedding <=> query_embedding) as score
    FROM public.${chunksTableName} c
    JOIN public.${sourcesTableName} s ON c.source_id = s.id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT expanded_count
  ),
  
  -- Keyword search (FTS con 'simple')
  keyword AS (
    SELECT 
      c.id, c.source_id, c.content, c.chunk_index, c.chunk_total, c.metadata,
      s.title as source_title, s.source_type, s.metadata as source_metadata,
      ts_rank_cd(c.fts, plainto_tsquery('simple', query_text)) as score
    FROM public.${chunksTableName} c
    JOIN public.${sourcesTableName} s ON c.source_id = s.id
    WHERE c.fts @@ plainto_tsquery('simple', query_text)
    ORDER BY ts_rank_cd(c.fts, plainto_tsquery('simple', query_text)) DESC
    LIMIT expanded_count
  ),
  
  -- Normalizza score semantic (già 0-1)
  semantic_normalized AS (
    SELECT *, score as normalized_score
    FROM semantic WHERE score >= similarity_threshold
  ),
  
  -- Normalizza score keyword (scala a 0-1)
  keyword_normalized AS (
    SELECT *,
      CASE WHEN (SELECT MAX(score) FROM keyword) > 0 
        THEN score / (SELECT MAX(score) FROM keyword) ELSE 0 
      END as normalized_score
    FROM keyword
  ),
  
  -- FULL OUTER JOIN per combinare risultati
  combined AS (
    SELECT 
      COALESCE(s.id, k.id) as id,
      COALESCE(s.source_id, k.source_id) as source_id,
      COALESCE(s.content, k.content) as content,
      COALESCE(s.chunk_index, k.chunk_index) as chunk_index,
      COALESCE(s.chunk_total, k.chunk_total) as chunk_total,
      COALESCE(s.metadata, k.metadata) as metadata,
      COALESCE(s.source_title, k.source_title) as source_title,
      COALESCE(s.source_type, k.source_type) as source_type,
      COALESCE(s.source_metadata, k.source_metadata) as source_metadata,
      COALESCE(s.normalized_score, 0) as sem_score,
      COALESCE(k.normalized_score, 0) as kw_score,
      CASE 
        WHEN s.id IS NOT NULL AND k.id IS NOT NULL THEN 'both'
        WHEN s.id IS NOT NULL THEN 'semantic_only' 
        ELSE 'keyword_only'
      END as match_type
    FROM semantic_normalized s
    FULL OUTER JOIN keyword_normalized k ON s.id = k.id
  )
  
  -- Query finale
  SELECT 
    combined.id, combined.source_id, combined.content,
    combined.chunk_index, combined.chunk_total, combined.metadata,
    combined.source_title, combined.source_type, combined.source_metadata,
    combined.sem_score::FLOAT as semantic_score,
    combined.kw_score::FLOAT as keyword_score,
    ((combined.sem_score * semantic_weight) + (combined.kw_score * keyword_weight))::FLOAT as combined_score,
    combined.match_type
  FROM combined
  WHERE (combined.sem_score * semantic_weight) + (combined.kw_score * keyword_weight) > 0
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- FUNCTION: get_chunk_with_context
-- Recupera un chunk con i chunks adiacenti dello stesso documento
-- ============================================
CREATE OR REPLACE FUNCTION ${chunksTableName}_get_chunk_with_context(
  target_chunk_id UUID,
  window_size INT DEFAULT 2
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  chunk_index INT,
  chunk_total INT,
  metadata JSONB,
  source_title TEXT,
  source_type TEXT,
  is_target BOOLEAN,
  relative_position INT
) AS $$
DECLARE
  target_source_id UUID;
  target_index INT;
BEGIN
  -- Trova source_id e chunk_index del chunk target
  SELECT c.source_id, c.chunk_index INTO target_source_id, target_index
  FROM public.${chunksTableName} c WHERE c.id = target_chunk_id;
  
  IF target_source_id IS NULL THEN
    RAISE EXCEPTION 'Chunk not found: %', target_chunk_id;
  END IF;
  
  -- Recupera chunk target + chunks adiacenti
  RETURN QUERY
  SELECT 
    c.id, c.source_id, c.content, c.chunk_index, c.chunk_total, c.metadata,
    s.title as source_title, s.source_type,
    c.chunk_index = target_index as is_target,
    c.chunk_index - target_index as relative_position
  FROM public.${chunksTableName} c
  JOIN public.${sourcesTableName} s ON c.source_id = s.id
  WHERE c.source_id = target_source_id
    AND c.chunk_index BETWEEN (target_index - window_size) AND (target_index + window_size)
  ORDER BY c.chunk_index;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- VIEW per join tra sources e chunks
-- ============================================
CREATE OR REPLACE VIEW ${chunksTableName}_with_source AS
SELECT 
  c.id as chunk_id,
  c.source_id,
  c.content as chunk_content,
  c.embedding,
  c.fts,
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
