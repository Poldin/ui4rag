# MCP Server API

Questo folder contiene l'implementazione del **Model Context Protocol (MCP) server** per accesso programmatico alla knowledge base RAG.

## 📁 Struttura

```
/api/mcp/
├── route.ts              # MCP Server (SSE + HTTP transport)
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

Il server supporta **due tipi di transport**:

#### A. SSE Transport (Server-Sent Events)

**`GET /api/mcp`** - Per connessioni da Claude Desktop

**Headers:**
```
Authorization: Bearer mcp_xxxxxxxxxxxxxxxxxxxxx
Accept: text/event-stream
```

**Response:**
- Content-Type: `text/event-stream`
- SSE stream con protocollo MCP JSON-RPC

#### B. HTTP Transport (JSON-RPC 2.0)

**`POST /api/mcp`** - Per integrazioni HTTP standard

**Headers:**
```
Authorization: Bearer mcp_xxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

**Request Format (JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

o per chiamare un tool:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "database configuration",
      "limit": 5,
      "mode": "hybrid"
    }
  }
}
```

**Response Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```

**Metodi disponibili:**
- `tools/list` - Lista tutti i tools disponibili
- `tools/call` - Esegue un tool specifico
- `initialize` - Handshake iniziale (opzionale)

---

## 🔧 Tools Disponibili

### 1. `search` (Primary Tool)

**Hybrid Search** - Combina ricerca semantica (embeddings) + keyword (full-text search).

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `query` | string | required | Query di ricerca |
| `limit` | number | 5 | Numero max risultati |
| `mode` | enum | "hybrid" | `hybrid`, `semantic`, `keyword` |

**Modalità:**
- **`hybrid`** (default): Combina semantic + keyword. Migliore per la maggior parte delle query.
- **`semantic`**: Solo ricerca per similarità concettuale. Utile per parafrasi.
- **`keyword`**: Solo ricerca per termine esatto. Utile per nomi, codici, sigle.

**Response:**
```json
{
  "query": "fondo pensione",
  "mode": "hybrid",
  "count": 3,
  "results": [
    {
      "id": "chunk-uuid",
      "sourceId": "source-uuid",
      "sourceTitle": "Regolamento Byblos",
      "sourceType": "docs",
      "content": "Il Fondo Byblos è un fondo pensione...",
      "chunkIndex": 2,
      "chunkTotal": 15,
      "semanticScore": 85.5,
      "keywordScore": 92.3,
      "combinedScore": 87.5,
      "matchType": "both"
    }
  ]
}
```

**matchType:**
- `both`: Match sia semantico che keyword
- `semantic_only`: Match solo semantico
- `keyword_only`: Match solo keyword

---

### 2. `get_context`

Recupera chunk adiacenti per espandere il contesto di un risultato.

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `chunkId` | string | required | UUID del chunk (da search results) |
| `window` | number | 2 | Chunks prima e dopo da recuperare |

**Response:**
```json
{
  "targetChunkId": "chunk-uuid",
  "window": 2,
  "sourceId": "source-uuid",
  "sourceTitle": "Documento XYZ",
  "chunksRetrieved": 5,
  "chunks": [
    {
      "id": "chunk-1",
      "content": "...",
      "chunkIndex": 0,
      "isTarget": false,
      "relativePosition": -2
    },
    {
      "id": "chunk-2",
      "content": "...",
      "chunkIndex": 2,
      "isTarget": true,
      "relativePosition": 0
    }
  ],
  "concatenatedContent": "Testo completo concatenato..."
}
```

---

### 3. `get_document`

Recupera documento completo con tutti i suoi chunks.

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `sourceId` | string | required | UUID del documento |

---

### 4. `list_sources`

Lista tutti i documenti nella knowledge base.

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Numero max documenti |
| `offset` | number | 0 | Skip per paginazione |

---

### 5. `get_stats`

Statistiche della knowledge base (totale sources, chunks, ecc.).

---

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

---

## 🚀 Usage Examples

### Da Claude Desktop (SSE Transport)

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
"Search in my knowledge base for pension fund regulations"
```

Claude userà automaticamente il tool `search` con hybrid mode.

---

### Da applicazioni HTTP (HTTP Transport)

**1. Lista tools disponibili**

```bash
curl -X POST https://your-app.vercel.app/api/mcp \
  -H "Authorization: Bearer mcp_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**2. Hybrid Search (default)**

