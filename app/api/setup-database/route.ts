import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

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
    let { connectionString, tableName, embeddingDimensions } = body;

    if (!connectionString || !tableName || !embeddingDimensions) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

      // SQL script da eseguire
      const sqlScript = `
-- Enable pgvector extension (required for vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the documents table
CREATE TABLE IF NOT EXISTS public.${tableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(${embeddingDimensions}),
  title TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx 
  ON public.${tableName} 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON public.${tableName};
CREATE TRIGGER update_${tableName}_updated_at 
  BEFORE UPDATE ON public.${tableName} 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
      `.trim();

      // Esegui lo script SQL
      await client.query(sqlScript);

      return NextResponse.json({
        success: true,
        message: 'Database setup completed successfully',
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

