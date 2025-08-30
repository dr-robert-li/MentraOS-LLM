import { ChatOpenAI } from "@langchain/openai";
import { AzureChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatPerplexity } from "@langchain/community/chat_models/perplexity";

const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || "";
const AZURE_OPENAI_API_INSTANCE_NAME = process.env.AZURE_OPENAI_API_INSTANCE_NAME || "";
const AZURE_OPENAI_API_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "";
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || "";
const GOOGLE_LOCATION = process.env.GOOGLE_LOCATION || "us-central1";
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

// LLM Configuration
// Need to define LLMModel enum for the switch case in LLMProvider
export enum LLMModel {
  // OpenAI Models
  GPT5 = 'gpt-5',
  GPT5_MINI = 'gpt-5-mini',
  GPT5_NANO = 'gpt-5-nano',
  
  // Anthropic Models
  CLAUDE_OPUS_4_1 = 'claude-opus-4-1-20250805',
  CLAUDE_OPUS_4 = 'claude-opus-4-20250514',
  CLAUDE_SONNET_4 = 'claude-sonnet-4-20250514',
  CLAUDE_SONNET_3_7 = 'claude-3-7-sonnet-20250219',
  CLAUDE_HAIKU_3_5 = 'claude-3-5-haiku-20241022',
  
  // Google Models
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_2_5_FLASH = 'models/gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE = 'models/gemini-2.5-flash-lite',
  GEMINI_2_FLASH = 'gemini-2.0-flash-exp',
  GEMINI_2_PRO = 'gemini-2.0-flash-thinking-exp',
  
  // Perplexity Models
  SONAR = 'sonar',
  SONAR_PRO = 'sonar-pro',
}

export enum LLMService {
  AZURE = 'azure',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  PERPLEXITY = 'perplexity',
}

export const LLM_MODEL = process.env.LLM_MODEL || LLMModel.GPT5;
export const LLM_PROVIDER = process.env.LLM_PROVIDER || LLMService.AZURE;

import { AppSession } from "@mentra/sdk";

export class LLMProvider {
  // Cache to store LLM instances by session ID to avoid recreation
  private static llmCache = new Map<string, any>();
  
  /**
   * Invalidates the LLM cache for a specific session or all sessions
   */
  static invalidateCache(sessionId?: string) {
    if (sessionId) {
      this.llmCache.delete(sessionId);
      console.log(`LLMProvider: Invalidated cache for session ${sessionId}`);
    } else {
      this.llmCache.clear();
      console.log("LLMProvider: Invalidated all cached LLM instances");
    }
  }

