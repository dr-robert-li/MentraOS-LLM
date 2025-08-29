# MentraOS - AI-Powered Smart Glasses Platform

MentraOS is a comprehensive AI-powered platform for smart glasses that provides contextual assistance by integrating notifications, location data, and multiple LLM providers. Built for [MentraOS](https://docs.mentra.glass/), the smart glasses operating system, it offers intelligent notification filtering, location-aware responses, and search-enhanced AI capabilities.

## 🎯 Features

### 🤖 **Multi-LLM Provider Support**
- **OpenAI**: GPT-4o, GPT-4o-mini, **GPT-5** ✨, **GPT-5-mini** ✨
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 4
- **Google**: Gemini Pro, Gemini 2.0 Flash, Gemini 2.0 Pro
- **Azure OpenAI**: Enterprise-grade OpenAI models including GPT-5
- **Perplexity**: Search-enhanced AI with Sonar and Sonar Pro models

### 🔔 **Intelligent Notification Management**
- **Smart filtering** and ranking (1-10 importance scale)
- **Contextual summaries** for HUD display (under 50 characters)
- **Personal message prioritization** from known contacts
- **Deadline and reminder alerts** with highest priority
- **System notification filtering** (excludes non-essential alerts)

### 📍 **Location-Aware Intelligence**
- **Real-time location tracking** with reverse geocoding
- **Timezone-aware responses** and time conversions
- **Location-specific search results** and recommendations
- **Graceful fallbacks** when location services fail
- **DST (Daylight Saving Time) handling**

### 🔍 **Enhanced Search Capabilities**
- **Web search integration** via Jina AI
- **Location-context search** for relevant results
- **Agent-accessible search tools** for research tasks

## 🏗️ Architecture

### **Core Agents**
- **MiraAgent**: Primary AI assistant with contextual awareness
- **NotificationFilterAgent**: Intelligent notification processing
- **NewsAgent**: News and current events integration
- **AgentGateKeeper**: Request routing and management

### **Deployment Options**
- **Cloudflare Workers**: Serverless edge deployment
- **Docker**: Containerized local/cloud deployment
- **Express.js**: Development server with hot reload

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ or Bun 1.2+
- API keys for your chosen LLM provider(s)
- LocationIQ API key (for location services)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd MentraOS-LLM

# Install dependencies
bun install
# or
npm install

# Copy environment template
cp .env.example .env
```

### Environment Configuration

Edit your `.env` file with the required API keys:

```bash
# LLM Provider Selection
LLM_PROVIDER=openai  # openai, anthropic, azure, google, perplexity
LLM_MODEL=gpt-4o     # See LLMModel enum for available models

# API Keys (set only what you need)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
PERPLEXITY_API_KEY=your_perplexity_key

# Azure OpenAI (if using Azure)
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_API_INSTANCE_NAME=your_instance
AZURE_OPENAI_API_DEPLOYMENT_NAME=your_deployment

# Google Cloud (if using Google models)
GOOGLE_API_KEY=your_google_key
GOOGLE_PROJECT_ID=your_project_id

# Location Services
LOCATIONIQ_TOKEN=your_locationiq_key

# AugmentOS Integration
AUGMENTOS_API_KEY=your_augmentos_key
CLOUD_HOST_NAME=prod.augmentos.org
```

### Development

```bash
# Start development server with hot reload
bun run dev
# or
npm run dev

# Run with Docker
npm run docker:dev

# Test LLM providers
node test-llm-provider.js
```

### Production Deployment

#### Cloudflare Workers
```bash
# Build for Workers
npm run build:worker

# Deploy to production
npm run deploy:prod

# Deploy to development
npm run deploy:dev
```

#### Docker
```bash
# Build production image
npm run image:build

# Run production container
npm run prod
```

## 📱 API Endpoints

### Health Check
```http
GET /health
```

### API Information
```http
GET /api/info
```

### MentraOS Webhook (NEW!)
```http
POST /webhook
Content-Type: application/json

{
  "type": "notification",
  "notifications": [...],
  "timestamp": "2025-08-29T09:00:00Z"
}
```

**Supported Event Types:**
- `notification` - Smart glasses notification events
- `location` - User location updates  
- `user_context` - Context changes (notifications, location, etc.)
- `health_check` - MentraOS health checks

### API Testing
```http
POST /api/test
Content-Type: application/json

{
  "provider": "perplexity",
  "model": "sonar",
  "message": "What's the weather like today?"
}
```

## 🧪 Testing

```bash
# Run comprehensive LLM provider tests
npm test

# Test specific configuration
node simple-test.js

# Lint code
npm run lint
```

## 📚 Supported Models

### OpenAI
- `gpt-4o` - GPT-4 Omni
- `gpt-4o-mini` - GPT-4 Omni Mini
- `gpt-5` - **GPT-5** ✨ - Latest flagship model with enhanced reasoning
- `gpt-5-mini` - **GPT-5 Mini** ✨ - Efficient version of GPT-5

### Anthropic
- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet
- `claude-3-5-haiku-20241022` - Claude 3.5 Haiku
- `claude-3-5-sonnet-20250108` - Claude 4/Latest Sonnet

### Google
- `gemini-pro` - Gemini Pro
- `gemini-2.0-flash-exp` - Gemini 2.0 Flash
- `gemini-2.0-flash-thinking-exp` - Gemini 2.0 Pro

### Perplexity
- `sonar` - Perplexity Sonar (search-enhanced)
- `sonar-pro` - Perplexity Sonar Pro (advanced search)

## 🆕 **GPT-5 Integration Notes**

### **Latest Features**
- **Enhanced Reasoning**: GPT-5 offers significantly improved reasoning capabilities
- **New Parameters**: Supports `reasoning_effort` and `verbosity` controls
- **Streaming Updates**: New delta format for tool calls and responses

### **LangChain Compatibility**
- ✅ **Supported**: GPT-5 and GPT-5-mini work with latest `@langchain/openai` package
- ⚠️ **Breaking Changes**: Some parameters like `temperature` may be modified or dropped
- 🔄 **Active Development**: LangChain TypeScript SDK is actively being updated for full compatibility

### **Best Practices**
- Use the latest `@langchain/openai` package version
- Test thoroughly when using advanced features like verbosity control
- Monitor LangChain releases for GPT-5 compatibility improvements
- Be prepared for parameter adjustments as the API evolves

## 🔧 Configuration

### Notification Filtering
Notifications are automatically ranked by importance:
1. **High Priority (1-3)**: Deadlines, reminders, critical alerts
2. **Medium Priority (4-6)**: Personal messages from known contacts
3. **Low Priority (7-10)**: General notifications and updates

### Location Services
- Automatic location updates from smart glasses
- Reverse geocoding for city/state/country
- Timezone detection and conversion
- Fallback to default location if services fail

### Search Integration
- Web search via Jina AI
- Optional location context for relevant results
- Academic research and current events support

## 🛠️ Development

### Project Structure
```
src/
├── agents/          # AI agents and tools
├── utils/           # LLM providers and utilities
├── public/          # Static assets
├── index.ts         # Express server entry point
└── worker.ts        # Cloudflare Workers entry point
```

### Adding New LLM Providers
1. Add to `LLMService` enum
2. Add models to `LLMModel` enum
3. Implement provider logic in `LLMProvider.getLLM()`
4. Add environment variables
5. Update tests and documentation

## 📄 License

[License details here]

## 🤝 Contributing

[Contributing guidelines here]

---

**MentraOS** - Intelligent contextual assistance for smart glasses, powered by cutting-edge AI technology.
