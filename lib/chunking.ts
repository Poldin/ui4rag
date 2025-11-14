/**
 * Funzioni per lo splitting intelligente del contenuto in chunks
 * ottimizzati per la generazione di embeddings
 */

export interface ChunkOptions {
  maxChunkSize?: number;        // Dimensione massima in caratteri (default: 1000)
  chunkOverlap?: number;         // Overlap tra chunks (default: 200)
  minChunkSize?: number;         // Dimensione minima in caratteri (default: 100)
  preserveParagraphs?: boolean;  // Mantieni paragrafi intatti se possibile (default: true)
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
 * Split del testo in chunks con overlap intelligente
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  const {
    maxChunkSize = 1000,
    chunkOverlap = 200,
    minChunkSize = 100,
    preserveParagraphs = true,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];
  
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

  // Split per paragrafi se preserveParagraphs è true
  const paragraphs = preserveParagraphs 
    ? normalizedText.split(/\n\n+/)
    : [normalizedText];

  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    if (!paragraph) continue;

    // Se il paragrafo da solo supera maxChunkSize, lo splittiamo
    if (paragraph.length > maxChunkSize) {
      // Salva il chunk corrente se non vuoto
      if (currentChunk.trim()) {
        chunks.push(createChunk(currentChunk.trim(), chunkIndex++, currentStartChar));
        currentChunk = '';
      }

      // Split del paragrafo lungo per frasi
      const sentenceChunks = splitLongParagraph(paragraph, maxChunkSize, chunkOverlap);
      sentenceChunks.forEach(sentenceChunk => {
        chunks.push(createChunk(sentenceChunk, chunkIndex++, currentStartChar));
        currentStartChar += sentenceChunk.length;
      });
      
      continue;
    }

    // Verifica se aggiungere questo paragrafo supererebbe maxChunkSize
    const potentialChunk = currentChunk 
      ? currentChunk + '\n\n' + paragraph 
      : paragraph;

    if (potentialChunk.length > maxChunkSize && currentChunk.trim()) {
      // Salva il chunk corrente
      chunks.push(createChunk(currentChunk.trim(), chunkIndex++, currentStartChar));
      
      // Inizia un nuovo chunk con overlap
      const overlapText = getOverlapText(currentChunk, chunkOverlap);
      currentChunk = overlapText ? overlapText + '\n\n' + paragraph : paragraph;
      currentStartChar += currentChunk.length - overlapText.length;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Aggiungi l'ultimo chunk se non vuoto
  if (currentChunk.trim() && currentChunk.trim().length >= minChunkSize) {
    chunks.push(createChunk(currentChunk.trim(), chunkIndex++, currentStartChar));
  }

  return chunks;
}

/**
 * Split di un paragrafo lungo per frasi
 */
function splitLongParagraph(
  paragraph: string,
  maxChunkSize: number,
  overlap: number
): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if ((currentChunk + ' ' + trimmedSentence).length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Aggiungi overlap
        const overlapText = getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + ' ' + trimmedSentence;
      } else {
        // La singola frase è troppo lunga, la splittiamo per parole
        chunks.push(...splitByWords(trimmedSentence, maxChunkSize, overlap));
        currentChunk = '';
      }
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + trimmedSentence : trimmedSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split per parole quando anche le frasi sono troppo lunghe
 */
function splitByWords(
  text: string,
  maxChunkSize: number,
  overlap: number
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + ' ' + word).length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        const overlapText = getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + ' ' + word;
      } else {
        // Singola parola troppo lunga, la tronchiamo
        chunks.push(word.substring(0, maxChunkSize));
        currentChunk = word.substring(maxChunkSize);
      }
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + word : word;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Ottiene il testo di overlap dalla fine del chunk precedente
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }

  // Cerca l'ultimo punto/newline nell'area di overlap per mantenere contesto semantico
  const overlapText = text.slice(-overlapSize);
  const lastSentenceEnd = Math.max(
    overlapText.lastIndexOf('. '),
    overlapText.lastIndexOf('\n')
  );

  if (lastSentenceEnd > overlapSize / 2) {
    return overlapText.slice(lastSentenceEnd + 1).trim();
  }

  return overlapText.trim();
}

/**
 * Crea un oggetto Chunk con metadata
 */
function createChunk(text: string, index: number, startChar: number): Chunk {
  return {
    text,
    index,
    metadata: {
      startChar,
      endChar: startChar + text.length,
      wordCount: countWords(text),
    },
  };
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
      return `${item.content.title}\n\n${item.content.description}\n\nURL: ${item.content.url}`;
    
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
 * Genera chunks ottimizzati per un PendingItem
 */
export function chunkPendingItem(
  item: any,
  options: ChunkOptions = {}
): Chunk[] {
  const text = extractTextFromPendingItem(item);
  return chunkText(text, options);
}

