// Test script for LLMProvider with updated models
// This script tests the LLMProvider configuration without requiring the full app setup

const { LLMProvider, LLMModel, LLMService } = require('./dist/utils/LLMProvider.js');

async function testLLMProvider() {
  console.log('🧪 Testing LLMProvider with updated models...\n');

  // Test different model configurations
  const testConfigs = [
    // OpenAI models
    { provider: LLMService.OPENAI, model: LLMModel.GPT4, name: 'OpenAI GPT-4o' },
    { provider: LLMService.OPENAI, model: LLMModel.GPT4_MINI, name: 'OpenAI GPT-4o-mini' },
    { provider: LLMService.OPENAI, model: LLMModel.GPT5, name: 'OpenAI GPT-5' },
    
    // Anthropic models
    { provider: LLMService.ANTHROPIC, model: LLMModel.CLAUDE_3, name: 'Claude 3.5 Sonnet' },
    { provider: LLMService.ANTHROPIC, model: LLMModel.CLAUDE_3_HAIKU, name: 'Claude 3.5 Haiku' },
    { provider: LLMService.ANTHROPIC, model: LLMModel.CLAUDE_4, name: 'Claude 4 (Latest Sonnet)' },
    
    // Google models
    { provider: LLMService.GOOGLE, model: LLMModel.GEMINI_PRO, name: 'Gemini Pro' },
    { provider: LLMService.GOOGLE, model: LLMModel.GEMINI_2_FLASH, name: 'Gemini 2.0 Flash' },
    { provider: LLMService.GOOGLE, model: LLMModel.GEMINI_2_PRO, name: 'Gemini 2.0 Pro' },
    
    // Azure models
    { provider: LLMService.AZURE, model: LLMModel.GPT4, name: 'Azure GPT-4o' },
    { provider: LLMService.AZURE, model: LLMModel.GPT4_MINI, name: 'Azure GPT-4o-mini' },
    { provider: LLMService.AZURE, model: LLMModel.GPT5, name: 'Azure GPT-5' },
    
    // Perplexity models
    { provider: LLMService.PERPLEXITY, model: LLMModel.SONAR, name: 'Perplexity Sonar' },
    { provider: LLMService.PERPLEXITY, model: LLMModel.SONAR_PRO, name: 'Perplexity Sonar Pro' },
  ];

  for (const config of testConfigs) {
    try {
      // Temporarily set environment variables for testing
      const originalModel = process.env.LLM_MODEL;
      const originalProvider = process.env.LLM_PROVIDER;
      
      process.env.LLM_MODEL = config.model;
      process.env.LLM_PROVIDER = config.provider;
      
      console.log(`Testing ${config.name} (${config.provider}/${config.model})...`);
      
      // Test LLM instantiation
      const llm = LLMProvider.getLLM();
      
      if (llm) {
        console.log(`✅ ${config.name}: Successfully instantiated`);
        console.log(`   Model: ${llm.modelName || llm.model || 'N/A'}`);
        console.log(`   Temperature: ${llm.temperature || 'N/A'}`);
        console.log(`   Max Tokens: ${llm.maxTokens || llm.maxOutputTokens || 'N/A'}`);
      } else {
        console.log(`❌ ${config.name}: Failed to instantiate`);
      }
      
      // Restore original environment variables
      if (originalModel) process.env.LLM_MODEL = originalModel;
      else delete process.env.LLM_MODEL;
      if (originalProvider) process.env.LLM_PROVIDER = originalProvider;
      else delete process.env.LLM_PROVIDER;
      
    } catch (error) {
      console.log(`❌ ${config.name}: Error - ${error.message}`);
    }
    console.log('');
  }

  // Test unsupported model scenarios
  console.log('🔍 Testing error handling for unsupported models...\n');
  
  const errorTests = [
    { provider: LLMService.OPENAI, model: 'unsupported-model', name: 'Unsupported OpenAI model' },
    { provider: LLMService.ANTHROPIC, model: 'unsupported-model', name: 'Unsupported Anthropic model' },
    { provider: LLMService.GOOGLE, model: 'unsupported-model', name: 'Unsupported Google model' },
    { provider: 'unsupported-provider', model: LLMModel.GPT4, name: 'Unsupported provider' },
  ];

  for (const test of errorTests) {
    try {
      process.env.LLM_MODEL = test.model;
      process.env.LLM_PROVIDER = test.provider;
      
      console.log(`Testing ${test.name}...`);
      LLMProvider.getLLM();
      console.log(`❌ ${test.name}: Should have thrown an error but didn't`);
    } catch (error) {
      console.log(`✅ ${test.name}: Correctly threw error - ${error.message}`);
    }
    console.log('');
  }

  console.log('🎉 LLMProvider testing completed!');
}

// Run the test
if (require.main === module) {
  testLLMProvider().catch(console.error);
}

module.exports = { testLLMProvider };
