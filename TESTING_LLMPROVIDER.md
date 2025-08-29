# Testing the Updated LLMProvider

This document explains how to test the updated LLMProvider with the latest AI models.

## What Was Updated

The LLMProvider has been updated to support the latest AI models:

### New Models Added:
- **OpenAI GPT-5**: `gpt-5`
- **Anthropic Claude 4** (Latest Sonnet): `claude-3-5-sonnet-20250108`
- **Anthropic Claude 3.5 Sonnet**: `claude-3-5-sonnet-20241022`
- **Anthropic Claude 3.5 Haiku**: `claude-3-5-haiku-20241022`
- **Google Gemini 2.0 Flash**: `gemini-2.0-flash-exp`
- **Google Gemini 2.0 Pro**: `gemini-2.0-flash-thinking-exp`
- **Perplexity Sonar**: `sonar`
- **Perplexity Sonar Pro**: `sonar-pro`

### New Provider Support:
- **Google Vertex AI**: Full integration with Google Cloud's Vertex AI platform
- **Perplexity**: Full integration with Perplexity AI's search-enhanced models

### Updated Configuration:
- Azure OpenAI API version updated to `2024-02-15-preview`
- New environment variables for Google Cloud integration

## Environment Variables

To use the updated LLMProvider, you'll need to set the appropriate environment variables in your `.env` file:

```bash
# Choose your LLM provider
LLM_PROVIDER=openai  # or 'azure', 'anthropic', 'google', 'perplexity'

# Choose your model
LLM_MODEL=gpt-5  # or any of the supported models

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_api_key
AZURE_OPENAI_API_INSTANCE_NAME=your_instance_name
AZURE_OPENAI_API_DEPLOYMENT_NAME=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google Cloud Configuration
GOOGLE_API_KEY=your_google_api_key
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_LOCATION=us-central1  # or your preferred region

# Perplexity Configuration (NEW)
PERPLEXITY_API_KEY=your_perplexity_api_key
```

## Testing Methods

### 1. Configuration Validation (Completed ✅)
Run the simple validation test to verify all updates are in place:
```bash
node simple-test.js
```

### 2. Build Test (When Resources Allow)
Build the TypeScript project:
```bash
npm install typescript --save-dev
npx tsc
```

### 3. Integration Test (When Built)
Run the comprehensive test suite:
```bash
node test-llm-provider.js
```

### 4. Runtime Test
Test with the actual application by setting environment variables and running:
```bash
npm run dev
```

## Supported Model Configurations

### OpenAI Models
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o        # GPT-4o
LLM_MODEL=gpt-4o-mini   # GPT-4o Mini
LLM_MODEL=gpt-5         # GPT-5 (NEW)
```

### Anthropic Models
```bash
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022    # Claude 3.5 Sonnet
LLM_MODEL=claude-3-5-haiku-20241022     # Claude 3.5 Haiku (NEW)
LLM_MODEL=claude-3-5-sonnet-20250108    # Claude 4/Latest Sonnet (NEW)
```

### Google Models
```bash
LLM_PROVIDER=google     # NEW PROVIDER
LLM_MODEL=gemini-pro                        # Gemini Pro
LLM_MODEL=gemini-2.0-flash-exp             # Gemini 2.0 Flash (NEW)
LLM_MODEL=gemini-2.0-flash-thinking-exp    # Gemini 2.0 Pro (NEW)
```

### Azure OpenAI Models
```bash
LLM_PROVIDER=azure
LLM_MODEL=gpt-4o        # GPT-4o
LLM_MODEL=gpt-4o-mini   # GPT-4o Mini
LLM_MODEL=gpt-5         # GPT-5 (NEW)
```

### Perplexity Models
```bash
LLM_PROVIDER=perplexity     # NEW PROVIDER
LLM_MODEL=sonar             # Perplexity Sonar (NEW)
LLM_MODEL=sonar-pro         # Perplexity Sonar Pro (NEW)
```

## Error Handling

The updated LLMProvider includes proper error handling for:
- Unsupported models for each provider
- Missing API keys
- Invalid provider configurations
- Network connectivity issues

## Next Steps

1. **Set Environment Variables**: Configure your `.env` file with the appropriate API keys
2. **Choose Your Model**: Select from the latest available models
3. **Test Integration**: Run the application to verify everything works
4. **Monitor Performance**: Compare performance across different models

## Notes

- GPT-5 availability depends on OpenAI's release schedule
- Google Vertex AI requires proper Google Cloud setup and authentication
- Some models may have different pricing structures
- Always check the latest API documentation for model availability and features
