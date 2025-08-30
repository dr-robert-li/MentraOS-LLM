# MentraOS LLM - Troubleshooting Guide
### Version: 0.5.1

## Common Issues and Solutions

### 🖤 Black Screen of Death (Android App)

**Problem:** App goes blank/unresponsive when entering API key and pressing "Done"

**Root Cause:** TextEditorStore race condition in Android app causing state corruption and crashes

**Solutions:**

1. **CRITICAL - Known Issue (v0.5.1):**
   - This is a confirmed bug in the Android app's TextEditorStore
   - Server-side protections are in place but crashes still occur
   - **Workaround:** Use environment variables instead of entering API keys in the app

2. **Check API Key Format:**
   ```
   ✅ Valid: sk-1234567890abcdef... (OpenAI)
   ✅ Valid: pplx-1234567890abcdef... (Perplexity)
   ✅ Valid: sk-ant-1234567890abcdef... (Anthropic)
   ❌ Invalid: Keys longer than 400 characters
   ❌ Invalid: Spaces or special characters
   ```

3. **Verify Provider/Model Match:**
   - OpenAI: Use models like `gpt-5`, `gpt-5-mini`, `gpt-5-nano`
   - Perplexity: Use models like `sonar`, `sonar-pro`  
   - Anthropic: Use models like `claude-sonnet-4-20250514`, `claude-opus-4-20250514`
   - Google: Use models like `gemini-2.5-pro`, `models/gemini-2.5-flash`

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
   - If you have entered a **valid** API key then this should have been set asynchronously on your container

### ⚙️ Configuration Issues

**Problem:** "Configuration issue with the AI, contact support"

**Root Cause:** LLM provider failed to initialize due to invalid API keys or missing environment variables

**Solutions:**
1. **Check Google Secret Manager** (for Cloud Run deployments):
   ```bash
   gcloud secrets list
   gcloud secrets versions access latest --secret="PERPLEXITY_API_KEY"
   ```

2. **Verify Service Account Permissions:**
   - Ensure Cloud Run service account has "Secret Manager Secret Accessor" role
   - Check environment variables are correctly configured

3. **Test API Key Validity:**
   ```bash
   # Test Perplexity API
   curl -X POST "https://api.perplexity.ai/chat/completions" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "sonar", "messages": [{"role": "user", "content": "test"}]}'
   ```

4. **Check Cloud Run Logs:**
   ```bash
   gcloud logs read "resource.type=cloud_run_revision" --limit=50
   ```

**Problem:** Model Selection Not Persisting

**Solutions:**
1. **Settings Race Condition:** Changes may not persist due to Android app state issues
2. **Wait 2-3 seconds** between setting changes to allow proper synchronization
3. **Check server logs** for "Final LLM settings after cache invalidation" messages
4. **Use environment variables** as a more reliable alternative

### 🔧 Google Cloud Run Deployment Issues

**Problem:** "LLMProvider.getLLM() returned undefined"

**Solutions:**
1. **Check Environment Variables:**
   ```bash
   # In Google Cloud Console → Cloud Run → Service → Edit & Deploy New Revision
   # Variables & Secrets → Environment Variables
   AUGMENTOS_API_KEY=your_key
   LLM_PROVIDER=anthropic
   LLM_MODEL=claude-sonnet-4-20250514
   ```

2. **Verify cloudrun.yaml Configuration:**
   ```yaml
   env:
   - name: PERPLEXITY_API_KEY
     valueFrom:
       secretKeyRef:
         key: '1'
         name: PERPLEXITY_API_KEY
   ```

**Problem:** Service Won't Start / Health Check Failures

**Solutions:**
1. **Check Memory Limits:** Default 512Mi may be insufficient
2. **Verify Port Configuration:** Must use PORT=80
3. **Review Startup Probe Settings:**
   - Initial delay: 30s
   - Timeout: 5s  
   - Period: 10s
   - Failure threshold: 30

**Problem:** Cold Start Issues

**Solutions:**
1. **Set Minimum Instances (1):** Prevent cold starts for production
2. **Optimize Dependencies:** Remove unused packages
3. **Use CPU Allocation:** Keep instance warm with minimal CPU

### 📱 Android App Specific Issues

**Problem:** App crashes when entering API key and pressing "Done"

**Solutions:**
1. **Known Bug:** TextEditorStore race condition - no current fix available
2. **Workaround:** Use environment variables on server instead of app settings
3. **Recovery Steps:**
   - Force close MentraOS app completely
   - Clear app cache (Android Settings → Apps → MentraOS → Storage → Clear Cache)
   - Restart app (should work with default settings)
4. **Server-Side Protection:** API keys over 400 characters are automatically flagged
5. **Avoid Rapid Changes:** Wait 2-3 seconds between setting modifications

**Problem:** Model Selection Doesn't Persist (Reverts to Claude Sonnet 4)

**Solutions:**
1. **Race Condition:** Android app's async state management causes inconsistencies
2. **Wait Between Changes:** Allow 2-3 seconds after each setting change
3. **Check Logs:** Server logs will show if settings are properly received
4. **Alternative:** Set LLM_PROVIDER and LLM_MODEL as environment variables

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

1. **Check Google Cloud Run Logs:**
   ```bash
   # View real-time logs
   gcloud logs tail --filter="resource.type=cloud_run_revision"
   
   # Search for specific errors
   gcloud logs read "resource.type=cloud_run_revision AND textPayload:ERROR" --limit=50
   
   # Check settings changes
   gcloud logs read "resource.type=cloud_run_revision AND textPayload:Settings" --limit=20
   ```

2. **Test Basic Functionality:**
   - Try simple queries first: "Hey Mentra, what time is it?"
   - Avoid complex queries until basic ones work

3. **Validate Configuration:**
   - Provider: Must be one of: openai, anthropic, google, perplexity
   - Model: Must match the provider's supported models (see latest models in config.json)
   - API Key: Must be valid, under 400 characters, and have sufficient credits
   - Environment Variables: Check both local .env and Google Cloud Run configuration

### 💡 Best Practices

1. **Start Simple:**
   - Use Anthropic with `claude-sonnet-4-20250514` model (default, most reliable)
   - Test with environment variables first (avoid Android app settings until bug is fixed)
   - Deploy to Google Cloud Run for best performance

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
1. Use environment variables instead of Android app settings for API keys
2. Use default Anthropic provider with Claude Sonnet 4 model
3. Wait 2-3 seconds between settings changes to avoid race conditions
4. Check Google Cloud Run logs for detailed error information
5. Force close and restart the app if it becomes unresponsive

### 🆕 Version 0.5.1 Specific Issues

**Android App API Key Crashes:**
- **Status:** Known critical bug
- **Workaround:** Use server environment variables
- **ETA:** Requires Android app update (outside this project's scope)

**Settings Race Conditions:**
- **Protection:** Server detects rapid changes (>3 in 5 seconds)
- **Logging:** All setting changes are logged with session IDs
- **Mitigation:** Asynchronous processing prevents server blocking
