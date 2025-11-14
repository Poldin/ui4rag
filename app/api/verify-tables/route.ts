import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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
    const { connectionString, sourcesTableName, chunksTableName, embeddingDimensions } = body;

    console.log('🔍 Verify Tables API received:', {
      sourcesTableName,
      chunksTableName,
      embeddingDimensions,
      hasConnectionString: !!connectionString,
    });

    if (!connectionString || !sourcesTableName || !chunksTableName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const encodedConnectionString = encodeConnectionString(connectionString);
    const pool = new Pool({
      connectionString: encodedConnectionString,
      ssl: encodedConnectionString.includes('supabase.co') || encodedConnectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
    });

    try {
      await pool.query('SELECT 1');

      // Verifica esistenza tabella SOURCES
      const sourcesCheck = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [sourcesTableName]
      );

      const sourcesExists = sourcesCheck.rows[0].exists;

      // Verifica esistenza tabella CHUNKS
      const chunksCheck = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [chunksTableName]
      );

      const chunksExists = chunksCheck.rows[0].exists;

      if (!sourcesExists || !chunksExists) {
        return NextResponse.json({
          success: false,
          exists: false,
          sourcesExists,
          chunksExists,
          message: `Missing tables: ${!sourcesExists ? sourcesTableName : ''} ${!chunksExists ? chunksTableName : ''}`.trim(),
        });
      }

      // Verifica struttura tabella SOURCES
      const sourcesColumns = await pool.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = $1`,
        [sourcesTableName]
      );

      const requiredSourcesColumns = ['id', 'title', 'content', 'source_type', 'metadata', 'created_at', 'updated_at'];
      const sourcesColumnNames = sourcesColumns.rows.map((r: any) => r.column_name);
      const missingSourcesColumns = requiredSourcesColumns.filter(col => !sourcesColumnNames.includes(col));

      // Verifica struttura tabella CHUNKS
      const chunksColumns = await pool.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = $1`,
        [chunksTableName]
      );

      const requiredChunksColumns = ['id', 'source_id', 'content', 'embedding', 'chunk_index', 'chunk_total', 'metadata', 'created_at'];
      const chunksColumnNames = chunksColumns.rows.map((r: any) => r.column_name);
      const missingChunksColumns = requiredChunksColumns.filter(col => !chunksColumnNames.includes(col));

      if (missingSourcesColumns.length > 0 || missingChunksColumns.length > 0) {
        return NextResponse.json({
          success: false,
          exists: true,
          validStructure: false,
          missingSourcesColumns,
          missingChunksColumns,
          message: 'Tables exist but structure is incomplete',
        });
      }

      // Verifica dimensioni vector se specificato
      if (embeddingDimensions) {
        const vectorDimCheck = await pool.query(
          `SELECT atttypmod 
           FROM pg_attribute 
           WHERE attrelid = $1::regclass 
           AND attname = 'embedding'`,
          [`public.${chunksTableName}`]
        );

        if (vectorDimCheck.rows.length > 0) {
          const rawTypmod = vectorDimCheck.rows[0].atttypmod;
          const actualDimensions = rawTypmod; // pgvector stores dimensions directly in typmod
          
          console.log('📏 Vector dimensions check:', {
            rawTypmod,
            actualDimensions,
            expected: embeddingDimensions,
            match: actualDimensions === embeddingDimensions,
          });
          
          if (actualDimensions !== embeddingDimensions) {
            console.error('❌ DIMENSION MISMATCH!', {
              expected: embeddingDimensions,
              actual: actualDimensions,
            });
            
            return NextResponse.json({
              success: false,
              exists: true,
              validStructure: true,
              dimensionMismatch: true,
              expectedDimensions: embeddingDimensions,
              actualDimensions,
              message: `Vector dimensions mismatch: expected ${embeddingDimensions}, found ${actualDimensions}`,
            });
          }
        }
      }

      // Verifica foreign key
      const fkCheck = await pool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM information_schema.table_constraints 
          WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = $1
          AND constraint_name LIKE '%source_id%'
        )`,
        [chunksTableName]
      );

      const hasForeignKey = fkCheck.rows[0].exists;

      // Conta records
      const sourcesCount = await pool.query(`SELECT COUNT(*) as count FROM ${sourcesTableName}`);
      const chunksCount = await pool.query(`SELECT COUNT(*) as count FROM ${chunksTableName}`);

      return NextResponse.json({
        success: true,
        exists: true,
        validStructure: true,
        hasForeignKey,
        sourcesTable: {
          name: sourcesTableName,
          columns: sourcesColumns.rows.length,
          records: parseInt(sourcesCount.rows[0].count),
        },
        chunksTable: {
          name: chunksTableName,
          columns: chunksColumns.rows.length,
          records: parseInt(chunksCount.rows[0].count),
          embeddingDimensions: embeddingDimensions || 'not verified',
        },
        message: 'Tables are correctly configured',
      });

    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error('Verify tables error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify tables', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

