import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { generateDatabaseSchema, DEFAULT_SOURCES_TABLE, DEFAULT_CHUNKS_TABLE } from '../../../lib/ai-sdk/database-schema';

// Funzione per fare URL-encoding della password nel connection string
function encodeConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr);
    if (url.password) {
      const decodedPassword = decodeURIComponent(url.password);
      const encodedPassword = encodeURIComponent(decodedPassword);
      url.password = encodedPassword;
      return url.toString();
    }
    return connStr;
  } catch (error) {
    return connStr;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { connectionString, sourcesTableName, chunksTableName, embeddingDimensions } = body;

    console.log('🔧 Setup Database API received:', {
      sourcesTableName,
      chunksTableName,
      embeddingDimensions,
      hasConnectionString: !!connectionString,
    });

    // Usa defaults se non specificato
    sourcesTableName = sourcesTableName || DEFAULT_SOURCES_TABLE;
    chunksTableName = chunksTableName || DEFAULT_CHUNKS_TABLE;

    if (!connectionString || !embeddingDimensions) {
      return NextResponse.json(
        { error: 'Missing required parameters (connectionString, embeddingDimensions)' },
        { status: 400 }
      );
    }

    // Applica encoding automatico alla password
    connectionString = encodeConnectionString(connectionString);

    // Crea il client PostgreSQL
    const client = new Client({
      connectionString,
      ssl: connectionString.includes('supabase.co') || connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
    });

    try {
      // Connetti al database
      await client.connect();

      console.log('📋 Creating tables:', {
        sources: sourcesTableName,
        chunks: chunksTableName,
        embeddingDimensions,
      });

      // Genera e esegui lo schema SQL con 2 tabelle
      const sqlScript = generateDatabaseSchema(
        sourcesTableName,
        chunksTableName,
        embeddingDimensions
      );

      console.log('📜 SQL Script generated (first 500 chars):');
      console.log(sqlScript.substring(0, 500));
      console.log('...');
      console.log('🔍 Checking embedding line:', sqlScript.match(/embedding.*vector.*\d+/gi));

      // Esegui lo script SQL
      await client.query(sqlScript);

      console.log('✅ Database setup completed successfully');
      console.log('   - Sources table:', sourcesTableName);
      console.log('   - Chunks table:', chunksTableName);

      return NextResponse.json({
        success: true,
        message: 'Database setup completed successfully with 2 tables',
        tables: {
          sources: sourcesTableName,
          chunks: chunksTableName,
        },
      });
    } finally {
      // Chiudi sempre la connessione
      await client.end();
    }
  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { 
        error: 'Database setup failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
