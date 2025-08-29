# MentraOS LLM - Free Durable Storage Setup

This guide explains how to set up **SQLite-backed Durable Objects** and KV namespaces for session persistence in your MentraOS LLM deployment. **SQLite storage in Durable Objects is currently free.**

## Prerequisites

- Wrangler CLI installed and authenticated
- Cloudflare Workers account (FREE tier works for SQLite-backed Durable Objects!)

## Setup Process: What Runs Where? 🤔

### 🖥️ **Local Setup (You Run These Once):**

**Step 1: Create KV Namespace**
Run locally to create the namespace:

```bash
npx wrangler kv namespace create mentraos-llm
```

**Expected Output:**
```
🌀 Creating namespace with title "mentraos-llm-mentraos-llm"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "MENTRAOS_LLM", id = "abc123def456" }
```

**Step 2: Update wrangler.toml**
Replace `<GENERATED_NAMESPACE_ID>` in `wrangler.toml` with the actual ID from the command output:

```toml
# Replace this line:
kv_namespaces = [
  { binding = "MENTRAOS_LLM", id = "<GENERATED_NAMESPACE_ID>" }
]

# With your actual namespace ID:
kv_namespaces = [
  { binding = "MENTRAOS_LLM", id = "abc123def456" }
]
```

**Step 3: Create Preview KV Namespace (Optional)**
For local development and preview deployments:

```bash
npx wrangler kv namespace create mentraos-llm --preview
```

Then update wrangler.toml:

```toml
kv_namespaces = [
  { binding = "MENTRAOS_LLM", id = "abc123def456", preview_id = "preview789xyz" }
]
```

**Step 4: Deploy**
Deploy your worker:

```bash
npx wrangler deploy
```

### ☁️ **Automatic Setup (Cloudflare Handles These):**

**SQLite Schema Creation:**
- ✅ Happens automatically when Durable Object is first accessed
- ✅ No manual intervention needed
- ✅ Tables created via `CREATE TABLE IF NOT EXISTS` in SessionManager constructor

**SQLite Migration:**
- ✅ Processed during deployment via `[[migrations]]` in wrangler.toml
- ✅ Enables SQLite backend automatically
- ✅ No additional commands needed

### 📋 **Summary:**
- **You only run commands locally**: KV namespace creation + deployment
- **Cloudflare automatically handles**: SQLite schema, migrations, table creation
- **One-time setup**: Once configured, everything persists automatically

## What This Enables

With durable storage configured, your MentraOS LLM deployment will have:

### ✅ Persistent Features:
- **Conversation History**: Chat context survives worker restarts
- **User Location Context**: Location data persists across sessions  
- **Session Continuity**: Users maintain context even after disconnection
- **Notification History**: Previous notifications are remembered
- **Multi-instance Compatibility**: State shared across worker instances

### 🔧 Session Management:
- Sessions stored in KV with 24-hour TTL
- In-memory cache for active sessions (faster access)
- Automatic cleanup of old sessions
- Durable Object coordination for complex session operations

## Cost Considerations 💰

- **SQLite Storage in Durable Objects**: **🆓 CURRENTLY FREE!** (No billing enabled yet)
- **KV Storage**: ~$0.50/million reads, ~$5/million writes (minimal usage in this setup)
- **Durable Objects Compute**: ~$12.50/million requests + $1.25/hour CPU time
- **Typical Usage**: Most applications will stay well within free tier limits

### 🎉 **Free Storage Benefits:**
- SQLite storage billing is **not yet enabled** for Durable Objects
- Only pay for compute (requests + CPU time)
- Perfect for development and small-scale production use
- Future storage billing will be announced in advance

## Monitoring & Debugging

Check your KV namespace usage in the Cloudflare dashboard:
1. Go to Workers & Pages
2. Select KV
3. Find your `mentraos-llm` namespace
4. Monitor key count and storage usage

## Production Recommendations

1. **Enable Durable Objects billing alerts** in your Cloudflare dashboard
2. **Monitor KV usage** to avoid unexpected charges
3. **Set up error alerting** for failed KV operations
4. **Regular cleanup** of old session data (handled automatically)

## Without Durable Storage

The system will still work but with these limitations:
- Sessions reset on worker restart (every ~15 minutes)
- No conversation history persistence  
- Location context must be re-acquired each session
- No cross-instance state sharing

## Troubleshooting

**KV Permission Issues:**
- Ensure your Cloudflare account has Workers KV enabled
- Check that the namespace ID matches exactly

**Durable Objects Not Available:**
- Durable Objects require a paid Workers plan
- Ensure your account has DO enabled in the dashboard

**High Costs:**
- Review KV access patterns (cache frequently accessed data)
- Monitor Durable Object CPU usage
- Consider implementing data expiration policies
