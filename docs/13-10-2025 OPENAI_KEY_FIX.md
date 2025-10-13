# OpenAI API Key Fix

## Problem
The storyline generator was being called from client-side code and didn't have access to the OpenAI API key, resulting in:
```
AI_LoadAPIKeyError: OpenAI API key is missing
```

## Solution
Created a new API route `/api/generate-storylines` that runs server-side with access to environment variables.

## Files Changed

### 1. Created: `src/app/api/generate-storylines/route.ts` ✨ NEW
Server-side API route that:
- Receives style analysis and duration from client
- Calls OpenAI's `generateObject()` with GPT-4o
- Has access to `process.env.OPENAI_API_KEY`
- Returns structured storyline data

### 2. Updated: `src/lib/storyline-generator.ts`
Changed from:
- Direct OpenAI API calls (client-side)
- Required API key in client environment

Changed to:
- Client-side wrapper that calls `/api/generate-storylines`
- No API key needed on client
- Same interface, different implementation

## Architecture

```
CLIENT-SIDE                    SERVER-SIDE
┌─────────────────┐           ┌──────────────────────┐
│                 │           │                      │
│  Handler calls  │   POST    │  /api/generate-      │
│  generateStory  │──────────▶│  storylines          │
│  lines()        │           │                      │
│                 │           │  - Has OPENAI_API_   │
│                 │           │    KEY env var       │
│                 │◀──────────│  - Calls OpenAI API  │
│                 │   JSON    │  - Returns           │
│                 │  response │    storylines        │
└─────────────────┘           └──────────────────────┘
```

## Security Benefits
✅ API key never exposed to client  
✅ All OpenAI calls happen server-side  
✅ Rate limiting can be added to API route  
✅ Request validation on server  

## Testing
The fix resolves the API key error while maintaining the same interface:

```typescript
// Usage remains the same
const storylineSet = await generateStorylines({
  styleAnalysis: analysis,
  duration: 4,
});

// But now it calls /api/generate-storylines internally
```

## Environment Setup
Ensure `.env.local` or deployment has:
```bash
OPENAI_API_KEY=sk-...
```

This is the same key used by `/api/analyze-image`, so no additional setup needed.
