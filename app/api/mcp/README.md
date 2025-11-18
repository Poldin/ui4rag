# MCP Server API

Questo folder contiene l'implementazione del **Model Context Protocol (MCP) server** per accesso programmatico alla knowledge base RAG.

## 📁 Struttura

```
/api/mcp/
├── route.ts              # MCP Server (SSE transport)
└── keys/
    ├── generate/
    │   └── route.ts      # POST - Genera nuova API key
    ├── list/
    │   └── route.ts      # GET - Lista API keys per RAG
    └── revoke/
        └── route.ts      # POST/DELETE - Revoca/elimina API key
```

## 🔌 Endpoints

### 1. MCP Server (Main)

**`GET /api/mcp`**

Server MCP con transport SSE per connessione da Claude Desktop.

**Headers:**
```
Authorization: Bearer mcp_xxxxxxxxxxxxxxxxxxxxx
Accept: text/event-stream
```

**Response:**
- Content-Type: `text/event-stream`
- SSE stream con protocollo MCP JSON-RPC

**Tools disponibili:**
- `search_docs` - Semantic search
- `get_document` - Recupera documento completo
- `list_sources` - Lista tutti i documenti
- `get_stats` - Statistiche knowledge base

---

### 2. Generate API Key

**`POST /api/mcp/keys/generate`**

Genera una nuova API key per accesso MCP.

**Body:**
```json
{
  "ragId": "uuid-del-rag",
  "name": "Claude Desktop - MacBook (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": "mcp_xxxxxxxxxxxxxxxxxxxxx",
  "keyInfo": {
    "id": "uuid",
    "name": "Claude Desktop - MacBook",
    "created_at": "2024-01-01T00:00:00Z",
    "scopes": ["read"]
  },
  "warning": "Save this API key now. It will not be shown again."
}
```

**⚠️ Importante:** La API key è mostrata SOLO alla creazione!

---

### 3. List API Keys

**`GET /api/mcp/keys/list?ragId=xxx`**

Lista tutte le API keys per un RAG specifico.

**Query Params:**
- `ragId` (required): UUID del RAG

**Response:**
```json
{
  "success": true,
  "keys": [
    {
      "id": "uuid",
      "name": "Claude Desktop - MacBook",
      "created_at": "2024-01-01T00:00:00Z",
      "last_used_at": "2024-01-15T10:30:00Z",
      "is_active": true,
      "scopes": ["read"],
      "metadata": {}
    }
  ]
}
```

---

### 4. Revoke/Delete API Key

**`POST /api/mcp/keys/revoke`** - Disattiva la key (soft delete)

**Body:**
```json
{
  "keyId": "uuid-della-key"
}
```

**`DELETE /api/mcp/keys/revoke`** - Elimina permanentemente

**Body:**
```json
{
  "keyId": "uuid-della-key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key revoked/deleted successfully"
}
```

## 🔐 Sicurezza

### Autenticazione

- **API Keys management** (`/keys/*`): Richiede autenticazione Supabase (cookie-based)
- **MCP Server** (`/api/mcp`): Richiede API key valida nell'header `Authorization`

### API Key Storage

```typescript
// Mai salvata in chiaro!
const apiKey = `mcp_${nanoid(32)}`;
const keyHash = await bcrypt.hash(apiKey, 10);

// Solo l'hash viene salvato nel DB
await supabase
  .from('api_keys')
  .insert({ key_hash: keyHash, ... });
```

### Validazione

```typescript
// Ad ogni richiesta MCP
1. Estrai Bearer token
2. Query tutti gli hash da DB
3. bcrypt.compare(token, hash) per ogni key
4. Se match → autenticato
5. Carica config RAG associato
6. Esegui tool richiesto
```

## 🚀 Usage Example

### Da Claude Desktop

**1. Genera API key dalla UI**
```
Dashboard → MCP → Generate API Key
```

**2. Configura Claude Desktop**
```json
{
  "mcpServers": {
    "gimme-rag": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer mcp_xxxxxxxxxxxxx"
      }
    }
  }
}
```

**3. Usa in Claude**
```
"Search in my knowledge base for database setup instructions"
```

Claude userà automaticamente il tool `search_docs`.

## 📊 Monitoring

### Logging

```typescript
// Connection
✅ MCP Connection authenticated: { userId, ragId }
🚀 MCP Server connected via SSE

// Tool calls
🔍 Tool called: search_docs
📄 Tool called: get_document

// Errors
❌ Authentication failed: Invalid API key
❌ Tool execution error: Database connection failed
```

### Metrics

Ogni API key traccia:
- `last_used_at` - Aggiornato ad ogni richiesta
- Tool usage count (futuro)
- Error rate (futuro)

## 🐛 Error Codes

| Code | Message | Causa |
|------|---------|-------|
| 401 | Unauthorized | API key mancante/invalida |
| 400 | RAG configuration incomplete | Config del RAG non completa |
| 404 | RAG not found | RAG ID non esiste o non appartiene all'user |
| 500 | Internal server error | Errore database o altro |

## 🔄 Development

### Testing locale

```bash
# Start dev server
npm run dev

# Genera API key dalla UI
http://localhost:3000/app/{ragId}/mcp

# Test con curl
curl -N \
  -H "Authorization: Bearer mcp_xxx" \
  -H "Accept: text/event-stream" \
  http://localhost:3000/api/mcp
```

### Debug MCP Protocol

```typescript
// In route.ts aggiungi logging
server.onRequest((request) => {
  console.log('📨 MCP Request:', JSON.stringify(request, null, 2));
});

server.onNotification((notification) => {
  console.log('📢 MCP Notification:', notification);
});
```

## 📚 References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [SSE Transport](https://spec.modelcontextprotocol.io/specification/basic/transports/#server-sent-events-sse)

---

**Status:** ✅ Production ready
**Version:** 1.0.0

