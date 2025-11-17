import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

interface CrawlOptions {
  url: string;
  maxDepth: number;
  followExternal: boolean;
  maxPages?: number;
}

interface PageData {
  url: string;
  title: string;
  description: string;
  content: string; // ← Contenuto pulito estratto da Readability
  textContent: string; // ← Testo plain senza HTML
  depth: number;
  wordCount: number;
  excerpt?: string; // ← Estratto della pagina
}

// Funzione per normalizzare gli URL
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Rimuove il trailing slash e il fragment
    urlObj.hash = '';
    let normalized = urlObj.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url;
  }
}

// Funzione per verificare se un URL appartiene allo stesso dominio
function isSameDomain(url1: string, url2: string): boolean {
  try {
    const domain1 = new URL(url1).hostname;
    const domain2 = new URL(url2).hostname;
    return domain1 === domain2;
  } catch {
    return false;
  }
}

// Funzione per estrarre tutti i link da una pagina
async function crawlPage(url: string, baseUrl: string, followExternal: boolean): Promise<{ links: string[], pageData: PageData }> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebCrawler/1.0)',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data;
    
    // Usa JSDOM per creare un DOM navigabile per Readability
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Usa Mozilla Readability per estrarre il contenuto principale
    const reader = new Readability(document);
    const article = reader.parse();

    // Fallback con cheerio se Readability non riesce
    const $ = cheerio.load(html);

    let title = 'No title';
    let content = '';
    let textContent = '';
    let excerpt = '';

    if (article) {
      // Readability è riuscito a estrarre il contenuto
      title = article.title || $('title').text().trim() || 'No title';
      content = article.content || ''; // HTML pulito
      textContent = article.textContent || ''; // Testo plain
      excerpt = article.excerpt || '';
    } else {
      // Fallback: usa cheerio per estrarre il contenuto
      title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
      
      // Rimuovi elementi non desiderati
      $('script, style, nav, footer, aside, header, .ad, .advertisement, .social-share').remove();
      
      // Prova a trovare il contenuto principale
      const mainContent = $('article, main, [role="main"], .content, .post-content, .entry-content').first();
      if (mainContent.length > 0) {
        content = mainContent.html() || '';
        textContent = mainContent.text().replace(/\s+/g, ' ').trim();
      } else {
        content = $('body').html() || '';
        textContent = $('body').text().replace(/\s+/g, ' ').trim();
      }
      
      // Genera un excerpt
      excerpt = textContent.substring(0, 300) + (textContent.length > 300 ? '...' : '');
    }

    // Estrae la descrizione (per backward compatibility)
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       excerpt ||
                       'No description';

    // Conta le parole nel contenuto testuale
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    // Estrae tutti i link per il crawling
    const links: string[] = [];
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        // Converte link relativi in assoluti
        const absoluteUrl = new URL(href, url).toString();
        
        // Filtra link non validi
        if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
          // Se non dobbiamo seguire link esterni, verifica che sia stesso dominio
          if (!followExternal && !isSameDomain(absoluteUrl, baseUrl)) {
            return;
          }
          
          const normalized = normalizeUrl(absoluteUrl);
          if (!links.includes(normalized)) {
            links.push(normalized);
          }
        }
      } catch (error) {
        // Ignora link non validi
      }
    });

    return {
      links,
      pageData: {
        url: normalizeUrl(url),
        title,
        description,
        content, // HTML pulito
        textContent, // Testo plain
        excerpt,
        depth: 0, // Verrà impostato dal crawler
        wordCount,
      },
    };
  } catch (error: any) {
    console.error(`Error crawling ${url}:`, error.message);
    return {
      links: [],
      pageData: {
        url: normalizeUrl(url),
        title: 'Error loading page',
        description: error.message,
        content: '',
        textContent: '',
        depth: 0,
        wordCount: 0,
      },
    };
  }
}

