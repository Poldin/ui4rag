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
      // Per ora simuliamo - in produzione useresti pdf-parse
      // const pdf = require('pdf-parse');
      // const data = await pdf(buffer);
      // extractedText = data.text;
      // pages = data.numpages;
      
      // Simulazione per sviluppo
      extractedText = `[PDF Content from ${file.name}]\n\nThis is simulated PDF content. In production, this would be the actual extracted text from the PDF file using a library like pdf-parse.\n\n`.repeat(10);
      pages = 5;
    } else if (fileExtension === 'docx') {
      // Per ora simuliamo - in produzione useresti mammoth
      // const mammoth = require('mammoth');
      // const result = await mammoth.extractRawText({ buffer });
      // extractedText = result.value;
      
      // Simulazione per sviluppo
      extractedText = `[DOCX Content from ${file.name}]\n\nThis is simulated DOCX content. In production, this would be the actual extracted text from the Word document using a library like mammoth.\n\n`.repeat(8);
      pages = 3;
    } else if (fileExtension === 'pptx') {
      // Per ora simuliamo - in produzione useresti una libreria PPTX
      // Simulazione per sviluppo
      extractedText = `[PPTX Content from ${file.name}]\n\nThis is simulated PowerPoint content. In production, this would be the actual extracted text from the presentation.\n\n`.repeat(6);
      pages = 12;
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
      // Cerca di estrarre un titolo dal contenuto o usa il filename
      title: extractedText.split('\n')[0].substring(0, 100) || file.name.replace(/\.[^/.]+$/, '')
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

