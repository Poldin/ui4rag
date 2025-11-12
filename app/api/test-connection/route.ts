import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Funzione per fare URL-encoding della password nel connection string
function encodeConnectionString(connStr: string): string {
  try {
    // Parse il connection string
    const url = new URL(connStr);
    
    // Se la password contiene caratteri speciali, encodala
    if (url.password) {
      // Decodifica prima (nel caso sia già encodata parzialmente)
      const decodedPassword = decodeURIComponent(url.password);
      // Poi encodala correttamente
      const encodedPassword = encodeURIComponent(decodedPassword);
      
      // Ricostruisci l'URL con la password encodata
      url.password = encodedPassword;
      return url.toString();
    }
    
    return connStr;
  } catch (error) {
    // Se non è un URL valido, ritorna com'è
    return connStr;
  }
}

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    const body = await request.json();
    let { connectionString } = body;

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    // Gestisci automaticamente l'encoding della password
    connectionString = encodeConnectionString(connectionString);

    // Crea il pool di connessione
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase.co') || connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
      // Timeout breve per il test
      connectionTimeoutMillis: 10000,
      query_timeout: 5000,
    });

    // Test connessione con query semplice
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    
    // Verifica se pgvector è installato
    let pgvectorInstalled = false;
    try {
      await pool.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
      pgvectorInstalled = true;
    } catch (e) {
      pgvectorInstalled = false;
    }

    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      serverTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version,
      pgvectorInstalled,
    });

  } catch (error: any) {
    console.error('Connection test error:', error);
    
    // Messaggio di errore user-friendly
    let errorMessage = 'Failed to connect to database';
    let errorDetails = error.message;

    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Database hostname not found';
      errorDetails = 'Cannot resolve the database hostname. Please verify your connection string is correct.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
      errorDetails = 'Database server refused the connection. Check if the host and port are correct.';
    } else if (error.message.includes('password authentication failed')) {
      errorMessage = 'Authentication failed';
      errorDetails = 'Invalid username or password.';
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      errorMessage = 'Database does not exist';
      errorDetails = error.message;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Connection timeout';
      errorDetails = 'The connection took too long. Check your network or database availability.';
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        code: error.code
      },
      { status: 500 }
    );

  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        console.error('Error closing pool:', e);
      }
    }
  }
}

