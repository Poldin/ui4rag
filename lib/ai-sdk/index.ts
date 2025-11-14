/**
 * Barrel export per il modulo AI SDK
 * Centralizza tutti gli exports per facilitare gli import
 */

// Database schema
export {
  generateDatabaseSchema,
  DEFAULT_SOURCES_TABLE,
  DEFAULT_CHUNKS_TABLE,
  type SourceDocument,
  type EmbeddedChunk,
} from './database-schema';

// Embeddings
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  createEmbeddingConfig,
  getEmbeddingDimensions,
  arrayToVectorString,
  type EmbeddingConfig,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './embeddings';

// Storage
export {
  RAGStorage,
  type RAGStorageConfig,
  type SaveSourceResult,
  type SearchResult,
} from './rag-storage';

// Types
export type {
  SourcesTable,
  ChunksTable,
  ChunksWithSourceView,
  SourceType,
  TextSourceMetadata,
  WebsiteSourceMetadata,
  DocsSourceMetadata,
  QASourceMetadata,
  NotionSourceMetadata,
  ChunkMetadata,
} from './types';

