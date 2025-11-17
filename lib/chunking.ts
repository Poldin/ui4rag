/**
 * Funzioni per lo splitting intelligente del contenuto in chunks
 * ottimizzati per la generazione di embeddings
 * 
 * Powered by LangChain.js - per chunking semantico avanzato
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MarkdownTextSplitter } from '@langchain/textsplitters';

export interface ChunkOptions {
  maxChunkSize?: number;        // Dimensione massima in caratteri (default: 1000)
  chunkOverlap?: number;         // Overlap tra chunks (default: 200)
  minChunkSize?: number;         // Dimensione minima in caratteri (default: 100)
  preserveParagraphs?: boolean;  // Mantieni paragrafi intatti se possibile (default: true)
  sourceType?: 'text' | 'website' | 'docs' | 'qa' | 'notion'; // Tipo di source per chunking adattivo
}

export interface Chunk {
  text: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
  };
}

/**
 * Crea uno splitter LangChain adattivo in base al tipo di contenuto
 */
function createAdaptiveSplitter(options: ChunkOptions): RecursiveCharacterTextSplitter | MarkdownTextSplitter {
  const {
    maxChunkSize = 1000,
    chunkOverlap = 200,
    sourceType = 'text',
  } = options;

  // Per documenti formattati con markdown (docs, website)
  if (sourceType === 'docs' || sourceType === 'website') {
    return new MarkdownTextSplitter({
      chunkSize: maxChunkSize,
      chunkOverlap: chunkOverlap,
    });
  }

  // Per Q&A usiamo overlap maggiore per mantenere contesto
  if (sourceType === 'qa') {
    return RecursiveCharacterTextSplitter.fromLanguage('markdown', {
      chunkSize: maxChunkSize,
      chunkOverlap: Math.min(chunkOverlap * 1.5, maxChunkSize * 0.3), // 30% di overlap per Q&A
    });
  }

  // Default: RecursiveCharacterTextSplitter con separatori intelligenti
  // Questo splitter usa una gerarchia: \n\n -> \n -> . -> spazio
  return new RecursiveCharacterTextSplitter({
    chunkSize: maxChunkSize,
    chunkOverlap: chunkOverlap,
    separators: [
      '\n\n',  // Paragrafi
      '\n',    // Newline
      '. ',    // Fine frase
      '! ',    // Fine frase esclamativa
      '? ',    // Fine frase interrogativa
      '; ',    // Punto e virgola
      ', ',    // Virgola
      ' ',     // Spazio
      '',      // Carattere per carattere (fallback)
    ],
    keepSeparator: true,
    lengthFunction: (text: string) => text.length,
  });
}

/**
 * Split del testo in chunks con overlap intelligente usando LangChain
 * Questa funzione mantiene backward compatibility con l'interfaccia esistente
 */
