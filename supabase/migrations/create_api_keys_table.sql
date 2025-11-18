-- ============================================
-- MCP API KEYS TABLE
-- ============================================
-- Tabella per gestire API keys per accesso MCP
-- Ogni key è legata a un utente e a uno specifico RAG

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rag_id UUID NOT NULL REFERENCES public.rags(id) ON DELETE CASCADE,
  
  -- API key hash (non salviamo la key in chiaro)
  key_hash TEXT NOT NULL UNIQUE,
  
  -- Metadata
  name TEXT,  -- Nome descrittivo opzionale (es. "Claude Desktop - MacBook")
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Opzionale: scadenza automatica
  is_active BOOLEAN DEFAULT true,
  
  -- Scope e permessi (per future espansioni)
  scopes JSONB DEFAULT '["read"]'::jsonb,
  
  -- Metadata aggiuntiva (es. ultimo IP, user agent, etc.)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_rag_id_idx ON public.api_keys(rag_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON public.api_keys(is_active) WHERE is_active = true;

-- ============================================
-- RLS POLICIES
-- ============================================
-- Gli utenti possono vedere solo le proprie API keys

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono vedere solo le proprie keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Gli utenti possono inserire keys solo per se stessi
CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono aggiornare solo le proprie keys
CREATE POLICY "Users can update their own API keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono eliminare solo le proprie keys
CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CONSTRAINT AGGIUNTIVO
-- ============================================
-- Verifica che il RAG appartenga all'utente
-- (doppia sicurezza oltre a RLS)

ALTER TABLE public.api_keys
  ADD CONSTRAINT api_keys_rag_belongs_to_user
  CHECK (
    EXISTS (
      SELECT 1 FROM public.rags
      WHERE rags.id = rag_id
      AND rags.user_id = api_keys.user_id
    )
  );

-- ============================================
-- FUNZIONE: Auto-cleanup keys scadute
-- ============================================
-- Funzione che può essere chiamata periodicamente per rimuovere keys scadute

CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.api_keys
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTI
-- ============================================

COMMENT ON TABLE public.api_keys IS 'API keys per accesso MCP (Model Context Protocol) ai RAG degli utenti';
COMMENT ON COLUMN public.api_keys.key_hash IS 'Hash bcrypt della API key (non salviamo mai la key in chiaro)';
COMMENT ON COLUMN public.api_keys.scopes IS 'Array di permessi: ["read"] o ["read", "write"]';
COMMENT ON COLUMN public.api_keys.metadata IS 'Metadata addizionale: user_agent, last_ip, usage_count, etc.';

