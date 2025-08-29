# MentraOS LLM - Troubleshooting Guide

## Common Issues and Solutions

### 🖤 Black Screen of Death (Android App)

**Problem:** App goes blank/unresponsive when adding API key in settings

**Root Cause:** Invalid API key or LLM configuration causing the app to crash

**Solutions:**

1. **Check API Key Format:**
   ```
   ✅ Valid: sk-1234567890abcdef... (OpenAI)
   ✅ Valid: pplx-1234567890abcdef... (Perplexity)
   ❌ Invalid: Missing "sk-" or "pplx-" prefix
   ❌ Invalid: Spaces or special characters
   ```

2. **Verify Provider/Model Match:**
   - OpenAI: Use models like `gpt-4o`, `gpt-4o-mini`
   - Perplexity: Use models like `sonar`, `sonar-pro`
   - Anthropic: Use models like `claude-3-5-sonnet-20241022`

3. **Test API Key First:**
   ```bash
   # Test OpenAI key
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.openai.com/v1/models
   
   # Test Perplexity key  
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.perplexity.ai/chat/completions
   ```

4. **Recovery Steps:**
   - Force close the MentraOS app
   - Clear app cache/data if needed
   - Reopen app (should work with default settings)
   - Re-enter a **valid** API key

### ⚙️ Configuration Issues

**Problem:** "Sorry, I'm having trouble connecting to the AI service"

**Solutions:**
1. Check internet connection
2. Verify API key is active (not expired/disabled)
3. Ensure sufficient API credits/quota
4. Try switching to a different LLM provider

**Problem:** "Configuration issue with the AI service"

**Solutions:**
1. Make sure Provider and Model match:
   - Perplexity → `sonar` or `sonar-pro`  
   - OpenAI → `gpt-4o` or `gpt-4o-mini`
   - Anthropic → `claude-3-5-sonnet-20241022`

### 🔧 Deployment Issues

**Problem:** "LLMProvider.getLLM() returned undefined"

**Solutions:**
1. Check environment variables are set in Cloudflare Workers
2. Verify wrangler.toml has correct variable names
3. Ensure API keys are properly configured

**Problem:** Durable Objects not working

**Solutions:**
1. Ensure you have a paid Cloudflare Workers plan
2. Check that migrations are applied correctly
3. Verify KV namespace ID is correct in wrangler.toml

### 📱 Android App Specific Issues

**Problem:** App freezes when entering settings

**Solutions:**
1. Use shorter API keys if possible
2. Avoid copy-pasting with extra whitespace
3. Type API key manually if clipboard has issues

**Problem:** Voice commands not working

**Solutions:**
1. Check microphone permissions
2. Ensure wake words are clear: "Hey Mentra"
3. Try in a quiet environment
4. Verify API key is working (test with text first)

### 🚨 Error Messages Guide

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "No query provided" | Empty or unclear voice input | Speak more clearly after "Hey Mentra" |
| "Check your API key settings" | Invalid/missing API key | Verify API key format and validity |
| "Configuration issue with AI service" | Model/provider mismatch | Match provider with correct model |
| "Trouble initializing my tools" | bindTools() failed | Check LLM provider supports tool calling |

### 🔍 Debugging Steps

1. **Check Logs:**
   ```bash
   # View Cloudflare Worker logs
   npx wrangler tail
   ```

2. **Test Basic Functionality:**
   - Try simple queries first: "Hey Mentra, what time is it?"
   - Avoid complex queries until basic ones work

3. **Validate Configuration:**
   - Provider: Must be one of: openai, anthropic, google, perplexity
   - Model: Must match the provider's supported models
   - API Key: Must be valid and have sufficient credits

### 💡 Best Practices

1. **Start Simple:**
   - Use Perplexity with `sonar` model (most reliable)
   - Test with environment variables first
   - Add user settings after basic functionality works

2. **API Key Security:**
   - Never share API keys in logs or screenshots
   - Use separate keys for development/production
   - Monitor usage to avoid unexpected charges

3. **Testing:**
   - Test voice commands in quiet environments
   - Start with simple questions
   - Verify internet connectivity

### 📞 Getting Help

If issues persist:

1. Check the [MentraOS Discord/Support channel]
2. Include error messages (remove API keys!)
3. Specify which LLM provider you're using
4. Note if issue happens with all queries or specific ones

**Common Solutions that Fix 90% of Issues:**
1. Use a valid Perplexity API key with `sonar` model
2. Ensure internet connection is stable  
3. Speak clearly after "Hey Mentra"
4. Force close and restart the app if it becomes unresponsive
