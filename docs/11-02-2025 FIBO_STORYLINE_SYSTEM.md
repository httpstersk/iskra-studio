# FIBO-Based Storyline System

This document describes the new storyline generation system built directly on FIBO's structured aesthetics output.

## Overview

**Date**: 2025-11-02  
**Purpose**: Generate narrative progressions using FIBO's precise aesthetic specifications  
**Status**: Active

## Why FIBO-Based Storylines?

The previous storyline system used a complex custom schema with 200+ fields that required inference and mapping. The new FIBO-based system:

1. **Direct Aesthetics** - Uses FIBO's native aesthetic structure without inference
2. **Precise Specifications** - FIBO provides exact color schemes, lighting, composition details
3. **Simpler Architecture** - No complex mapping layer required
4. **Better Consistency** - Aesthetic specifications come directly from FIBO's analysis
5. **Cleaner Prompts** - Structured aesthetics embedded directly in generation prompts

## Architecture

### Components

1. **FIBO Storyline Schema** (`/src/lib/schemas/fibo-storyline-schema.ts`)
   - Defines storyline structure using FIBO's aesthetic fields
   - No inference - direct use of FIBO output
   - Each storyline concept preserves FIBO aesthetics

2. **FIBO Storyline Generator** (`/src/lib/fibo-storyline-generator.ts`)
   - Builds prompts with FIBO aesthetics embedded
   - Handles time progression logic
   - Client-side function to call API

3. **API Route** (`/src/app/api/generate-fibo-storylines/route.ts`)
   - OpenAI GPT-4o generates storyline concepts
   - Takes FIBO analysis as input
   - Returns concepts with preserved aesthetics

## FIBO Aesthetic Structure

FIBO provides the following aesthetic specifications:

```typescript
{
  // Visual Composition
  aesthetics: {
    composition: "centered, symmetrical, portrait composition",
    color_scheme: "high contrast between dark greys/blacks and warm orange",
    mood_atmosphere: "mysterious, contemplative, stark, minimalist",
    aesthetic_score: "very high",
    preference_score: "very high"
  },
  
  // Lighting Setup
  lighting: {
    conditions: "dim indoor",
    direction: "backlit from doorway",
    shadows: "strong silhouette with deep shadow"
  },
  
  // Camera/Lens
  photographic_characteristics: {
    depth_of_field: "deep",
    focus: "sharp focus on subject and immediate surroundings",
    camera_angle: "eye-level",
    lens_focal_length: "35mm-50mm standard lens"
  },
  
  // Style Classification
  style_medium: "photograph",
  artistic_style: "minimalist, dramatic, chiaroscuro"
}
```

## Storyline Generation Flow

### 1. Image Analysis (FIBO)

```typescript
import { analyzeImageCore } from '@/lib/image-analyzer';

// Analyze image with FIBO
const result = await analyzeImageCore(imageUrl);
// Returns FIBO structured prompt (via adapter for backward compatibility)
```

### 2. Extract FIBO Analysis

```typescript
import type { FiboStructuredPrompt } from '@/lib/adapters/fibo-to-analysis-adapter';

// Get raw FIBO analysis (before adapter transformation)
const fiboAnalysis: FiboStructuredPrompt = {
  aesthetics: {...},
  artistic_style: "..."
  background_setting: "...",
  context: "...",
  lighting: {...},
  objects: [...],
  photographic_characteristics: {...},
  short_description: "...",
  style_medium: "...",
};
```

### 3. Generate Storylines

```typescript
import { generateFiboStorylineConcepts } from '@/lib/fibo-storyline-generator';

const storylines = await generateFiboStorylineConcepts(
  fiboAnalysis,
  8, // number of storyline images
  "Optional user context about the narrative"
);
```

### 4. Result Structure

```typescript
{
  concepts: [
    {
      prompt: "Empty doorway with warm orange light spilling through, no figure present, suggesting recent departure. Style: photograph in minimalist, dramatic, chiaroscuro style. Composition: centered, symmetrical, portrait composition. Color: high contrast between dark greys/blacks and warm orange. Mood: mysterious, contemplative, stark, minimalist. Lighting: dim indoor, backlit from doorway creating strong shadows with warm glow. Camera: eye-level, 35mm-50mm standard lens, deep depth of field, sharp focus on doorway and walls.",
      
      timeElapsed: 1,
      timeLabel: "+1min",
      narrativeNote: "The figure has left, leaving only the warm doorway as evidence of their passage",
      
      // FIBO aesthetics preserved exactly
      aesthetics: {
        composition: "centered, symmetrical, portrait composition",
        color_scheme: "high contrast between dark greys/blacks and warm orange",
        mood_atmosphere: "mysterious, contemplative, stark, minimalist"
      },
      lighting: {
        conditions: "dim indoor",
        direction: "backlit from doorway",
        shadows: "strong silhouette with deep shadow"
      },
      photographic_characteristics: {
        depth_of_field: "deep",
        focus: "sharp focus throughout",
        camera_angle: "eye-level",
        lens_focal_length: "35mm-50mm standard lens"
      },
      style_medium: "photograph",
      artistic_style: "minimalist, dramatic, chiaroscuro"
    },
    // ... more concepts
  ]
}
```

