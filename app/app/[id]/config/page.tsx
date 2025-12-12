"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { SiSupabase, SiPostgresql, SiPlanetscale, SiCockroachlabs } from "react-icons/si";
import { supabase } from "../../../../lib/supabase";

export default function ConfigPage() {
  const params = useParams();
  const ragId = params.id as string;

  const [dbType, setDbType] = useState<"postgresql">("postgresql");
  const [sourcesTableName, setSourcesTableName] = useState("gimme_rag_sources");
  const [chunksTableName, setChunksTableName] = useState("gimme_rag_chunks");
  const [connectionString, setConnectionString] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [embeddingDimensions, setEmbeddingDimensions] = useState(1536);
  const [copied, setCopied] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [setupStatus, setSetupStatus] = useState<"idle" | "success" | "error">("idle");
  const [setupMessage, setSetupMessage] = useState("");
  const [tablesVerified, setTablesVerified] = useState(false);
  const [verifyingTables, setVerifyingTables] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  // Carica la configurazione dal database
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("rags")
          .select("config")
          .eq("id", ragId)
          .single();

        if (error) throw error;

        if (data?.config) {
          const config = data.config as any;
          console.log('📋 Loaded config from DB:', config);
          setDbType(config.vectorDb || "postgresql");
          setSourcesTableName(config.sourcesTableName || "gimme_rag_sources");
          setChunksTableName(config.chunksTableName || "gimme_rag_chunks");
          setConnectionString(config.connectionString || "");
          setApiKey(config.apiKey || "");
          setEmbeddingModel(config.embeddingModel || "text-embedding-3-small");
          setEmbeddingDimensions(config.embeddingDimensions || 1536);
          console.log('📐 Embedding dimensions loaded:', config.embeddingDimensions || 1536);
        }
      } catch (error) {
        console.error("Error loading config:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [ragId]);

  // Funzione per salvare la configurazione nel database
  // Salva SEMPRE tutto lo stato corrente per evitare perdite
  const saveConfig = async (updates: any = {}) => {
    setSaving(true);
    try {
      // Costruisci la config completa con tutto lo stato corrente
      const fullConfig = {
        vectorDb: dbType,
        connectionString,
        sourcesTableName,
        chunksTableName,
        apiKey,
        embeddingModel,
        embeddingDimensions,
        tableSchemaSQL: sqlCode, // Schema SQL completo come reference
        configLastUpdated: new Date().toISOString(),
        // Sovrascrivi con eventuali updates specifici
        ...updates,
      };

      // Salva nel database
      const { error } = await supabase
        .from("rags")
        .update({ config: fullConfig, updated_at: new Date().toISOString() })
        .eq("id", ragId);

      if (error) throw error;
      
      console.log('💾 Full config saved (including SQL schema):', fullConfig);
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setSaving(false);
    }
  };

  // Check if configuration is complete
  const isConfigComplete = connectionString.trim() !== "" && apiKey.trim() !== "";

  // Available dimensions based on model
  const getDimensionsForModel = (model: string) => {
    switch (model) {
      case "text-embedding-3-small":
        return [512, 1536];
      case "text-embedding-3-large":
        return [1024, 1536, 3072];
      case "text-embedding-ada-002":
        return [1536];
      default:
        return [1536];
    }
  };

  const handleModelChange = (model: string) => {
    setEmbeddingModel(model);
    const availableDims = getDimensionsForModel(model);
    const newDimensions = availableDims[availableDims.length - 1];
    setEmbeddingDimensions(newDimensions);
    
    // Salva nel database
    saveConfig({
      embeddingModel: model,
      embeddingDimensions: newDimensions,
    });
  };

  const sqlCode = `-- Enable pgvector extension (required for vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLE 1: SOURCES (documenti originali)
-- ============================================
CREATE TABLE IF NOT EXISTS public.${sourcesTableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ${sourcesTableName}_source_type_idx 
  ON public.${sourcesTableName}(source_type);

CREATE INDEX IF NOT EXISTS ${sourcesTableName}_created_at_idx 
  ON public.${sourcesTableName}(created_at DESC);

CREATE INDEX IF NOT EXISTS ${sourcesTableName}_metadata_idx 
  ON public.${sourcesTableName} USING GIN(metadata);

-- ============================================
-- TABLE 2: CHUNKS (chunks embedded + FTS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.${chunksTableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.${sourcesTableName}(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(${embeddingDimensions}),
  fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  chunk_index INTEGER NOT NULL,
  chunk_total INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ${chunksTableName}_source_id_idx 
  ON public.${chunksTableName}(source_id);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS ${chunksTableName}_embedding_idx 
  ON public.${chunksTableName} 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-Text Search index
CREATE INDEX IF NOT EXISTS ${chunksTableName}_fts_idx 
  ON public.${chunksTableName} USING GIN(fts);

CREATE INDEX IF NOT EXISTS ${chunksTableName}_source_chunk_idx 
  ON public.${chunksTableName}(source_id, chunk_index);

-- Trigger for updated_at on SOURCES table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_${sourcesTableName}_updated_at ON public.${sourcesTableName};
CREATE TRIGGER update_${sourcesTableName}_updated_at 
  BEFORE UPDATE ON public.${sourcesTableName} 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: hybrid_search (semantic + keyword)
-- ============================================
CREATE OR REPLACE FUNCTION ${chunksTableName}_hybrid_search(
  query_text TEXT,
  query_embedding vector(${embeddingDimensions}),
  match_count INT DEFAULT 5,
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID, source_id UUID, content TEXT, chunk_index INT, chunk_total INT,
  metadata JSONB, source_title TEXT, source_type TEXT, source_metadata JSONB,
  semantic_score FLOAT, keyword_score FLOAT, combined_score FLOAT, match_type TEXT
) AS $$
DECLARE expanded_count INT := match_count * 3;
BEGIN
  RETURN QUERY
  WITH 
  semantic AS (
    SELECT c.id, c.source_id, c.content, c.chunk_index, c.chunk_total, c.metadata,
      s.title as source_title, s.source_type, s.metadata as source_metadata,
      1 - (c.embedding <=> query_embedding) as score
    FROM public.${chunksTableName} c
    JOIN public.${sourcesTableName} s ON c.source_id = s.id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding LIMIT expanded_count
  ),
  keyword AS (
    SELECT c.id, c.source_id, c.content, c.chunk_index, c.chunk_total, c.metadata,
      s.title as source_title, s.source_type, s.metadata as source_metadata,
      ts_rank_cd(c.fts, plainto_tsquery('simple', query_text)) as score
    FROM public.${chunksTableName} c
    JOIN public.${sourcesTableName} s ON c.source_id = s.id
    WHERE c.fts @@ plainto_tsquery('simple', query_text)
    ORDER BY ts_rank_cd(c.fts, plainto_tsquery('simple', query_text)) DESC LIMIT expanded_count
  ),
  semantic_normalized AS (
    SELECT *, score as normalized_score FROM semantic WHERE score >= similarity_threshold
  ),
  keyword_normalized AS (
    SELECT *, CASE WHEN (SELECT MAX(score) FROM keyword) > 0 
      THEN score / (SELECT MAX(score) FROM keyword) ELSE 0 END as normalized_score
    FROM keyword
  ),
  combined AS (
    SELECT COALESCE(s.id, k.id) as id, COALESCE(s.source_id, k.source_id) as source_id,
      COALESCE(s.content, k.content) as content, COALESCE(s.chunk_index, k.chunk_index) as chunk_index,
      COALESCE(s.chunk_total, k.chunk_total) as chunk_total, COALESCE(s.metadata, k.metadata) as metadata,
      COALESCE(s.source_title, k.source_title) as source_title, COALESCE(s.source_type, k.source_type) as source_type,
      COALESCE(s.source_metadata, k.source_metadata) as source_metadata,
      COALESCE(s.normalized_score, 0) as sem_score, COALESCE(k.normalized_score, 0) as kw_score,
      CASE WHEN s.id IS NOT NULL AND k.id IS NOT NULL THEN 'both'
           WHEN s.id IS NOT NULL THEN 'semantic_only' ELSE 'keyword_only' END as match_type
    FROM semantic_normalized s FULL OUTER JOIN keyword_normalized k ON s.id = k.id
  )
  SELECT combined.id, combined.source_id, combined.content, combined.chunk_index, combined.chunk_total,
    combined.metadata, combined.source_title, combined.source_type, combined.source_metadata,
    combined.sem_score::FLOAT, combined.kw_score::FLOAT,
    ((combined.sem_score * semantic_weight) + (combined.kw_score * keyword_weight))::FLOAT,
    combined.match_type
  FROM combined
  WHERE (combined.sem_score * semantic_weight) + (combined.kw_score * keyword_weight) > 0
  ORDER BY combined_score DESC LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: get_chunk_with_context
-- ============================================
CREATE OR REPLACE FUNCTION ${chunksTableName}_get_chunk_with_context(
  target_chunk_id UUID, window_size INT DEFAULT 2
)
RETURNS TABLE (
  id UUID, source_id UUID, content TEXT, chunk_index INT, chunk_total INT,
  metadata JSONB, source_title TEXT, source_type TEXT, is_target BOOLEAN, relative_position INT
) AS $$
DECLARE target_source_id UUID; target_index INT;
BEGIN
  SELECT c.source_id, c.chunk_index INTO target_source_id, target_index
  FROM public.${chunksTableName} c WHERE c.id = target_chunk_id;
  IF target_source_id IS NULL THEN RAISE EXCEPTION 'Chunk not found: %', target_chunk_id; END IF;
  RETURN QUERY
  SELECT c.id, c.source_id, c.content, c.chunk_index, c.chunk_total, c.metadata,
    s.title as source_title, s.source_type, c.chunk_index = target_index as is_target,
    c.chunk_index - target_index as relative_position
  FROM public.${chunksTableName} c
  JOIN public.${sourcesTableName} s ON c.source_id = s.id
  WHERE c.source_id = target_source_id
    AND c.chunk_index BETWEEN (target_index - window_size) AND (target_index + window_size)
  ORDER BY c.chunk_index;
END;
$$ LANGUAGE plpgsql;`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!connectionString) return;
    
    setTestingConnection(true);
    setConnectionStatus("idle");
    setConnectionError("");
    
    try {
      const response = await fetch('/api/test-connection', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionString })
      });

      const data = await response.json();
      
      if (response.ok) {
        setConnectionStatus("success");
        setConnectionError("");
        console.log('Connection test successful:', data);
        setTimeout(() => setConnectionStatus("idle"), 3000);
      } else {
        setConnectionStatus("error");
        setConnectionError(data.details || data.error || 'Connection failed');
        console.error('Connection test failed:', data);
        setTimeout(() => {
          setConnectionStatus("idle");
          setConnectionError("");
        }, 8000);
      }
    } catch (error: any) {
      setConnectionStatus("error");
      setConnectionError(error.message || 'Network error');
      console.error('Connection test error:', error);
      setTimeout(() => {
        setConnectionStatus("idle");
        setConnectionError("");
      }, 8000);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAutoSetup = async () => {
    if (!connectionString || !sourcesTableName || !chunksTableName) return;
    
    console.log('🚀 Creating tables with dimensions:', embeddingDimensions);
    
    setSetupInProgress(true);
    setSetupStatus("idle");
    setSetupMessage("");
    
    try {
      const response = await fetch('/api/setup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionString,
          sourcesTableName,
          chunksTableName,
          embeddingDimensions,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSetupStatus("success");
        setSetupMessage("Database tables created successfully!");
        setTablesVerified(true);
        
        // Salva nella config che le tabelle sono state create
        await saveConfig({
          tablesCreatedAt: new Date().toISOString(),
          tablesVerified: true,
        });
        
        setTimeout(() => {
          setSetupStatus("idle");
          setSetupMessage("");
        }, 5000);
      } else {
        setSetupStatus("error");
        const errorMsg = data.details || data.error || "Failed to create tables";
        // Messaggio più chiaro per errori DNS
        if (errorMsg.includes("ENOTFOUND")) {
          setSetupMessage("Cannot connect to database. Please verify your connection string is correct.");
        } else {
          setSetupMessage(errorMsg);
        }
        setTimeout(() => {
          setSetupStatus("idle");
        }, 10000);
      }
    } catch (error: any) {
      setSetupStatus("error");
      const errorMsg = error.message || "Failed to connect to server";
      // Messaggio più chiaro per errori di rete
      if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("getaddrinfo")) {
        setSetupMessage("Cannot resolve database hostname. Please check your connection string.");
      } else {
        setSetupMessage(errorMsg);
      }
      setTimeout(() => {
        setSetupStatus("idle");
      }, 10000);
    } finally {
      setSetupInProgress(false);
    }
  };

  const handleVerifyTables = async () => {
    if (!connectionString || !sourcesTableName || !chunksTableName) return;
    
    console.log('🔍 Verifying tables with expected dimensions:', embeddingDimensions);
    
    setVerifyingTables(true);
    setVerifyMessage("");
    
    try {
      const response = await fetch('/api/verify-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionString,
          sourcesTableName,
          chunksTableName,
          embeddingDimensions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTablesVerified(true);
        setVerifyMessage(`All set! ${data.sourcesTable.records} sources, ${data.chunksTable.records} chunks`);
      } else {
        setTablesVerified(false);
        setVerifyMessage(data.message || 'Tables not found or misconfigured');
      }

      setTimeout(() => {
        setVerifyMessage("");
      }, 5000);
    } catch (error: any) {
      setTablesVerified(false);
      setVerifyMessage("Failed to verify tables");
      setTimeout(() => {
        setVerifyMessage("");
      }, 5000);
    } finally {
      setVerifyingTables(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Configuration</h1>
          {isConfigComplete ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 border border-gray-800 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-white">Complete</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 border border-gray-300 rounded-md">
              <AlertCircle className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Incomplete</span>
            </div>
          )}
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-3xl space-y-6">
          {/* AI Embeddings Section - First! */}
          <div>
            <h2 className="text-base font-medium text-gray-900 mb-3">AI Embeddings</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure the AI service to generate embeddings from your content. Choose your model and dimensions first.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Provider
                </label>
                <select className="w-fit px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  API Key
                  <span className="text-xs text-gray-500 ml-1.5">
                    (get it from{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      platform.openai.com
                    </a>
                    )
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                        onChange={(e) => {
                          const newApiKey = e.target.value;
                          setApiKey(newApiKey);
                          saveConfig({ apiKey: newApiKey });
                        }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Model
                  </label>
                  <select 
                    value={embeddingModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="text-embedding-3-small">text-embedding-3-small (recommended)</option>
                    <option value="text-embedding-3-large">text-embedding-3-large (best)</option>
                    <option value="text-embedding-ada-002">text-embedding-ada-002 (legacy)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Dimensions
                  </label>
                  <select 
                    value={embeddingDimensions}
                    onChange={(e) => {
                      const newDimensions = Number(e.target.value);
                      setEmbeddingDimensions(newDimensions);
                      saveConfig({ embeddingDimensions: newDimensions });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {getDimensionsForModel(embeddingModel).map(dim => (
                      <option key={dim} value={dim}>
                        {dim} {dim === 1536 && "(standard)"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-700">
                  <strong>Selected configuration:</strong> {embeddingModel} will generate {embeddingDimensions}-dimension vectors. 
                  Your database table will be configured to match these dimensions.
                </p>
              </div>
            </div>
          </div>

          {/* Vector Database Section - Second! */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-medium text-gray-900">Vector Database</h2>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md">
                <SiSupabase className="w-3.5 h-3.5" style={{ color: '#3ECF8E' }} />
                <SiPostgresql className="w-3.5 h-3.5" style={{ color: '#336791' }} />
                <SiPlanetscale className="w-3.5 h-3.5" style={{ color: '#000000' }} />
                <SiCockroachlabs className="w-3.5 h-3.5" style={{ color: '#6933FF' }} />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Configure your PostgreSQL-compatible database (Supabase, PlanetScale, CockroachDB, etc.) to store the {embeddingDimensions}-dimension vectors.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Database Type</label>
                <div className="flex items-center gap-2">
                <select 
                  value={dbType}
                  onChange={(e) => {
                    const newDbType = e.target.value as "postgresql";
                    setDbType(newDbType);
                    saveConfig({ vectorDb: newDbType });
                  }}
                  className="w-fit px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                    <option value="postgresql">PostgreSQL-compatible</option>
                  </select>
                  <div className="flex items-center gap-1.5">
                    <SiPostgresql className="w-4 h-4" style={{ color: '#336791' }} />
                    <SiSupabase className="w-4 h-4" style={{ color: '#3ECF8E' }} />
                    <SiPlanetscale className="w-4 h-4" style={{ color: '#000000' }} />
                    <SiCockroachlabs className="w-4 h-4" style={{ color: '#6933FF' }} />
                  </div>
                </div>
              </div>

              {/* PostgreSQL Configuration */}
              {dbType === "postgresql" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      Connection String
                      <span className="text-xs text-gray-500 ml-1.5">(Supabase, PlanetScale, CockroachDB, PostgreSQL with pgvector)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="postgresql://user:password@host:5432/database"
                        value={connectionString}
                        onChange={(e) => {
                          setConnectionString(e.target.value);
                          setConnectionStatus("idle");
                          setConnectionError("");
                          saveConfig({ connectionString: e.target.value });
                        }}
                        className="w-full px-3 py-2 pr-28 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      {connectionString && (
                        <button
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                          className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {testingConnection && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-600" />}
                          {!testingConnection && connectionStatus === "success" && (
                            <Check className="w-3.5 h-3.5 text-gray-900" />
                          )}
                          {!testingConnection && connectionStatus === "error" && (
                            <X className="w-3.5 h-3.5 text-gray-900" />
                          )}
                          <span className="text-gray-700">
                            {testingConnection ? "testing..." : 
                             connectionStatus === "success" ? "connected" :
                             connectionStatus === "error" ? "failed" :
                             "test"}
                          </span>
                        </button>
                      )}
                    </div>
                    {connectionError && (
                      <div className="mt-2 p-2 bg-gray-50 border border-gray-300 rounded-md">
                        <p className="text-xs text-gray-700">{connectionError}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        Sources Table Name
                      </label>
                      <input
                        type="text"
                        placeholder="gimme_rag_sources"
                        value={sourcesTableName}
                        onChange={(e) => {
                          setSourcesTableName(e.target.value);
                          saveConfig({ sourcesTableName: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        Chunks Table Name
                      </label>
                      <input
                        type="text"
                        placeholder="gimme_rag_chunks"
                        value={chunksTableName}
                        onChange={(e) => {
                          setChunksTableName(e.target.value);
                          saveConfig({ chunksTableName: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Table Schema */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Required Tables Schema</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Run this SQL in your database to create the 2 required tables (sources + chunks):
                        </p>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-800 text-white border border-gray-700 rounded-md hover:bg-gray-700 transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-gray-200" />
                            <span className="text-gray-200">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-gray-300" />
                            <span className="text-gray-100">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs overflow-x-auto">
{sqlCode}
                    </pre>
                    <div className="mt-3 bg-gray-100 border border-gray-300 rounded-md p-3">
                      <p className="text-xs text-gray-700">
                        <strong>💡 Note:</strong> This script enables the <code className="bg-gray-200 px-1 py-0.5 rounded">pgvector</code> extension 
                        (required for vector embeddings). In Supabase, you can run this in the SQL Editor. 
                        The extension is available by default and will be enabled automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

