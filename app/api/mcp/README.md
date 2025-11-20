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
    "name": "search_docs_rag",
    "arguments": {
      "query": "database configuration",
      "limit": 5
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

**Tools disponibili:**
- `search_docs_rag` - Semantic search con embeddings (RAG)
- `search_docs_keyword` - Ricerca keyword avanzata con contesto
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
"Search in my knowledge base for database setup instructions"
```

Claude userà automaticamente il tool `search_docs_rag`.

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

**2. Esegui ricerca semantica**

```bash
curl -X POST https://your-app.vercel.app/api/mcp \
  -H "Authorization: Bearer mcp_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_docs_rag",
      "arguments": {
        "query": "Fondo Byblos",
        "limit": 5
      }
    }
  }'
```

**3. Esempio JavaScript/TypeScript**

```typescript
async function searchDocs(query: string, apiKey: string) {
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
        name: 'search_docs_rag',
        arguments: {
          query,
          limit: 5,
        },
      },
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return JSON.parse(data.result.content[0].text);
}
```

**4. Esempio Python**

```python
import requests
import json

def search_docs(query: str, api_key: str):
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
            "name": "search_docs_rag",
            "arguments": {
                "query": query,
                "limit": 5
            }
        }
    }
    
    response = requests.post(url, headers=headers, json=payload)
    data = response.json()
    
    if "error" in data:
        raise Exception(data["error"]["message"])
    
    result_text = data["result"]["content"][0]["text"]
    return json.loads(result_text)
```

## 📊 Monitoring

### Logging

**SSE Transport:**
```typescript
// Connection
✅ MCP Connection authenticated: { userId, ragId }
🚀 MCP Server connected via SSE
```

**HTTP Transport:**
```typescript
// Connection
📡 HTTP Transport request received
✅ HTTP Transport authenticated: { userId, ragId }
📥 HTTP Transport request: { method: 'tools/call', id: 1 }
🔧 Executing tool: search_docs_rag
✅ HTTP Transport response: tools/call search_docs_rag

// Errors
❌ HTTP Transport error: Method not found
❌ HTTP Transport fatal error: Invalid API key
```

### Metrics

Ogni API key traccia:
- `last_used_at` - Aggiornato ad ogni richiesta
- Tool usage count (futuro)
- Error rate (futuro)

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

# Test HTTP Transport - Call tool
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer mcp_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_docs_rag",
      "arguments": {
        "query": "test query",
        "limit": 3
      }
    }
  }'
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
**Version:** 1.1.0 (Added HTTP Transport support)

