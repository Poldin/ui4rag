import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Verifica tipo file supportato
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain',
      'text/markdown'
    ];

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const supportedExtensions = ['pdf', 'docx', 'pptx', 'txt', 'md'];

    if (!supportedExtensions.includes(fileExtension || '')) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${supportedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Leggi il contenuto del file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let pages = 1;

    // Parse in base al tipo di file
    if (fileExtension === 'txt' || fileExtension === 'md') {
      // File di testo semplice
      extractedText = buffer.toString('utf-8');
    } else if (fileExtension === 'pdf') {
      // Estrazione reale da PDF usando unpdf (semplice e compatibile con bundler moderni)
      try {
        const { extractText, getDocumentProxy } = await import('unpdf');
        
        // Converti Buffer in Uint8Array (richiesto da pdfjs sotto il cofano)
        const uint8Array = new Uint8Array(buffer);
        
        // Estrai il testo dal PDF - semplicissimo!
        const data = await getDocumentProxy(uint8Array);
        pages = data.numPages;
        
        // Estrai il testo
        const pdfText = await extractText(data, { mergePages: true });
        extractedText = pdfText.text;
      } catch (pdfError: any) {
        console.error('PDF parsing error details:', pdfError);
        throw new Error(`Failed to parse PDF: ${pdfError.message}`);
      }
    } else if (fileExtension === 'docx') {
      // Estrazione reale da DOCX usando mammoth (dynamic import per compatibilità Turbopack)
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        // DOCX non ha un numero di pagine fisso, stimiamo
        pages = Math.ceil(extractedText.length / 3000);
      } catch (docxError: any) {
        throw new Error(`Failed to parse DOCX: ${docxError.message}`);
      }
    } else if (fileExtension === 'pptx') {
      // Estrazione reale da PPTX usando officeparser (dynamic import per compatibilità Turbopack)
      try {
        const officeParser = (await import('officeparser')).default;
        const text = await officeParser.parseOfficeAsync(buffer);
        extractedText = text;
        // PPTX: stimiamo le slide (circa 500 caratteri per slide)
        pages = Math.max(1, Math.ceil(extractedText.length / 500));
      } catch (pptxError: any) {
        throw new Error(`Failed to parse PPTX: ${pptxError.message}`);
      }
    }

    // Validazione: assicurati che il testo sia stato estratto
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the document. The file might be empty or corrupted.');
    }

    // Calcola statistiche
    const wordCount = extractedText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const fileSizeKB = (buffer.length / 1024).toFixed(2);
    const textPreview = extractedText.substring(0, 200).trim() + (extractedText.length > 200 ? '...' : '');

    // Prepara la risposta
    const documentData = {
      filename: file.name,
      fileType: fileExtension,
      fileSize: `${fileSizeKB} KB`,
      fileSizeBytes: buffer.length,
      pages: pages,
      wordCount: wordCount,
      textPreview: textPreview,
      fullText: extractedText,
      // Il titolo è semplicemente il nome del file senza estensione
      title: file.name.replace(/\.[^/.]+$/, '')
    };

    return NextResponse.json({
      success: true,
      document: documentData
    });

  } catch (error: any) {
    console.error('Parse document error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse document' },
      { status: 500 }
    );
  }
}

