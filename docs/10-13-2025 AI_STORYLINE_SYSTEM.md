# AI-Powered Dynamic Storyline System - Complete Documentation

## System Overview

A complete two-stage AI generation pipeline that creates unique cinematic video storylines at runtime based on reference image analysis.

**Flow**: Image → Style/Mood/Subject Analysis → Dynamic Storyline Generation → Concise Sora Prompts → 4 Video Variations

---

## Key Features

✅ **Subject-Aware**: Analyzes what's in the reference image  
✅ **Style-Matched**: Preserves visual aesthetic and emotional tone  
✅ **Thematically Coherent**: Generates variations related to the subject  
✅ **Dynamic Runtime Generation**: Infinite variety via AI  
✅ **Sora-Optimized**: Prompts under 400 characters  
✅ **Production-Ready**: Secure server-side API calls with error handling  

---

## Architecture

### Stage 1: Image Analysis (Server-Side)
**API Route**: `/api/analyze-image`

Analyzes reference image for:
1. **Subject/Scene** - What's in the image (person, object, landscape, etc.)
2. **Color Palette** - Dominant colors, saturation, temperature
3. **Lighting** - Quality, direction, mood, atmosphere
4. **Visual Style** - Aesthetic, texture, composition, depth
5. **Mood** - Primary/secondary emotions, energy level
6. **Cinematic Potential** - Motion styles, camerawork, editing pace
7. **Narrative Tone** - Genres, intensity, storytelling approach

**Returns**: Structured `ImageStyleMoodAnalysis` object via `generateObject()`

### Stage 2: Storyline Generation (Server-Side)
**API Route**: `/api/generate-storylines`

Generates 4 unique storyline concepts that:
- Are **thematically related** to the reference subject
- Match the **visual style and mood** of the reference
- Provide **different narratives** and interpretations
- Include specific visual motifs and key moments

**Returns**: Structured `StorylineSet` with 4 storyline concepts

### Stage 3: Prompt Expansion (Client-Side)
**Function**: `expandStorylinesToPrompts()`

Converts storylines into ultra-concise Sora prompts:
- **Under 400 characters** for API compatibility
- **Natural language** format (no structured sections)
- Includes: narrative + colors + lighting + setting + key moments + visual style
- Optimized for Sora API validation

**Returns**: Array of 4 Sora-ready prompt strings

---

## File Structure

### New Files Created

```
src/
├── lib/
│   ├── schemas/
│   │   ├── image-analysis-schema.ts    ✨ Subject + Style/Mood schema
│   │   └── storyline-schema.ts         ✨ Storyline concept schema
│   ├── storyline-generator.ts          ✨ Client wrapper (fetch API)
│   └── sora-prompt-generator.ts        ♻️ Concise prompt expansion
└── app/
    └── api/
        ├── analyze-image/
        │   └── route.ts                 ♻️ Subject-aware analysis
        └── generate-storylines/
            └── route.ts                 ✨ Server-side AI generation
```

### Documentation Created

```
SUBJECT_CONTEXT_UPDATE.md   - Subject awareness update
SORA_PROMPT_FIX.md          - Prompt length optimization
OPENAI_KEY_FIX.md           - Server-side API architecture
FIX_SUMMARY.md              - Quick fix reference
DYNAMIC_STORYLINE_GUIDE.md  - Developer guide
AI_STORYLINE_SYSTEM.md      - This file
```

---

## Example Output

### Reference Image Analysis
```typescript
{
  subject: {
    type: "person",
    description: "lone figure in urban environment",
    context: "contemplating, solitary"
  },
  colorPalette: {
    dominant: ["midnight indigo", "electric cobalt", "warm amber"],
    mood: "melancholic and introspective",
    saturation: "balanced",
    temperature: "mixed"
  },
  mood: {
    primary: "melancholic solitude",
    energy: "calm"
  },
  // ... more fields
}
```

### Generated Storylines
```typescript
{
  storylines: [
    {
      title: "Urban Wanderer",
      subject: "solitary figure",
      setting: "rain-soaked city streets",
      narrative: "A lone wanderer moves through empty streets...",
      visualMotifs: ["neon reflections", "rain streaks"],
      keyMoments: ["Emerges from alley", "Pauses at crosswalk", ...]
    },
    // ... 3 more thematically related storylines
  ]
}
```

### Final Sora Prompts (~350 chars each)
```
A lone wanderer moves through empty streets seeking meaning in neon-lit solitude. 
midnight indigo and electric cobalt color palette. mixed lighting, melancholic 
solitude mood. rain-soaked city streets. Emerges from alley. Pauses at crosswalk. 
Rain reflects neon. Visual style: neon reflections, rain streaks. artistic neo-noir 
cinematography with rapid 4-second cuts.
```

---

## Key Improvements

### 1. Subject Awareness ✨ NEW
**Before**: Ignored subjects, created random storylines  
**After**: Analyzes subject, creates thematically related variations

