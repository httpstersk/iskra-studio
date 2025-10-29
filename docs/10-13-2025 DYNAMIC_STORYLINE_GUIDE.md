# Dynamic Storyline Generation - Developer Guide

## Quick Start

The system now generates completely unique storylines at runtime using AI instead of hardcoded templates.

## How It Works

### 1. Image Upload
User uploads a reference image to generate video variations from.

### 2. Style/Mood Analysis (Stage 1)
```typescript
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";

// API route: /api/analyze-image
const analysis: ImageStyleMoodAnalysis = await analyzeImage(imageUrl);

// Returns structured data:
// - colorPalette: { dominant, mood, saturation, temperature }
// - lighting: { quality, direction, mood, atmosphere }
// - visualStyle: { aesthetic, texture, composition, depth }
// - mood: { primary, secondary, energy, atmosphere }
// - cinematicPotential: { motionStyle, camerawork, editingPace, visualEffects }
// - narrativeTone: { genre, intensity, storytellingApproach }
```

### 3. Generate Storylines (Stage 2)
```typescript
import { generateStorylines } from "@/lib/storyline-generator";
import type { StorylineSet } from "@/lib/schemas/storyline-schema";

const storylineSet: StorylineSet = await generateStorylines({
  styleAnalysis: analysis,
  duration: 4, // seconds
});

// Returns 4 unique storylines:
// storylineSet.storylines[0] = {
//   title: "Cyber Samurai",
//   subject: "warrior in neon armor",
//   setting: "rain-soaked neon district",
//   narrative: "A lone warrior emerges from digital chaos...",
//   visualMotifs: ["neon reflections", "rain streaks", "holographic glitches"],
//   emotionalArc: "Tension builds to explosive confrontation",
//   cinematicStyle: "commercial high-energy",
//   keyMoments: ["Emerge from shadows", "Blade ignites", ...]
// }
```

### 4. Expand to Prompts (Stage 3)
```typescript
import { expandStorylinesToPrompts } from "@/lib/sora-prompt-generator";

const prompts: string[] = expandStorylinesToPrompts(
  storylineSet.storylines,
  analysis,
  4 // duration in seconds
);

// Returns 4 fully-formed Sora API prompts
// Each ~600-800 characters with:
// - Technical specs (frame rate, camera, effects)
// - Style reference
// - Storyline narrative
// - Shot-by-shot breakdown
// - Camera techniques
// - Lighting details
// - Emotional arc
```

## Customization

### Modify Storyline Prompt
Edit `src/lib/storyline-generator.ts` to change how storylines are generated:

```typescript
const STORYLINE_GENERATION_PROMPT = `
  Your custom instructions here...
  - Add genre preferences
  - Specify character types
  - Control narrative tone
  - etc.
`;
```

### Modify Style Analysis
Edit `src/app/api/analyze-image/route.ts` to focus on different aspects:

```typescript
const IMAGE_STYLE_MOOD_PROMPT = `
  Analyze focusing on:
  - Your custom focus areas
  - Additional style elements
  - etc.
`;
```

### Modify Prompt Template
Edit `src/lib/sora-prompt-generator.ts` → `expandStorylineToPrompt()`:

```typescript
export function expandStorylineToPrompt(options: PromptGenerationOptions): string {
  // Customize how storylines become prompts
  // Change formatting, add sections, etc.
}
```

## Error Handling

The system includes fallback prompts if AI generation fails:

```typescript
try {
  // Stage 1: Analyze
  const analysis = await analyzeImage(imageUrl);
  
  // Stage 2: Generate storylines
  const storylineSet = await generateStorylines({ styleAnalysis: analysis, duration });
  
  // Stage 3: Expand prompts
  const prompts = expandStorylinesToPrompts(storylineSet.storylines, analysis, duration);
  
} catch (error) {
  // Falls back to FALLBACK_VIDEO_PROMPTS
  console.error("AI generation failed, using fallbacks");
  videoPrompts = [...FALLBACK_VIDEO_PROMPTS];
}
```

## Performance

- **Stage 1 (Analysis)**: ~2-4 seconds
- **Stage 2 (Storylines)**: ~3-6 seconds
- **Stage 3 (Expansion)**: <100ms (no AI call)
- **Total**: ~5-10 seconds for complete generation

## API Costs

- 2 OpenAI API calls per generation:
  1. Image analysis (GPT-4o with vision)
  2. Storyline generation (GPT-4o)
- Estimated: ~$0.01-0.03 per generation

## Testing

```typescript
// Test style analysis
const testAnalysis = await fetch('/api/analyze-image', {
  method: 'POST',
  body: JSON.stringify({ imageUrl: 'https://...' }),
});

// Test storyline generation directly
import { generateStorylines } from '@/lib/storyline-generator';

const storylines = await generateStorylines({
  styleAnalysis: mockAnalysis,
  duration: 4,
});
```

## Best Practices

1. **Cache style analysis**: If generating multiple variations from same image
2. **Validate storylines**: Check that AI returned valid data before expanding
3. **Monitor costs**: Track OpenAI API usage
4. **Test fallbacks**: Ensure fallback prompts work if AI fails
5. **Log everything**: Keep detailed logs for debugging

## Future Enhancements

Potential improvements:
- Cache storylines for similar styles
- Allow user to select preferred storyline
- A/B test different storyline prompts
- Add more cinematic styles to technical spec mapping
- Stream storyline generation for faster UX
- Generate more than 4 storylines and let user choose