```bash
curl -X POST https://your-app.vercel.app/api/mcp \
  -H "Authorization: Bearer mcp_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "query": "Fondo Byblos",
        "limit": 5,
        "mode": "hybrid"
      }
    }
  }'
```

**3. Get Context**

```bash
curl -X POST https://your-app.vercel.app/api/mcp \
  -H "Authorization: Bearer mcp_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_context",
      "arguments": {
        "chunkId": "uuid-del-chunk",
        "window": 2
      }
    }
  }'
```

**4. Esempio JavaScript/TypeScript**

```typescript
async function searchDocs(query: string, apiKey: string, mode: 'hybrid' | 'semantic' | 'keyword' = 'hybrid') {
  const response = await fetch('https://your-app.vercel.app/api/mcp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: { query, limit: 5, mode },
      },
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Usage
const results = await searchDocs('fondo pensione', 'mcp_xxx', 'hybrid');
console.log(results);
```

**5. Esempio Python**

```python
import requests

def search_docs(query: str, api_key: str, mode: str = "hybrid"):
    url = "https://your-app.vercel.app/api/mcp"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "search",
            "arguments": {
                "query": query,
                "limit": 5,
                "mode": mode
            }
        }
    }
    
    response = requests.post(url, headers=headers, json=payload)
    data = response.json()
    
    if "error" in data:
        raise Exception(data["error"]["message"])
    
    return data["result"]

# Usage
results = search_docs("fondo pensione", "mcp_xxx", "hybrid")
print(results)
```

---

## 📊 Monitoring

### Logging

**SSE Transport:**
```
✅ MCP Connection authenticated: { userId, ragId }
🚀 MCP Server connected via SSE
```

**HTTP Transport:**
```
📡 HTTP Transport request received
✅ HTTP Transport authenticated: { userId, ragId }
📥 HTTP Transport request: { method: 'tools/call', id: 1 }
🔧 Executing tool: search
✅ HTTP Transport response: tools/call search
```

### Metrics

Ogni API key traccia:
- `last_used_at` - Aggiornato ad ogni richiesta
- Tool usage count (futuro)
- Error rate (futuro)

---

## 🐛 Error Codes

### HTTP Status Codes

| Code | Message | Causa |
|------|---------|-------|
| 401 | Unauthorized | API key mancante/invalida |
| 400 | Bad Request | Richiesta malformata o config RAG incompleta |
| 404 | Not Found | Metodo non trovato |
| 500 | Internal server error | Errore database o altro |

### JSON-RPC Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON was received |
| -32600 | Invalid Request | The JSON sent is not a valid Request object |
| -32601 | Method not found | The method does not exist / is not available |
| -32602 | Invalid params | Invalid method parameter(s) |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 | Server error | Generic server error (authentication, config, etc.) |

---

## 🔄 Development

### Testing locale

```bash
# Start dev server
npm run dev

# Genera API key dalla UI
http://localhost:3000/app/{ragId}/mcp

# Test SSE Transport (Claude Desktop)
curl -N \
  -H "Authorization: Bearer mcp_xxx" \
  -H "Accept: text/event-stream" \
  http://localhost:3000/api/mcp

# Test HTTP Transport - List tools
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer mcp_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Test HTTP Transport - Hybrid Search
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer mcp_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "query": "test query",
        "limit": 3,
        "mode": "hybrid"
      }
    }
  }'
```

---

## 📚 References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [SSE Transport](https://spec.modelcontextprotocol.io/specification/basic/transports/#server-sent-events-sse)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

---

## 🔄 Transport Selection

Il server determina automaticamente il tipo di transport basandosi sull'header `Accept`:

- **SSE Transport**: `Accept: text/event-stream` → Usa `GET /api/mcp`
- **HTTP Transport**: `Accept: application/json` o assente → Usa `POST /api/mcp`

Entrambi i transport condividono:
- La stessa autenticazione (API key)
- Gli stessi tools disponibili
- La stessa logica di esecuzione

---

**Status:** ✅ Production ready
**Version:** 2.0.0 (Hybrid Search + Unified Tools)
