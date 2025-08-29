# MentraOS LLM 
### Version: 0.4

AI-powered virtual assistant for Mentra smart glasses, deployable to Google Cloud Run and other Node.js platforms.

**Author:** Dr. Robert Li

## Features

- 🎯 **Wake Word Detection** - Responds to "Hey Mentra" and variations
- 🧠 **Multi-LLM Support** - OpenAI GPT-4/5, Anthropic Claude, Google Gemini, Perplexity, Azure OpenAI
- 📍 **Location Aware** - LocationIQ integration for context-aware responses
- 📱 **Notification Processing** - Smart filtering and summarization
- 🔊 **Voice Processing** - Real-time transcription and audio responses
- 📷 **Vision Support** - Photo analysis with multimodal LLMs
- ⚡ **High Performance** - Fast Node.js server with in-memory session storage
- 🐳 **Cloud Ready** - Docker container optimized for Google Cloud Run

## Quick Start

### Prerequisites

- Node.js 18+ (or Bun runtime)
- Google Cloud account (for deployment)
- API keys for your preferred LLM providers
- LocationIQ token (optional, for location services)

### Environment Setup

Set your environment variables using a `.env` file or your deployment platform:

```bash
# Required: Core API keys
AUGMENTOS_API_KEY=your_augmentos_key
PACKAGE_NAME=MentraOS-LLM
PORT=80

# LLM Provider Configuration
LLM_PROVIDER=perplexity
LLM_MODEL=sonar

# API Keys (set only what you need)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
PERPLEXITY_API_KEY=your_perplexity_key

# Optional providers
AZURE_OPENAI_API_KEY=your_azure_key
GOOGLE_API_KEY=your_google_key
LOCATIONIQ_TOKEN=your_locationiq_token
```

### Local Development

```bash
# Install dependencies
bun install
# or
npm install

# Copy configuration templates and customize them
cp cloudrun.yaml.example cloudrun.yaml
cp app-config.example.json your-developer-id.mentraos.app-name_config.json

# Edit both files with your specific values:
# - cloudrun.yaml: Google Cloud project details, container images  
# - *_config.json: App name, publicUrl, permissions, tools

# Start development server
npm run dev
# or
bun run dev

# Build for production
npm run build
```

### Deploy to Google Cloud Run

#### Method 1: Direct from Source (Recommended)

```bash
# Replace PROJECT_ID with your Google Cloud project ID
gcloud config set project YOUR_PROJECT_ID

# Deploy directly from source
npm run deploy:gcloud
```

#### Method 2: Container Image

```bash
# Build and deploy container image
npm run deploy:gcloud:build

# Deploy from container registry
gcloud run deploy mentra-os-llm \
  --image gcr.io/YOUR_PROJECT_ID/mentra-os-llm \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```

#### Set Environment Variables in Cloud Run

After deployment, set your environment variables in Google Cloud Console:

