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

export class LLMProvider {
  static getLLM() {
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

    // Convert model to enum value if it's a string
    const model = typeof LLM_MODEL === 'string' ? LLM_MODEL as LLMModel : LLM_MODEL;
    const provider = LLM_PROVIDER || LLMService.AZURE;

    if (provider === LLMService.AZURE) {
      if (!supportedAzureModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported Azure model: ${model}`);
      }
      return new AzureChatOpenAI({
        modelName: model,
        temperature: 0.3,
        maxTokens: 300,
        azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
        azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION,
        azureOpenAIApiInstanceName: AZURE_OPENAI_API_INSTANCE_NAME,
        azureOpenAIApiDeploymentName: AZURE_OPENAI_API_DEPLOYMENT_NAME,
      });
    } else if (provider === LLMService.OPENAI) {
      if (!supportedOpenAIModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported OpenAI model: ${model}`);
      }
      return new ChatOpenAI({
        modelName: model,
        temperature: 0.3,
        maxTokens: 300,
        openAIApiKey: OPENAI_API_KEY,
      });
    } else if (provider === LLMService.ANTHROPIC) {
      if (!supportedAnthropicModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported Anthropic model: ${model}`);
      }
      return new ChatAnthropic({
        modelName: model,
        temperature: 0.3,
        maxTokens: 300,
        anthropicApiKey: ANTHROPIC_API_KEY,
      });
    } else if (provider === LLMService.GOOGLE) {
      if (!supportedGoogleModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported Google model: ${model}`);
      }
      return new ChatVertexAI({
        model: model,
        temperature: 0.3,
        maxOutputTokens: 300,
        authOptions: {
          credentials: GOOGLE_API_KEY ? { private_key: GOOGLE_API_KEY } : undefined,
        },
        location: GOOGLE_LOCATION,
      });
    } else if (provider === LLMService.PERPLEXITY) {
      if (!supportedPerplexityModels.includes(model as LLMModel)) {
        throw new Error(`Unsupported Perplexity model: ${model}`);
      }
      return new ChatPerplexity({
        model: model,
        temperature: 0.3,
        maxTokens: 300,
        apiKey: PERPLEXITY_API_KEY,
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