## Prompt Structure

Each generated prompt embeds ALL FIBO aesthetic specifications:

```
[Story element at +{time}]. [What's happening].
Style: {style_medium} in {artistic_style} style.
Composition: {composition}.
Color: {color_scheme}.
Mood: {mood_atmosphere}.
Lighting: {conditions}, {direction}, {shadows}.
Camera: {camera_angle}, {lens_focal_length}, {depth_of_field}, {focus}.
```

### Example Prompt

```
Dark corridor with circular object mounted on wall, warm light visible at far end, textured walls catching rim lighting. 
Style: photograph in minimalist, dramatic, chiaroscuro style. 
Composition: centered, symmetrical, portrait composition. 
Color: high contrast between dark greys/blacks and warm orange glow. 
Mood: mysterious, contemplative, stark, minimalist. 
Lighting: dim indoor, backlit from distant source creating dramatic shadows. 
Camera: eye-level, 35mm-50mm standard lens, deep depth of field, sharp focus throughout corridor.
```

## Time Progression

The system uses exponential time progression (×5 multiplier):

| Image | Time Elapsed | Label | Story World Evolution |
|-------|--------------|-------|----------------------|
| 1 | 1 min | +1min | Immediate consequence |
| 2 | 5 min | +5min | Connected location |
| 3 | 25 min | +25min | Story expansion |
| 4 | 125 min | +2h5m | Major transformation |
| 5 | 625 min | +10h25m | Significant changes |
| 6 | 3,125 min | ~2 days | Extended evolution |
| 7 | 15,625 min | ~11 days | Long-term effects |
| 8 | 78,125 min | ~54 days | Complete world shift |

## Critical Rules

### 1. Content Exclusion

**NEVER include from reference:**
- Same subjects, people, or characters
- Same objects, props, or items
- Same locations or settings
- Any visual elements from reference

**Think:** "What ELSE is happening in this story world?"

### 2. Aesthetic Preservation

**ALWAYS maintain from reference:**
- Composition approach
- Color scheme and grading
- Mood and atmosphere
- Lighting conditions, direction, shadows
- Camera angle and lens characteristics
- Depth of field and focus style
- Style medium and artistic treatment

## API Endpoint

### Request

```bash
POST /api/generate-fibo-storylines
Content-Type: application/json

{
  "fiboAnalysis": {
    "short_description": "...",
    "objects": [...],
    "background_setting": "...",
    "lighting": {...},
    "aesthetics": {...},
    "photographic_characteristics": {...},
    "style_medium": "...",
    "context": "...",
    "artistic_style": "..."
  },
  "count": 8,
  "userContext": "Optional narrative context"
}
```

### Response

```json
{
  "concepts": [
    {
      "prompt": "Full generation prompt with FIBO aesthetics",
      "timeElapsed": 1,
      "timeLabel": "+1min",
      "narrativeNote": "What's happening",
      "aesthetics": {...},
      "lighting": {...},
      "photographic_characteristics": {...},
      "style_medium": "...",
      "artistic_style": "..."
    }
  ],
  "usage": {
    "promptTokens": 1250,
    "completionTokens": 850,
    "totalTokens": 2100
  }
}
```

## Integration with Image Generation

Use the generated prompts directly with image generation models:

```typescript
// Generate storyline concepts
const { concepts } = await generateFiboStorylineConcepts(fiboAnalysis, 8);

// Use prompts for image generation
for (const concept of concepts) {
  await generateImage({
    prompt: concept.prompt,
    // FIBO aesthetics are already embedded in the prompt
  });
}
```

## Benefits Over Previous System

| Aspect | Old System | FIBO System |
|--------|-----------|-------------|
| Aesthetic Source | 200+ custom fields with inference | Direct FIBO output |
| Complexity | Complex mapping layer | Simple pass-through |
| Accuracy | Inference-based approximations | Exact FIBO specifications |
| Maintenance | Multiple schemas to sync | Single FIBO structure |
| Prompt Length | Variable, often verbose | Structured, consistent |
| Style Lock | Custom sentence generation | FIBO specifications embedded |

## Migration Notes

### What Changed

- ✅ **New**: FIBO-based storyline schema
- ✅ **New**: Direct aesthetic embedding in prompts
- ✅ **New**: `/api/generate-fibo-storylines` endpoint
- ⚠️ **Preserved**: Old system remains for backward compatibility

### What Stayed the Same

- ✅ Time progression logic unchanged
- ✅ Content exclusion rules unchanged
- ✅ Story world evolution approach unchanged

## Future Enhancements

Potential improvements:
1. Support for FIBO aesthetic variations within storylines
2. Multi-reference storyline merging
3. Interactive aesthetic parameter adjustment
4. Real-time aesthetic consistency validation

## References

- [FIBO Integration](./FIBO_INTEGRATION.md)
- [FIBO API Documentation](https://fal.ai/models/bria/fibo/generate/structured_prompt/api)
- [Original Storyline System](./10-13-2025%20AI_STORYLINE_SYSTEM.md)