1. Go to [Google Cloud Run Console](https://console.cloud.google.com/run)
2. Click on your **mentra-os-llm** service
3. Click **EDIT & DEPLOY NEW REVISION**
4. Go to **Variables & Secrets** → **Environment Variables**
5. Add your API keys:
   - `AUGMENTOS_API_KEY`
   - `PERPLEXITY_API_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `LOCATIONIQ_TOKEN`
   - `LLM_PROVIDER=perplexity`
   - `LLM_MODEL=sonar`

## API Endpoints

### Health Check
```
GET /health
```
Returns service status, version, and available features.

### Webhook Handler
```
POST /webhook
```
Handles incoming events from MentraOS platform.

### Test Endpoint
```
POST /api/test
```
Test endpoint for validating LLM configuration.

## Architecture

### Core Components

- **MiraAgent**: Main conversational AI agent
- **TranscriptionManager**: Handles voice input and wake word detection  
- **NotificationsManager**: Processes and filters phone notifications
- **LLMProvider**: Manages multiple LLM providers and routing
- **SessionManager**: In-memory session management with automatic cleanup

### Data Flow

1. **Voice Input** → Wake word detection → Transcription processing
2. **Context Building** → Location + Photos + Notifications + History
3. **LLM Processing** → Multi-provider routing with fallbacks
4. **Response** → Text-to-speech + Visual display

### Storage

- **In-Memory Storage**: Fast session management with automatic cleanup
- **Session Data**: Conversation history, user preferences, location context
- **Auto-cleanup**: Old sessions purged automatically every hour
- **Scalable**: Can be extended to use Redis, PostgreSQL, or other persistent storage

## Configuration

### Supported LLM Providers

| Provider | Models | Features |
|----------|--------|----------|
| **Perplexity** | sonar, sonar-pro | Web search, real-time data |
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-5 | Advanced reasoning, vision |
| **Anthropic** | claude-3-5-sonnet, claude-3-5-haiku | Long context, safety |
| **Google** | gemini-pro, gemini-2.0-flash | Multimodal, fast inference |
| **Azure OpenAI** | gpt-4o, gpt-4o-mini | Enterprise compliance |

### Wake Words

The system recognizes variations of "Hey Mentra":
- Primary: "hey mentra", "hi mentra"
- Variations: "hey mantra", "hey mentor", "hey menta"
- Phonetic: "he mentra", "hai mentra", "hei mentra"

## Development

### Local Development

```bash
# Install dependencies
bun install

# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build:node

# Start production server
npm start
```

### Testing

```bash
# Test LLM providers
node test-llm-provider.js

# Health check
curl http://localhost:80/health
```

### Building

```bash
# Build TypeScript for Node.js
npm run build:node

# Build for production (includes TypeScript + bundling)
npm run build
```

## Deployment Options

### Google Cloud Run (Recommended)

```bash
# Deploy from source
npm run deploy:gcloud

# Deploy from container
npm run deploy:gcloud:build
```

### Docker (Local/Other Cloud Providers)

```bash
# Build and run locally
docker build -t mentraos-llm .
docker run -p 80:80 -e AUGMENTOS_API_KEY=your_key mentraos-llm

# Or use docker-compose
npm run prod:detach
```

### Other Platforms

This Node.js application can be deployed to:
- **AWS ECS/Fargate** - Container deployment
- **Azure Container Apps** - Container deployment  
- **Heroku** - Direct Node.js deployment
- **Railway/Render** - Direct Node.js deployment
- **Fly.io** - Container or Node.js deployment

## Monitoring & Debugging

### Google Cloud Run
- View metrics in Google Cloud Console
- Check logs via `gcloud logs tail`
- Monitor performance and scaling

### Local Development
```bash
# View application logs
npm run logs

# Run with debug output
DEBUG=* npm run dev
```

### Troubleshooting

1. **Check environment variables** - Ensure all required API keys are set
2. **Verify API key validity** - Test individual provider endpoints
3. **Check memory limits** - Google Cloud Run default is 512Mi
4. **Monitor request timeouts** - Cloud Run default timeout is 300s

Common issues:
- Missing API keys → Check environment variables
- Memory exceeded → Increase Cloud Run memory allocation
- Cold starts → Consider minimum instances for production

#### "Configuration issue with the AI, contact support" Error

This error indicates the LLM provider failed to initialize. Check the following:

1. **Verify API Keys in Google Secret Manager**:
   ```bash
   # List available secrets
   gcloud secrets list
   
   # Check if specific secret exists and has data
   gcloud secrets versions access latest --secret="PERPLEXITY_API_KEY"
   ```

2. **Check Cloud Run Service Account Permissions**:
   - Ensure the service account has "Secret Manager Secret Accessor" role
   - Default service account: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`

3. **Validate Secret Configuration in cloudrun.yaml**:
   ```yaml
   - name: PERPLEXITY_API_KEY
     valueFrom:
       secretKeyRef:
         key: '1'  # or 'latest'
         name: PERPLEXITY_API_KEY
   ```

4. **Check Cloud Run Logs** for detailed error information:
   ```bash
   gcloud logs read "resource.type=cloud_run_revision" --limit=50 --format="value(textPayload)"
   ```

5. **Test API Key Validity** locally:
   ```bash
   curl -X POST "https://api.perplexity.ai/chat/completions" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "sonar", "messages": [{"role": "user", "content": "test"}]}'
   ```

#### "No query provided" Error

This error occurs when wake word removal results in empty text:
- Check transcription quality and accuracy
- Verify wake word variations are properly configured
- Review audio quality from smart glasses

## Security

- Environment variables for API key storage
- Request validation and sanitization
- Google Cloud IAM integration
- No sensitive data logged or transmitted
- Automatic HTTPS on Google Cloud Run

## Performance

- **Cold start**: <2s (Google Cloud Run gen2)
- **Response time**: 200-2000ms (depending on LLM provider)
- **Memory usage**: ~256Mi baseline, scales with concurrent requests
- **Auto-scaling**: 0 to 100+ instances based on traffic
- **Global deployment**: Available in all Google Cloud regions

## Migration from Cloudflare Workers

This version has been updated to run on Node.js platforms instead of Cloudflare Workers:

### Key Changes
- ✅ Removed Durable Objects → In-memory session management
- ✅ Removed KV storage → Memory-based storage with auto-cleanup
- ✅ Removed Worker-specific APIs → Standard Node.js/Express patterns
- ✅ Added Docker support → Container-ready deployment
- ✅ Added Google Cloud Run config → Native cloud deployment

### Benefits
- 🚀 **Better performance** - No cold start delays from V8 isolates
- 🔧 **More flexibility** - Full Node.js ecosystem access
- 💰 **Cost effective** - Pay for actual usage, not execution time
- 🛠️ **Easier development** - Standard Node.js debugging and tooling

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting guide
- Review Google Cloud Run documentation
