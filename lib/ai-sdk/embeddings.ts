/**
 * Utilities per generare embeddings usando Vercel AI SDK 5
 */

import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export interface EmbeddingConfig {
  apiKey: string;
  model?: string; // default: 'text-embedding-3-small'
  dimensions?: number; // default: 1536 per text-embedding-3-small
}

export interface EmbeddingResult {
  embedding: number[];
  tokensUsed: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  tokensUsed: number;
}

/**
 * Genera embedding per un singolo testo usando AI SDK
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  const modelName = config.model || 'text-embedding-3-small';
  
  // Crea il provider OpenAI con API key
  const openai = createOpenAI({
    apiKey: config.apiKey,
  });
  
  // Crea il modello di embedding con AI SDK
  const embeddingModel = openai.embedding(modelName);

  // Genera embedding
  const { embedding, usage } = await embed({
    model: embeddingModel,
    value: text,
  });

  return {
    embedding: embedding,
    tokensUsed: usage?.tokens || 0,
  };
}

/**
 * Genera embeddings per multipli testi in batch usando AI SDK
 * Più efficiente per processare molti chunks contemporaneamente
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  if (texts.length === 0) {
    return { embeddings: [], tokensUsed: 0 };
  }

  const modelName = config.model || 'text-embedding-3-small';
  
  // Crea il provider OpenAI con API key
  const openai = createOpenAI({
    apiKey: config.apiKey,
  });
  
  // Crea il modello di embedding con AI SDK
  const embeddingModel = openai.embedding(modelName);

  // Genera embeddings in batch
  const { embeddings, usage } = await embedMany({
    model: embeddingModel,
    values: texts,
  });

  return {
    embeddings: embeddings,
    tokensUsed: usage?.tokens || 0,
  };
}

/**
 * Helper per configurare il provider OpenAI con API key
 */
export function createEmbeddingConfig(
  apiKey: string,
  model?: string,
  dimensions?: number
): EmbeddingConfig {
  return {
    apiKey,
    model: model || 'text-embedding-3-small',
    dimensions: dimensions || 1536,
  };
}

/**
 * Ottieni le dimensioni dell'embedding per un modello specifico
 */
export function getEmbeddingDimensions(model: string): number {
  const dimensionsMap: Record<string, number> = {
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'text-embedding-ada-002': 1536,
  };

  return dimensionsMap[model] || 1536;
}

/**
 * Converte un array di numeri in formato PostgreSQL vector
 */
export function arrayToVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

