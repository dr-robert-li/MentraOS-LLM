# Testing Settings Race Condition Fix

## Issue Summary
The Android app's `handleSettingChange()` has a race condition where:
1. `setSettingsState()` is async 
2. `Object.keys(settingsState)` uses old state
3. Server receives inconsistent settings data
4. Model selection doesn't persist (stays Claude Sonnet 4 instead of Sonar Pro)

## Fixes Applied

### 1. Enhanced Debugging (src/index.ts)
- Log incoming settings changes with full JSON
- Log actual settings state after change
- Log final settings state after cache invalidation
- Added 500ms delay to handle race conditions

### 2. Better LLM Provider Logging (src/utils/LLMProvider.ts)
- Log raw settings vs processed settings
- Detect mismatches between user intent and actual values

### 3. User-Facing Changes (config.json)
- Updated app description to mention 2-second delay
- Updated settings group title to indicate delay
- Updated API key description to clarify it's optional
- Added description about environment variable fallback

## Testing Steps

### Test 1: Model Selection Persistence
1. Open Android app settings
2. Change model from "Claude Sonnet 4" to "Perplexity Sonar Pro"
3. Check GCR logs for these entries:
   ```
   [Session abc123] Settings change received: {"llm_model": "sonar-pro"}
   [Session abc123] Actual settings state - Provider: perplexity, Model: sonar-pro
   [Session abc123] Final LLM settings after cache invalidation (2s delay) - Provider: perplexity, Model: sonar-pro
   ```
4. Test LLM functionality - should use Sonar Pro

### Test 2: API Key Input
1. Enter API key in text field
2. Click "Done"
3. Should NOT crash (previous black screen issue)
4. Check logs for API key validation messages

### Test 3: Provider + Model Change
1. Change provider from "Anthropic" to "Perplexity" 
2. Then change model to "Sonar Pro"
3. Both settings should persist correctly
4. Check logs show consistent state throughout

## Expected Log Output

**Good (Working):**
```
[Session abc123] Settings change received: {"llm_model": "sonar-pro"}
[Session abc123] Actual settings state - Provider: perplexity, Model: sonar-pro
[Session abc123] LLMProvider: Using model='sonar-pro' from user settings
[Session abc123] LLMProvider: Raw settings - provider='perplexity', model='sonar-pro'
```

**Bad (Race Condition):**
```
[Session abc123] Settings change received: {"llm_model": "sonar-pro"}
[Session abc123] Actual settings state - Provider: perplexity, Model: claude-sonnet-4-20250514
[Session abc123] LLMProvider: Using model='claude-sonnet-4-20250514' from defaults
[Session abc123] LLMProvider: Raw settings - provider='perplexity', model='claude-sonnet-4-20250514'
```

## Workaround Applied

Since we cannot modify the Android app's race condition, we:
1. Added 2-second delay before cache invalidation
2. Enhanced logging to detect race conditions
3. Made LLM provider more resilient to inconsistent state
4. Added user feedback for failed settings updates

The 2-second delay gives the Android app time to complete its async state updates before our backend processes the changes.