**Example**:
- Reference: Person in cityscape
- Old: Generated warrior, model, dancer, artist (random) ❌
- New: Generated wanderer, detective, philosopher, worker (related) ✅

### 2. Prompt Optimization 🎯
**Before**: ~1000 character structured prompts (422 error)  
**After**: ~350 character natural language (works!)

**Changes**:
- Removed section headers (KEY SHOTS:, Camera:, etc.)
- Single flowing paragraph
- Top 2-3 elements only
- Natural, readable descriptions

### 3. Server-Side Security 🔒
**Before**: Client-side OpenAI calls (exposed API key)  
**After**: Server-side API routes with secure env access

**Benefits**:
- API key never exposed
- Rate limiting possible
- Request validation
- Production-ready

---

## API Usage

### 1. Analyze Image
```typescript
POST /api/analyze-image
Body: { imageUrl: string }
Returns: { analysis: ImageStyleMoodAnalysis, usage: object }
```

### 2. Generate Storylines
```typescript
POST /api/generate-storylines
Body: { styleAnalysis: ImageStyleMoodAnalysis, duration: number }
Returns: { storylines: StorylineSet, usage: object }
```

### 3. Client-Side Usage
```typescript
import { generateStorylines } from "@/lib/storyline-generator";
import { expandStorylinesToPrompts } from "@/lib/sora-prompt-generator";

// Get analysis (via handler)
const analysis = await analyzeImage(imageUrl);

// Generate storylines
const storylineSet = await generateStorylines({
  styleAnalysis: analysis,
  duration: 4,
});

// Expand to prompts
const prompts = expandStorylinesToPrompts(
  storylineSet.storylines,
  analysis,
  4
);
```

---

## Configuration

### Environment Variables Required
```bash
OPENAI_API_KEY=sk-...  # For both analysis and storyline generation
```

### AI Models Used
- **Image Analysis**: GPT-4o with vision
- **Storyline Generation**: GPT-4o with structured output

### API Costs
- ~$0.01-0.03 per complete generation (2 OpenAI calls)
- Analysis: ~$0.005-0.01
- Storylines: ~$0.005-0.02

---

## Testing

### Test Different Subject Types

1. **People**: Generates people in similar contexts
2. **Landscapes**: Creates landscape variations
3. **Objects**: Focuses on object themes
4. **Abstract**: Abstract variations with similar aesthetics
5. **Urban Scenes**: Stays urban
6. **Nature**: Stays natural

### Validation Checks

```typescript
// Prompt length
const prompt = expandStorylineToPrompt(options);
console.assert(prompt.length < 400, "Prompt too long!");

// Subject relevance
const storylines = await generateStorylines(options);
storylines.storylines.forEach(s => {
  console.log(`Subject type: ${s.subject}`);
  // Should be related to reference subject
});
```

---

## Error Handling

### Fallback System
If AI generation fails, system falls back to predefined prompts:
```typescript
try {
  // Stage 1 & 2
  const analysis = await analyzeImage(imageUrl);
  const storylines = await generateStorylines({ styleAnalysis: analysis });
  const prompts = expandStorylinesToPrompts(storylines.storylines, analysis);
} catch (error) {
  // Use fallback prompts
  videoPrompts = [...FALLBACK_VIDEO_PROMPTS];
}
```

### Common Issues

**422 Validation Error from Sora**:
- Prompt too long (check < 400 chars)
- Invalid characters or formatting
- Missing required fields

**OpenAI API Errors**:
- Check API key is set
- Verify model names ("gpt-4o" not "gpt-5")
- Check rate limits

---

## Best Practices

### For Storyline Quality
1. ✅ Ensure reference images are clear
2. ✅ Provide good subject context in analysis
3. ✅ Test with diverse image types
4. ✅ Monitor generated storyline relevance

### For Prompt Quality  
1. ✅ Keep prompts under 400 characters
2. ✅ Use natural, flowing language
3. ✅ Focus on visual storytelling
4. ✅ Avoid technical jargon

### For Performance
1. ✅ Cache analyses for same image
2. ✅ Monitor API costs
3. ✅ Use fallbacks for reliability
4. ✅ Log everything for debugging

---

## Future Enhancements

Potential improvements:
- [ ] User selection of preferred storylines
- [ ] Style presets for specific moods
- [ ] More than 4 storylines with filtering
- [ ] Streaming storyline generation
- [ ] A/B testing different prompt formats
- [ ] Caching similar style analyses
- [ ] User feedback loop for quality

---

## Summary

The AI-powered storyline system provides:
- 🎯 **Thematic coherence** with reference images
- 🎨 **Infinite variety** through runtime generation
- 🔒 **Production-ready** security and error handling
- ⚡ **Sora-optimized** prompts that actually work
- 🚀 **Complete automation** from image to video

Every video generation is unique, creative, and meaningfully connected to the reference image while maintaining the desired visual style and mood.
