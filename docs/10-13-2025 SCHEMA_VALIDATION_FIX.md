# Schema Validation Fix

## Problem
Image analysis was failing with:
```json
{
  "error": "Failed to analyze image",
  "details": "No object generated: response did not match schema."
}
```

This means the AI wasn't generating output that matched our Zod schema structure.

## Root Causes

1. **Vague Prompt**: The prompt was too general and didn't clearly specify the expected structure
2. **Missing Array Constraints**: Arrays didn't have minimum lengths, so AI might return empty arrays
3. **Wrong Message Role**: Putting instructions in user content with the image instead of system prompt
4. **Unclear Format**: The prompt used markdown-style formatting that might confuse the AI

## Solutions Implemented

### 1. Rewrote Analysis Prompt (`src/app/api/analyze-image/route.ts`)

**Before**: Vague descriptive prompt
```
"Focus on:
1. **Color Palette & Visual Energy**:
   - Dominant colors..."
```

**After**: Clear structured requirements
```
"SUBJECT/SCENE:
- Identify the main subject type...
- Describe what you see in 1-2 sentences

COLOR PALETTE:
- List 3-5 dominant colors with evocative names
- Describe the overall mood the colors create
- Specify saturation level: muted, balanced, vibrant, or hyper-saturated
- Specify temperature: cool, neutral, warm, or mixed"
```

**Benefits**:
- Clear section headers matching schema structure
- Explicit options for enum fields
- Specific requirements (e.g., "List 3-5", "choose from")
- Direct mapping to schema fields

### 2. Fixed Message Structure

**Before**:
```typescript
messages: [{
  role: "user",
  content: [
    { type: "text", text: LONG_INSTRUCTION_PROMPT },
    { type: "image", image: imageUrl }
  ]
}]
```

**After**:
```typescript
messages: [
  {
    role: "system",
    content: IMAGE_STYLE_MOOD_PROMPT  // Instructions in system
  },
  {
    role: "user",
    content: [
      { type: "text", text: "Analyze this image according to the structured format." },
      { type: "image", image: imageUrl }
    ]
  }
]
```

**Benefits**:
- System role for instructions (clearer intent)
- User role just for the image and brief request
- Better separation of concerns

### 3. Added Array Minimum Lengths (`src/lib/schemas/image-analysis-schema.ts`)

Added `.min()` constraints to all arrays:

```typescript
// Before: No constraints
dominant: z.array(z.string())

// After: Explicit minimums
dominant: z.array(z.string()).min(3).max(5)

// Applied to all arrays:
- colorPalette.dominant: .min(3).max(5)
- lighting.atmosphere: .min(1)
- visualStyle.aesthetic: .min(1)
- visualStyle.texture: .min(1)
- mood.secondary: .min(2)
- cinematicPotential.motionStyle: .min(2)
- cinematicPotential.camerawork: .min(2)
- cinematicPotential.visualEffects: .min(2)
- narrativeTone.genre: .min(2)
```

**Benefits**:
- AI knows minimum required items
- Prevents empty arrays
- Schema validation is stricter
- Better error messages if validation fails

### 4. Added Better Error Logging

```typescript
catch (error) {
  console.error("Error analyzing image:", error);
  
  // Log detailed error for debugging
  if (error && typeof error === 'object') {
    console.error("Error details:", JSON.stringify(error, null, 2));
  }
  // ...
}
```

**Benefits**:
- See full error object in logs
- Easier to debug schema mismatches
- Can identify which fields are failing

## Expected Behavior Now

The AI should generate output like:

```json
{
  "subject": {
    "type": "person",
    "description": "A lone figure stands in an urban environment",
    "context": "contemplating in solitude"
  },
  "colorPalette": {
    "dominant": ["midnight indigo", "electric cobalt", "warm amber"],
    "mood": "melancholic and introspective",
    "saturation": "balanced",
    "temperature": "mixed"
  },
  "lighting": {
    "quality": "mixed",
    "direction": "soft overhead with directional accent",
    "mood": "quietly suspenseful",
    "atmosphere": ["volumetric", "clear"]
  },
  // ... rest of fields with proper structure
}
```

## Testing

To test if the fix works:

1. **Try analyzing an image**:
```typescript
const response = await fetch('/api/analyze-image', {
  method: 'POST',
  body: JSON.stringify({ imageUrl: 'https://...' })
});
```

2. **Check console logs** for any schema validation errors

3. **Verify response** contains all required fields:
   - subject (type, description, context)
   - colorPalette (dominant with 3-5 items, mood, saturation, temperature)
   - lighting (quality enum, direction, mood, atmosphere array)
   - All other required fields

## If Still Failing

If you still get schema validation errors:

1. **Check server logs** for detailed error output
2. **Verify enum values** match exactly (case-sensitive)
3. **Ensure arrays have minimum items** as specified
4. **Try simpler test image** (clear subject, obvious colors)

## Schema Validation Tips

For future schema updates:

- ✅ Use `.min()` and `.max()` on arrays
- ✅ Provide examples in `.describe()`
- ✅ List exact enum options in prompts
- ✅ Keep prompts aligned with schema structure
- ✅ Use system role for structured instructions
- ✅ Test with diverse images
- ✅ Log full error objects for debugging

## Summary

The fix makes the AI prompt much more explicit about:
- What to analyze (clear sections)
- How to format (specific requirements)
- Valid options (enum choices spelled out)
- Minimum data needed (array lengths)

This should eliminate the "response did not match schema" error.
