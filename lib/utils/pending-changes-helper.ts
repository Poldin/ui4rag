/**
 * Helper per gestire il chunking automatico dei dati quando superano il limite del body size
 */

import { addToPendingChanges, type PendingItem } from '../actions/pending-changes';

// Limite massimo del body size (8MB per sicurezza, lasciando margine rispetto al limite di 10MB)
const MAX_BODY_SIZE = 8 * 1024 * 1024; // 8MB in bytes

/**
 * Stima la dimensione approssimativa di un item in bytes
 */
function estimateItemSize(item: Omit<PendingItem, 'id' | 'addedAt'>): number {
  try {
    // Stima basata sulla serializzazione JSON
    const jsonString = JSON.stringify(item);
    return new Blob([jsonString]).size;
  } catch (error) {
    // Fallback: stima conservativa basata su proprietà chiave
    const contentSize = typeof item.content === 'string' 
      ? item.content.length 
      : JSON.stringify(item.content || {}).length;
    return (
      (item.title?.length || 0) +
      (item.preview?.length || 0) +
      contentSize +
      JSON.stringify(item.metadata || {}).length +
      500 // overhead approssimativo
    );
  }
}

/**
 * Divide gli items in batch che non superano il limite di dimensione
 */
function chunkItems(
  items: Omit<PendingItem, 'id' | 'addedAt'>[]
): Omit<PendingItem, 'id' | 'addedAt'>[][] {
  const batches: Omit<PendingItem, 'id' | 'addedAt'>[][] = [];
  let currentBatch: Omit<PendingItem, 'id' | 'addedAt'>[] = [];
  let currentBatchSize = 0;

  for (const item of items) {
    const itemSize = estimateItemSize(item);
    
    // Se un singolo item supera il limite, lo aggiungiamo comunque (sarà gestito dal limite aumentato)
    if (itemSize > MAX_BODY_SIZE) {
      // Se c'è un batch corrente, salviamolo
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
      // Aggiungi l'item grande come batch singolo
      batches.push([item]);
      continue;
    }

    // Se aggiungere questo item supererebbe il limite, salva il batch corrente
    if (currentBatchSize + itemSize > MAX_BODY_SIZE && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    // Aggiungi l'item al batch corrente
    currentBatch.push(item);
    currentBatchSize += itemSize;
  }

  // Aggiungi l'ultimo batch se non è vuoto
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Aggiunge items a pending_changes con chunking automatico se necessario
 * Questa funzione gestisce automaticamente la divisione in più chiamate se i dati sono troppo grandi
 */
export async function addToPendingChangesWithChunking(
  ragId: string,
  items: Omit<PendingItem, 'id' | 'addedAt'>[]
): Promise<{ success: boolean; error?: string; batchesProcessed?: number }> {
  if (items.length === 0) {
    return { success: true, batchesProcessed: 0 };
  }

  // Stima la dimensione totale
  const totalSize = items.reduce((sum, item) => sum + estimateItemSize(item), 0);
  
  // Se la dimensione totale è sotto il limite, chiama direttamente la funzione originale
  if (totalSize <= MAX_BODY_SIZE) {
    const result = await addToPendingChanges(ragId, items);
    return { ...result, batchesProcessed: 1 };
  }

  // Altrimenti, dividi in batch
  const batches = chunkItems(items);
  console.log(`📦 Dividing ${items.length} items into ${batches.length} batches`);

  let successCount = 0;
  let lastError: string | undefined;

  // Processa ogni batch sequenzialmente
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📤 Processing batch ${i + 1}/${batches.length} with ${batch.length} items`);
    
    try {
      const result = await addToPendingChanges(ragId, batch);
      
      if (result.success) {
        successCount++;
      } else {
        lastError = result.error;
        console.error(`❌ Batch ${i + 1} failed:`, result.error);
        // Continua con gli altri batch anche se uno fallisce
      }
    } catch (error: any) {
      lastError = error.message || 'Unknown error';
      console.error(`❌ Batch ${i + 1} threw error:`, error);
      // Continua con gli altri batch
    }

    // Piccola pausa tra i batch per evitare sovraccarico
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Se almeno un batch è stato processato con successo, considera l'operazione riuscita
  // ma segnala se ci sono stati errori
  if (successCount > 0) {
    if (successCount < batches.length) {
      // Mostra un warning invece di un errore se almeno alcuni batch sono riusciti
      console.warn(`⚠️ Processed ${successCount}/${batches.length} batches successfully. Some batches failed.`);
      return {
        success: true,
        error: `Some batches failed (${successCount}/${batches.length} succeeded). Last error: ${lastError}`,
        batchesProcessed: successCount,
      };
    }
    // Tutti i batch sono riusciti
    if (batches.length > 1) {
      console.log(`✅ Successfully processed all ${batches.length} batches`);
    }
    return {
      success: true,
      batchesProcessed: successCount,
    };
  }

  // Se tutti i batch sono falliti
  return {
    success: false,
    error: lastError || 'All batches failed',
    batchesProcessed: 0,
  };
}

