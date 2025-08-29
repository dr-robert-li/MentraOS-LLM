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
  GPT4 = 'gpt-4o',
  GPT4_MINI = 'gpt-4o-mini',
  GPT5 = 'gpt-5',
  GPT5_MINI = 'gpt-5-mini',
  
  // Anthropic Models
  CLAUDE_3 = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_HAIKU = 'claude-3-5-haiku-20241022',
  CLAUDE_4 = 'claude-3-5-sonnet-20250108', // Latest Sonnet (often referred to as "Sonnet 4")
  
  // Google Models
  GEMINI_PRO = 'gemini-pro',
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

export const LLM_MODEL = process.env.LLM_MODEL || LLMModel.GPT4;
export const LLM_PROVIDER = process.env.LLM_PROVIDER || LLMService.AZURE;

import { AppSession } from "@mentra/sdk";

export class LLMProvider {
  static getLLM(session?: AppSession) {
    try {
      // Read from MentraOS settings if available, otherwise fallback to env
      const provider = session?.settings.get<string>("llm_provider", process.env.LLM_PROVIDER || LLMService.PERPLEXITY) as LLMService;
      const model = session?.settings.get<string>("llm_model", process.env.LLM_MODEL || LLMModel.SONAR) as LLMModel;
      const apiKeyFromSettings = session?.settings.get<string>("llm_api_key", "");

      // Validate provider and model before proceeding
      if (!provider || !model) {
        console.warn("LLMProvider: Missing provider or model, falling back to defaults");
        return LLMProvider.createDefaultLLM();
      }

      const supportedAzureModels = [
        LLMModel.GPT4,
        LLMModel.GPT4_MINI,
        LLMModel.GPT5,
        LLMModel.GPT5_MINI,
      ]
      const supportedOpenAIModels = [
        LLMModel.GPT4,
        LLMModel.GPT4_MINI,
        LLMModel.GPT5,
        LLMModel.GPT5_MINI,
      ]
      const supportedAnthropicModels = [
        LLMModel.CLAUDE_3,
        LLMModel.CLAUDE_3_HAIKU,
        LLMModel.CLAUDE_4,
      ]
      const supportedGoogleModels = [
        LLMModel.GEMINI_PRO,
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
        const apiKey = apiKeyFromSettings || AZURE_OPENAI_API_KEY;
        if (!apiKey) {
          console.warn("Azure API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        return new AzureChatOpenAI({
          modelName: model,
          temperature: 0.3,
          maxTokens: 300,
          azureOpenAIApiKey: apiKey,
          azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
          azureOpenAIApiInstanceName: AZURE_OPENAI_API_INSTANCE_NAME,
          azureOpenAIApiDeploymentName: AZURE_OPENAI_API_DEPLOYMENT_NAME,
        });
      } else if (provider === LLMService.OPENAI) {
        if (!supportedOpenAIModels.includes(model as LLMModel)) {
          console.warn(`Unsupported OpenAI model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = apiKeyFromSettings || OPENAI_API_KEY;
        if (!apiKey) {
          console.warn("OpenAI API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        return new ChatOpenAI({
          modelName: model,
          temperature: 0.3,
          maxTokens: 300,
          openAIApiKey: apiKey,
        });
      } else if (provider === LLMService.ANTHROPIC) {
        if (!supportedAnthropicModels.includes(model as LLMModel)) {
          console.warn(`Unsupported Anthropic model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = apiKeyFromSettings || ANTHROPIC_API_KEY;
        if (!apiKey) {
          console.warn("Anthropic API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        return new ChatAnthropic({
          modelName: model,
          temperature: 0.3,
          maxTokens: 300,
          anthropicApiKey: apiKey,
        });
      } else if (provider === LLMService.GOOGLE) {
        if (!supportedGoogleModels.includes(model as LLMModel)) {
          console.warn(`Unsupported Google model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = apiKeyFromSettings || GOOGLE_API_KEY;
        if (!apiKey) {
          console.warn("Google API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        return new ChatVertexAI({
          model: model,
          temperature: 0.3,
          maxOutputTokens: 300,
          authOptions: {
            credentials: { private_key: apiKey },
          },
          location: GOOGLE_LOCATION,
        });
      } else if (provider === LLMService.PERPLEXITY) {
        if (!supportedPerplexityModels.includes(model as LLMModel)) {
          console.warn(`Unsupported Perplexity model: ${model}, falling back to default`);
          return LLMProvider.createDefaultLLM();
        }
        const apiKey = apiKeyFromSettings || PERPLEXITY_API_KEY;
        if (!apiKey) {
          console.warn("Perplexity API key missing, falling back to default LLM");
          return LLMProvider.createDefaultLLM();
        }
        return new ChatPerplexity({
          model: model,
          temperature: 0.3,
          maxTokens: 300,
          apiKey: apiKey,
        });
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
          modelName: LLMModel.GPT4_MINI,
          temperature: 0.3,
          maxTokens: 300,
          openAIApiKey: OPENAI_API_KEY,
        });
      }

      // Try Azure with environment keys
      if (AZURE_OPENAI_API_KEY) {
        return new AzureChatOpenAI({
          modelName: LLMModel.GPT4_MINI,
          temperature: 0.3,
          maxTokens: 300,
          azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
          azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
          azureOpenAIApiInstanceName: AZURE_OPENAI_API_INSTANCE_NAME,
          azureOpenAIApiDeploymentName: AZURE_OPENAI_API_DEPLOYMENT_NAME,
        });
      }

      // If no environment keys available, throw error
      throw new Error("No valid LLM provider configuration found");
    } catch (error) {
      console.error("Failed to create default LLM:", error);
      // Return a mock LLM that prevents crashes but logs the issue
      return null; // This will be caught by the null checks in MiraAgent
    }
  }
}
