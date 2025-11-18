/**
 * Utility per dividere documenti grandi in chunk più piccoli
 */

// Dimensione massima per chunk (circa 500KB di testo, lasciando margine per metadata)
const MAX_CHUNK_SIZE = 500 * 1024; // 500KB in bytes

/**
 * Divide il testo di un documento in chunk intelligenti
 * Cerca di dividere per paragrafi o sezioni per mantenere il contesto
 */
export function chunkDocumentText(
  text: string,
  maxChunkSize: number = MAX_CHUNK_SIZE
): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  
  // Dividi per paragrafi (doppio newline)
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    // Se aggiungere questo paragrafo supererebbe il limite
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      // Salva il chunk corrente
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      // Aggiungi il paragrafo al chunk corrente
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
    
    // Se un singolo paragrafo è troppo grande, dividilo per frasi
    if (currentChunk.length > maxChunkSize) {
      const sentences = currentChunk.split(/(?<=[.!?])\s+/);
      let tempChunk = '';
      
      for (const sentence of sentences) {
        if (tempChunk.length + sentence.length > maxChunkSize && tempChunk.length > 0) {
          chunks.push(tempChunk.trim());
          tempChunk = sentence;
        } else {
          tempChunk += (tempChunk ? ' ' : '') + sentence;
        }
      }
      
      currentChunk = tempChunk;
    }
  }
  
  // Aggiungi l'ultimo chunk se non è vuoto
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Crea documenti separati da un documento grande
 */
export interface DocumentChunk {
  title: string;
  preview: string;
  content: {
    filename: string;
    fileType: string;
    pages: number;
    text: string;
    title: string;
    chunkIndex: number;
    totalChunks: number;
  };
  metadata: {
    wordCount: number;
    tokens: number;
    fileSize: string;
    fileSizeBytes: number;
    pages: number;
    chunkIndex: number;
    totalChunks: number;
  };
}

/**
 * Divide un documento grande in più chunk
 */
export function createDocumentChunks(
  originalDoc: {
    filename: string;
    fileType: string;
    pages: number;
    wordCount: number;
    fileSize: string;
    fileSizeBytes: number;
    fullText: string;
    title: string;
  }
): DocumentChunk[] {
  const textChunks = chunkDocumentText(originalDoc.fullText);
  
  // Se il documento non è troppo grande, ritorna un singolo documento
  if (textChunks.length === 1) {
    return [{
      title: originalDoc.title,
      preview: originalDoc.fullText.substring(0, 200).trim() + (originalDoc.fullText.length > 200 ? '...' : ''),
      content: {
        filename: originalDoc.filename,
        fileType: originalDoc.fileType,
        pages: originalDoc.pages,
        text: originalDoc.fullText,
        title: originalDoc.title,
        chunkIndex: 0,
        totalChunks: 1,
      },
      metadata: {
        wordCount: originalDoc.wordCount,
        tokens: Math.ceil(originalDoc.wordCount * 1.33),
        fileSize: originalDoc.fileSize,
        fileSizeBytes: originalDoc.fileSizeBytes,
        pages: originalDoc.pages,
        chunkIndex: 0,
        totalChunks: 1,
      },
    }];
  }
  
  // Crea chunk separati
  return textChunks.map((chunkText, index) => {
    const chunkWordCount = chunkText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chunkTitle = textChunks.length > 1 
      ? `${originalDoc.title} (Part ${index + 1}/${textChunks.length})`
      : originalDoc.title;
    
    return {
      title: chunkTitle,
      preview: chunkText.substring(0, 200).trim() + (chunkText.length > 200 ? '...' : ''),
      content: {
        filename: originalDoc.filename,
        fileType: originalDoc.fileType,
        pages: Math.ceil((originalDoc.pages / textChunks.length) * (index + 1)),
        text: chunkText,
        title: originalDoc.title,
        chunkIndex: index,
        totalChunks: textChunks.length,
      },
      metadata: {
        wordCount: chunkWordCount,
        tokens: Math.ceil(chunkWordCount * 1.33),
        fileSize: `${(chunkText.length / 1024).toFixed(2)} KB`,
        fileSizeBytes: chunkText.length,
        pages: Math.ceil((originalDoc.pages / textChunks.length) * (index + 1)),
        chunkIndex: index,
        totalChunks: textChunks.length,
      },
    };
  });
}