export async function chunkText(
  text: string,
  options: ChunkOptions = {}
): Promise<Chunk[]> {
  const {
    maxChunkSize = 1000,
    minChunkSize = 100,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalizza il testo
  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  
  if (normalizedText.length <= maxChunkSize) {
    // Se il testo è abbastanza piccolo, restituiscilo come singolo chunk
    return [{
      text: normalizedText,
      index: 0,
      metadata: {
        startChar: 0,
        endChar: normalizedText.length,
        wordCount: countWords(normalizedText),
      },
    }];
  }

  // Crea lo splitter appropriato
  const splitter = createAdaptiveSplitter(options);

  // Usa LangChain per lo splitting intelligente
  const langchainDocs = await splitter.createDocuments([normalizedText]);

  // Converti i documenti LangChain nel nostro formato Chunk
  const chunks: Chunk[] = [];
  let currentStartChar = 0;
  let chunkIndex = 0; // Contatore separato per indici sequenziali

  for (let i = 0; i < langchainDocs.length; i++) {
    const doc = langchainDocs[i];
    const chunkText = doc.pageContent;
    const chunkLength = chunkText.length;

    // Filtra chunks troppo piccoli ma mantieni la posizione corretta
    if (chunkText.trim().length < minChunkSize) {
      currentStartChar += chunkLength; // Avanza comunque la posizione
      continue;
    }

    chunks.push({
      text: chunkText,
      index: chunkIndex, // Usa il contatore sequenziale, non l'indice del loop
      metadata: {
        startChar: currentStartChar,
        endChar: currentStartChar + chunkLength,
        wordCount: countWords(chunkText),
      },
    });

    chunkIndex++; // Incrementa solo per i chunks validi
    currentStartChar += chunkLength;
  }

  return chunks;
}

/**
 * Versione sincrona per backward compatibility
 * Wrappa la versione async per mantenere l'interfaccia esistente
 */
export function chunkTextSync(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  // Per mantenere backward compatibility, usiamo un approccio semplificato sincrono
  const {
    maxChunkSize = 1000,
    chunkOverlap = 200,
    minChunkSize = 100,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  
  if (normalizedText.length <= maxChunkSize) {
    return [{
      text: normalizedText,
      index: 0,
      metadata: {
        startChar: 0,
        endChar: normalizedText.length,
        wordCount: countWords(normalizedText),
      },
    }];
  }

  // Split semplice per versione sincrona
  const chunks: Chunk[] = [];
  const separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ' '];
  
  let remainingText = normalizedText;
  let chunkIndex = 0;
  let startChar = 0;

  while (remainingText.length > 0) {
    let chunkEnd = Math.min(maxChunkSize, remainingText.length);
    
    // Se non siamo alla fine, cerca un separatore naturale
    if (chunkEnd < remainingText.length) {
      for (const separator of separators) {
        const lastIndex = remainingText.lastIndexOf(separator, chunkEnd);
        if (lastIndex > chunkEnd * 0.7) { // Almeno 70% del chunk
          chunkEnd = lastIndex + separator.length;
          break;
        }
      }
    }

    const chunkText = remainingText.substring(0, chunkEnd).trim();
    
    if (chunkText.length >= minChunkSize) {
      chunks.push({
        text: chunkText,
        index: chunkIndex++,
        metadata: {
          startChar,
          endChar: startChar + chunkText.length,
          wordCount: countWords(chunkText),
        },
      });
    }

    // Muovi avanti con overlap
    const moveBy = Math.max(chunkEnd - chunkOverlap, 1);
    remainingText = remainingText.substring(moveBy);
    startChar += moveBy;
  }

  return chunks;
}

/**
 * Conta le parole in un testo
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Estrae il contenuto testuale da un PendingItem in base al tipo
 */
export function extractTextFromPendingItem(item: any): string {
  switch (item.type) {
    case 'text':
      return `${item.content.title ? item.content.title + '\n\n' : ''}${item.content.text || ''}`;
    
    case 'website':
      // Usa il contenuto completo estratto da Readability
      if (item.content.textContent && item.content.textContent.trim().length > 0) {
        // Nuovo formato con contenuto completo
        return `${item.content.title}\n\nSource: ${item.content.url}\n\n${item.content.textContent}`;
      } else {
        // Fallback per vecchi dati (solo titolo + descrizione)
        return `${item.content.title}\n\n${item.content.description || ''}\n\nURL: ${item.content.url}`;
      }
    
    case 'docs':
      return `${item.content.title || item.content.filename}\n\n${item.content.text || ''}`;
    
    case 'qa':
      const questions = item.content.questions.join('\n');
      return `Questions:\n${questions}\n\nAnswer:\n${item.content.answer}`;
    
    case 'notion':
      // TODO: implementare quando avremo Notion integration
      return item.content.text || '';
    
    default:
      return JSON.stringify(item.content);
  }
}

/**
 * Genera chunks ottimizzati per un PendingItem (versione async con LangChain)
 */
export async function chunkPendingItem(
  item: any,
  options: ChunkOptions = {}
): Promise<Chunk[]> {
  const text = extractTextFromPendingItem(item);
  // Passa il tipo di source per chunking adattivo
  const enhancedOptions = {
    ...options,
    sourceType: item.type as ChunkOptions['sourceType'],
  };
  return await chunkText(text, enhancedOptions);
}

/**
 * Versione sincrona di chunkPendingItem per backward compatibility
 */
export function chunkPendingItemSync(
  item: any,
  options: ChunkOptions = {}
): Chunk[] {
  const text = extractTextFromPendingItem(item);
  const enhancedOptions = {
    ...options,
    sourceType: item.type as ChunkOptions['sourceType'],
  };
  return chunkTextSync(text, enhancedOptions);
}