// Funzione principale di crawling con callback per streaming
// Ottimizzato con crawling parallelo e concorrenza controllata
async function crawlWebsite(
  options: CrawlOptions,
  onPageFound?: (page: PageData) => void
): Promise<PageData[]> {
  const { url, maxDepth, followExternal, maxPages = 100 } = options;
  
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: normalizeUrl(url), depth: 0 }];
  const results: PageData[] = [];
  const inProgress = new Set<string>();
  const maxConcurrency = 3; // Crawl fino a 3 pagine in parallelo

  // Funzione per processare una singola pagina
  const processPage = async (item: { url: string; depth: number }) => {
    const normalizedUrl = normalizeUrl(item.url);
    
    if (visited.has(normalizedUrl) || inProgress.has(normalizedUrl)) {
      return null;
    }

    visited.add(normalizedUrl);
    inProgress.add(normalizedUrl);

    try {
      console.log(`Crawling (depth ${item.depth}): ${normalizedUrl}`);
      const { links, pageData } = await crawlPage(normalizedUrl, url, followExternal);
      pageData.depth = item.depth;
      
      results.push(pageData);

      // Notifica la callback se fornita (per streaming)
      if (onPageFound) {
        onPageFound(pageData);
      }

      // Aggiungi nuovi link alla coda se non abbiamo superato la profondità massima
      if (item.depth < maxDepth) {
        for (const link of links) {
          const normalizedLink = normalizeUrl(link);
          if (!visited.has(normalizedLink) && !inProgress.has(normalizedLink)) {
            queue.push({ url: normalizedLink, depth: item.depth + 1 });
          }
        }
      }

      return pageData;
    } finally {
      inProgress.delete(normalizedUrl);
    }
  };

  // Crawling con concorrenza controllata
  while ((queue.length > 0 || inProgress.size > 0) && results.length < maxPages) {
    // Prendi i prossimi item da processare (fino a maxConcurrency)
    const batch: { url: string; depth: number }[] = [];
    
    while (batch.length < maxConcurrency && queue.length > 0 && results.length + inProgress.size < maxPages) {
      const item = queue.shift();
      if (item && !visited.has(normalizeUrl(item.url)) && !inProgress.has(normalizeUrl(item.url))) {
        // Verifica profondità prima di aggiungere al batch
        if (item.depth <= maxDepth) {
          batch.push(item);
        }
      }
    }

    // Se non ci sono item da processare ma ci sono ancora richieste in corso, aspetta
    if (batch.length === 0 && inProgress.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    // Se non ci sono né item né richieste in corso, esci
    if (batch.length === 0 && inProgress.size === 0) {
      break;
    }

    // Processa il batch in parallelo
    await Promise.all(batch.map(item => processPage(item)));

    // Piccola pausa per rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, depth, followExternal, stream } = body;

    // Validazione input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Verifica che l'URL sia valido
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Mappa la profondità testuale a numeri
    const depthMap: Record<string, number> = {
      'single': 0,
      '1': 1,
      '2': 2,
      'full': 3,
    };

    const maxDepth = depthMap[depth] ?? 1;

    console.log(`Starting crawl: ${url}, depth: ${maxDepth}, followExternal: ${followExternal}, stream: ${stream}`);

    // Se richiesto lo streaming, usa ReadableStream
    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            await crawlWebsite(
              {
                url,
                maxDepth,
                followExternal: followExternal || false,
                maxPages: 100,
              },
              (page: PageData) => {
                // Invia ogni pagina trovata immediatamente
                const data = JSON.stringify({ type: 'page', data: page }) + '\n';
                controller.enqueue(encoder.encode(data));
              }
            );
            
            // Invia messaggio di completamento
            const doneMessage = JSON.stringify({ type: 'done' }) + '\n';
            controller.enqueue(encoder.encode(doneMessage));
            controller.close();
          } catch (error: any) {
            const errorMessage = JSON.stringify({ 
              type: 'error', 
              error: error.message 
            }) + '\n';
            controller.enqueue(encoder.encode(errorMessage));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Altrimenti, restituisci tutti i risultati alla fine (modalità legacy)
    const results = await crawlWebsite({
      url,
      maxDepth,
      followExternal: followExternal || false,
      maxPages: 100,
    });

    return NextResponse.json({
      success: true,
      pages: results,
      totalPages: results.length,
    });
  } catch (error: any) {
    console.error('Crawl error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

