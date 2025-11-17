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
      try {
        extractedText = buffer.toString('utf-8');
        // Se il buffer è vuoto o corrotto, utf-8 potrebbe fallire silenziosamente
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('Text file appears to be empty');
        }
      } catch (txtError: any) {
        throw new Error(`Failed to read text file: ${txtError.message}`);
      }
    } else if (fileExtension === 'pdf') {
      // Estrazione PDF usando unpdf (semplice e funziona bene)
      try {
        const { extractText, getDocumentProxy } = await import('unpdf');
        
        // Converti Buffer in Uint8Array
        const uint8Array = new Uint8Array(buffer);
        
        // Estrai il documento PDF
        const data = await getDocumentProxy(uint8Array);
        pages = data.numPages;
        
        // Estrai tutto il testo dal PDF
        const result = await extractText(data, { mergePages: true });
        extractedText = result.text;
        
        console.log(`PDF parsed: ${pages} pages, ${extractedText.length} characters extracted`);
        
        // Validazione per PDF con poco testo (probabilmente scannerizzati)
        if (!extractedText || extractedText.trim().length < 50) {
          console.warn(`PDF has very little text (${extractedText.trim().length} chars) - likely scanned`);
          
          throw new Error(
            `This PDF appears to be a scanned document (only ${extractedText.trim().length} characters found). ` +
            `Scanned PDFs contain images instead of text. To use this document:\n\n` +
            `• Convert it to text using an OCR tool (Adobe Acrobat, Google Drive, etc.)\n` +
            `• Use a native PDF with selectable text instead\n` +
            `• Or upload the document as images and use an OCR service separately`
          );
        }
      } catch (pdfError: any) {
        console.error('PDF parsing error details:', pdfError);
        // Messaggio più descrittivo
        if (pdfError.message && pdfError.message.includes('password')) {
          throw new Error('This PDF is password-protected. Please provide an unencrypted version.');
        } else if (pdfError.message && pdfError.message.includes('Invalid')) {
          throw new Error('Invalid or corrupted PDF file. Please ensure the file is a valid PDF document.');
        } else {
          throw new Error(`Failed to parse PDF: ${pdfError.message || 'Unknown error'}. The file might be corrupted or use an unsupported PDF format.`);
        }
      }
    } else if (fileExtension === 'docx') {
      // Estrazione DOCX usando mammoth (ben mantenuto e robusto)
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        
        // Verifica messaggi di warning da mammoth
        if (result.messages && result.messages.length > 0) {
          console.log('DOCX parsing warnings:', result.messages);
        }
        
        // DOCX non ha un numero di pagine fisso, stimiamo (circa 3000 caratteri per pagina)
        pages = Math.max(1, Math.ceil(extractedText.length / 3000));
        
        console.log(`DOCX parsed successfully: ~${pages} pages, ${extractedText.length} characters`);
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('DOCX appears to contain no text. The document might contain only images or be empty.');
        }
      } catch (docxError: any) {
        console.error('DOCX parsing error details:', docxError);
        throw new Error(`Failed to parse DOCX: ${docxError.message}. Ensure the file is a valid Word document (.docx format).`);
      }
    } else if (fileExtension === 'pptx') {
      // Estrazione PPTX usando officeparser
      try {
        const officeParser = (await import('officeparser')).default;
        const text = await officeParser.parseOfficeAsync(buffer);
        extractedText = text || '';
        
        // PPTX: stimiamo le slide (circa 500 caratteri per slide in media)
        pages = Math.max(1, Math.ceil(extractedText.length / 500));
        
        console.log(`PPTX parsed successfully: ~${pages} slides, ${extractedText.length} characters`);
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('PowerPoint appears to contain no text. The slides might contain only images or be empty.');
        }
      } catch (pptxError: any) {
        console.error('PPTX parsing error details:', pptxError);
        throw new Error(`Failed to parse PowerPoint: ${pptxError.message}. Ensure the file is a valid PowerPoint presentation (.pptx format).`);
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
      title: file.name.replace(/\.[^/.]+$/, ''),
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