  static getLLM(session?: AppSession) {
    try {
      // Priority order: User settings > Environment variables > Defaults
      const provider = LLMProvider.getSettingWithFallback(session, "llm_provider", process.env.LLM_PROVIDER, LLMService.PERPLEXITY) as LLMService;
      const model = LLMProvider.getSettingWithFallback(session, "llm_model", process.env.LLM_MODEL, LLMModel.CLAUDE_SONNET_4) as LLMModel;
      
      // Log the source of configuration for debugging
      if (session) {
        console.log(`LLMProvider: Using provider='${provider}' from ${LLMProvider.getSettingSource(session, "llm_provider", process.env.LLM_PROVIDER)}`);
        console.log(`LLMProvider: Using model='${model}' from ${LLMProvider.getSettingSource(session, "llm_model", process.env.LLM_MODEL)}`);
      }

      // Validate provider and model before proceeding
      if (!provider || !model) {
        console.warn("LLMProvider: Missing provider or model, falling back to defaults");
        return LLMProvider.createDefaultLLM();
      }

      const supportedAzureModels = [
        LLMModel.GPT5,
        LLMModel.GPT5_MINI,
        LLMModel.GPT5_NANO,
      ]
      const supportedOpenAIModels = [
        LLMModel.GPT5,
        LLMModel.GPT5_MINI,
        LLMModel.GPT5_NANO,
      ]
      const supportedAnthropicModels = [
        LLMModel.CLAUDE_OPUS_4_1,
        LLMModel.CLAUDE_OPUS_4,
        LLMModel.CLAUDE_SONNET_4,
        LLMModel.CLAUDE_SONNET_3_7,
        LLMModel.CLAUDE_HAIKU_3_5,
      ]
      const supportedGoogleModels = [
        LLMModel.GEMINI_2_5_PRO,
        LLMModel.GEMINI_2_5_FLASH,
        LLMModel.GEMINI_2_5_FLASH_LITE,
        LLMModel.GEMINI_2_FLASH,
        LLMModel.GEMINI_2_PRO,
      ]
      const supportedPerplexityModels = [
        LLMModel.SONAR,
        LLMModel.SONAR_PRO,
      ]

      if (provider === LLMService.AZURE) {
        if (!supportedAzureModels.includes(model as LLMModel)) {
          console.warn(`Unsupported Azure model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = LLMProvider.resolveApiKey(session, "llm_api_key", AZURE_OPENAI_API_KEY, "Azure OpenAI", "azure");
        if (!apiKey) {
          console.warn("Azure API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        try {
          return new AzureChatOpenAI({
            modelName: model,
            temperature: 0.3,
            maxTokens: 300,
            azureOpenAIApiKey: apiKey,
            azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
            azureOpenAIApiInstanceName: AZURE_OPENAI_API_INSTANCE_NAME,
            azureOpenAIApiDeploymentName: AZURE_OPENAI_API_DEPLOYMENT_NAME,
          });
        } catch (error) {
          console.error("Failed to create Azure OpenAI instance:", error);
          console.warn("Falling back to default LLM due to Azure initialization error");
          return LLMProvider.createDefaultLLM();
        }
      } else if (provider === LLMService.OPENAI) {
        if (!supportedOpenAIModels.includes(model as LLMModel)) {
          console.warn(`Unsupported OpenAI model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = LLMProvider.resolveApiKey(session, "llm_api_key", OPENAI_API_KEY, "OpenAI", "openai");
        if (!apiKey) {
          console.warn("OpenAI API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        try {
          return new ChatOpenAI({
            modelName: model,
            temperature: 0.3,
            maxTokens: 300,
            openAIApiKey: apiKey,
          });
        } catch (error) {
          console.error("Failed to create OpenAI instance:", error);
          console.warn("Falling back to default LLM due to OpenAI initialization error");
          return LLMProvider.createDefaultLLM();
        }
      } else if (provider === LLMService.ANTHROPIC) {
        if (!supportedAnthropicModels.includes(model as LLMModel)) {
          console.warn(`Unsupported Anthropic model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = LLMProvider.resolveApiKey(session, "llm_api_key", ANTHROPIC_API_KEY, "Anthropic", "anthropic");
        if (!apiKey) {
          console.warn("Anthropic API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        try {
          return new ChatAnthropic({
            modelName: model,
            temperature: 0.3,
            maxTokens: 300,
            anthropicApiKey: apiKey,
          });
        } catch (error) {
          console.error("Failed to create Anthropic instance:", error);
          console.warn("Falling back to default LLM due to Anthropic initialization error");
          return LLMProvider.createDefaultLLM();
        }
      } else if (provider === LLMService.GOOGLE) {
        if (!supportedGoogleModels.includes(model as LLMModel)) {
          console.warn(`Unsupported Google model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = LLMProvider.resolveApiKey(session, "llm_api_key", GOOGLE_API_KEY, "Google", "google");
        if (!apiKey) {
          console.warn("Google API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        try {
          return new ChatVertexAI({
            model: model,
            temperature: 0.3,
            maxOutputTokens: 300,
            authOptions: {
              credentials: { private_key: apiKey },
            },
            location: GOOGLE_LOCATION,
          });
        } catch (error) {
          console.error("Failed to create Google Vertex AI instance:", error);
          console.warn("Falling back to default LLM due to Google initialization error");
          return LLMProvider.createDefaultLLM();
        }
      } else if (provider === LLMService.PERPLEXITY) {
        if (!supportedPerplexityModels.includes(model as LLMModel)) {
          console.warn(`Unsupported Perplexity model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = LLMProvider.resolveApiKey(session, "llm_api_key", PERPLEXITY_API_KEY, "Perplexity", "perplexity");
        if (!apiKey) {
          console.warn("Perplexity API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        try {
          return new ChatPerplexity({
            model: model,
            temperature: 0.3,
            maxTokens: 300,
            apiKey: apiKey,
          });
        } catch (error) {
          console.error("Failed to create Perplexity instance:", error);
          console.warn("Falling back to default LLM due to Perplexity initialization error");
          return LLMProvider.createDefaultLLM();
        }
      } else {
        console.warn(`Unsupported LLM provider: ${provider}, falling back to default`);
        return LLMProvider.createDefaultLLM();
      }
    } catch (error) {
      console.error("LLMProvider error:", error);
      console.warn("Falling back to default LLM due to initialization error");
      return LLMProvider.createDefaultLLM();
    }
  }

  /**
   * Creates a safe default LLM that won't crash the app
   */
  private static createDefaultLLM() {
    try {
      // Try Perplexity with environment key first
      if (PERPLEXITY_API_KEY) {
        return new ChatPerplexity({
          model: LLMModel.SONAR,
          temperature: 0.3,
          maxTokens: 300,
          apiKey: PERPLEXITY_API_KEY,
        });
      }
      
      // Try OpenAI with environment key
      if (OPENAI_API_KEY) {
        return new ChatOpenAI({
          modelName: LLMModel.GPT5_MINI,
          temperature: 0.3,
          maxTokens: 300,
          openAIApiKey: OPENAI_API_KEY,
        });
      }

      // Try Azure with environment keys
      if (AZURE_OPENAI_API_KEY) {
        return new AzureChatOpenAI({
          modelName: LLMModel.GPT5_MINI,
          temperature: 0.3,
          maxTokens: 300,
          azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
          azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
          azureOpenAIApiInstanceName: AZURE_OPENAI_API_INSTANCE_NAME,
          azureOpenAIApiDeploymentName: AZURE_OPENAI_API_DEPLOYMENT_NAME,
        });
      }

      // If no environment keys available, throw error
      throw new Error("No valid LLM provider configuration found. Please check your API keys in environment variables or Google Secret Manager.");
    } catch (error) {
      console.error("Failed to create default LLM:", error);
      console.error("Available environment variables:");
      console.error(`PERPLEXITY_API_KEY: ${PERPLEXITY_API_KEY ? 'Present (length: ' + PERPLEXITY_API_KEY.length + ')' : 'Missing'}`);
      console.error(`OPENAI_API_KEY: ${OPENAI_API_KEY ? 'Present (length: ' + OPENAI_API_KEY.length + ')' : 'Missing'}`);
      console.error(`ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY ? 'Present (length: ' + ANTHROPIC_API_KEY.length + ')' : 'Missing'}`);
      
      // Return a mock LLM that prevents crashes but logs the issue
      return null; // This will be caught by the null checks in MiraAgent
    }
  }

  /**
   * Resolves a setting with proper fallback priority:
   * 1. User settings (if session available)
   * 2. Environment variable
   * 3. Default value
   */
  private static getSettingWithFallback<T>(session: AppSession | undefined, settingKey: string, envValue: string | undefined, defaultValue: T): T {
    if (session) {
      try {
        // Check if user has explicitly set this setting (non-empty value)
        const userSetting = session.settings.get<T>(settingKey);
        if (userSetting !== undefined && userSetting !== null) {
          // For string settings, also check if not empty
          if (typeof userSetting === 'string' && userSetting.trim() === '') {
            // Empty string, use fallback
          } else {
            return userSetting;
          }
        }
      } catch (error) {
        console.warn(`Error reading setting '${settingKey}':`, error);
        // Continue to fallback
      }
    }

    // Fallback to environment variable, then default
    return (envValue as T) || defaultValue;
  }

  /**
   * Determines the source of a setting value for logging
   */
  private static getSettingSource(session: AppSession | undefined, settingKey: string, envValue: string | undefined): string {
    if (session) {
      try {
        const userSetting = session.settings.get<string>(settingKey);
        if (userSetting && userSetting.trim()) {
          return "user settings";
        }
      } catch (error) {
        console.warn(`Error reading setting source for '${settingKey}':`, error);
      }
    }

    if (envValue) {
      return "environment variables";
    }

    return "defaults";
  }

  /**
   * Resolves API key with proper priority and validation
   * Priority: User settings > Provider-specific Environment secrets > Empty (fallback to default LLM)
   */
  private static resolveApiKey(session: AppSession | undefined, settingKey: string, envApiKey: string, providerName: string, selectedProvider?: string): string | null {
    let apiKey: string = "";
    let source: string = "";

    // 1. Check user settings first (highest priority)
    if (session) {
      try {
        const userApiKey = session.settings.get<string>(settingKey, "");
        if (userApiKey && userApiKey.trim()) {
          apiKey = userApiKey.trim();
          source = "user settings";
        }
      } catch (error) {
        console.warn(`Error reading API key from settings for '${settingKey}':`, error);
        // Continue to environment fallback
      }
    }

    // 2. Fallback to provider-specific environment secrets
    if (!apiKey && selectedProvider) {
      let providerSpecificEnvKey: string = "";
      
      switch (selectedProvider.toLowerCase()) {
        case "openai":
          providerSpecificEnvKey = OPENAI_API_KEY;
          break;
        case "anthropic":
          providerSpecificEnvKey = ANTHROPIC_API_KEY;
          break;
        case "google":
          providerSpecificEnvKey = GOOGLE_API_KEY;
          break;
        case "perplexity":
          providerSpecificEnvKey = PERPLEXITY_API_KEY;
          break;
        case "azure":
          providerSpecificEnvKey = AZURE_OPENAI_API_KEY;
          break;
        default:
          providerSpecificEnvKey = envApiKey; // fallback to passed envApiKey
      }
      
      if (providerSpecificEnvKey) {
        apiKey = providerSpecificEnvKey;
        source = `environment secrets (${selectedProvider}-specific)`;
      }
    }
    
    // 3. Final fallback to generic environment key
    if (!apiKey && envApiKey) {
      apiKey = envApiKey;
      source = "environment secrets (generic)";
    }

    // Log API key source for debugging (without exposing the key)
    if (apiKey) {
      console.log(`LLMProvider: Using ${providerName} API key from ${source} (length: ${apiKey.length})`);
      
      // Basic validation - ensure it's not a placeholder
      if (apiKey.includes("YOUR_") || apiKey.includes("PLACEHOLDER")) {
        console.warn(`LLMProvider: ${providerName} API key appears to be a placeholder value`);
        return null;
      }

      return apiKey;
    } else {
      console.warn(`LLMProvider: No ${providerName} API key found in settings or environment`);
      return null;
    }
  }
}
