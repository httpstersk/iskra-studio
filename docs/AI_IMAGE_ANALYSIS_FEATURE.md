# AI-Powered Image Analysis for HIGH-INTENSITY Video Generation

## Overview

This feature uses OpenAI's GPT-4o vision model to analyze uploaded images with extreme detail and generate HIGH-INTENSITY, CREATIVE Sora 2 video prompts with EXACTLY 1 CUT PER SECOND. Every video variation is explosive, dramatic, and pushes the boundaries of what's possible.

## Architecture

### 1. Image Analysis API (`/api/analyze-image`)

**Location:** `src/app/api/analyze-image/route.ts`

**Purpose:** Analyzes images using OpenAI's advanced vision capabilities (CLIP method) to extract comprehensive visual information.

**Analysis Dimensions:**
- Subject & Composition
- Visual Style & Aesthetic
- Lighting & Atmosphere
- Environment & Setting
- Dynamic Potential
- Cinematic Qualities

**Request:**
```typescript
POST /api/analyze-image
{
  "imageUrl": "https://..."
}
```

**Response:**
```typescript
{
  "analysis": "Detailed image analysis text...",
  "usage": { tokens, cost info }
}
```

### 2. Sora 2 Prompt Generator

**Location:** `src/lib/sora-prompt-generator.ts`

**Purpose:** Transforms image analysis into 4 distinct cinematic video prompts following the Sora 2 Prompting Guide best practices.

**Generated Styles (HIGH INTENSITY):**
1. **EXPLOSIVE ENERGY** - Maximum intensity with rapid-fire cuts, strobing lights, violent camera movements
2. **KALEIDOSCOPE REALITY** - Surreal fractured perspectives, mirror effects, gravity-defying impossibilities  
3. **FASHION STORM** - High-fashion meets hurricane, geometric lighting, editorial power moves
4. **TIME COLLAPSE** - Temporal warfare, speed ramps, reality time-lapsing, past/present/future collision

Each prompt includes:
- Style description with technical details (lenses, lighting, grading)
- **Full image analysis embedded** for context-aware generation
- Camera specifications (shot types, lenses, DOF)
- Lighting setup with mood
- **EXACTLY 1 CUT PER SECOND** - 4s = 4 shots, 8s = 8 shots, 12s = 12 shots
- Each shot has a unique dramatic name and precise description
- Second-by-second action breakdowns with visual specificity
- Background sound design matching intensity
- Camera notes for maintaining visual impact

### 3. Integration with Video Variation Handler

**Location:** `src/lib/handlers/sora-video-variation-handler.ts`

**Flow:**
1. User selects an image
2. Image is uploaded to fal.ai storage
3. **NEW:** Image URL is sent to analysis API
4. **NEW:** Analysis results are passed to prompt generator
5. **NEW:** 4 custom prompts are generated based on image content
6. Prompts are used for Sora 2 video generation
7. Fallback to preset prompts if analysis fails

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

The OpenAI API key is required for image analysis. Without it, the system will fall back to preset prompts.

## Benefits

### Before (Static Prompts)
- Fixed 4 camera movement styles
- No context from the actual image
- Generic descriptions
- Same prompts for all images
- Approximate timing, not precise cuts

### After (HIGH-INTENSITY AI-Powered Analysis)
- **EXTREME detail analysis** (7 dimensions: subject, color, lighting, environment, motion, cinematic potential, shot ideas)
- **EXACTLY 1 cut per second** - precise timing for maximum impact
- **12 unique shots per style** covering explosive movements, impossible angles, temporal effects
- Dynamic prompts based on actual image content with full analysis embedded
- Context-aware cinematography choices tailored to the image
- Each shot has dramatic naming: "PUNCH IN", "ORBITAL ASSAULT", "TIME COLLAPSE", etc.
- Second-by-second action breakdowns with visual specificity
- Creative direction pushing boundaries (kaleidoscope effects, gravity defiance, temporal paradoxes)

## Example Workflow

```typescript
// User uploads image of a woman on a city rooftop at sunset

// 1. Image Analysis Output:
"The image shows a young woman in her late 20s wearing a flowing 
red dress, standing on a brick rooftop with city skyline behind. 
Golden hour lighting from the right, warm tones, soft shadows..."

// 2. Generated Prompts:
// - Dynamic: High-energy sequence with rapid cuts emphasizing 
//   the red dress against urban environment
// - Atmospheric: Contemplative moment focusing on the emotional 
//   connection between subject and setting
// - Stylized: Fashion-forward treatment with bold red/gold palette
// - Temporal: Time-lapse showing light transition from golden hour 
//   to twilight

// 3. Result: 4 unique Sora 2 videos, each interpreting the 
//    same image through different cinematic lenses
```

## Error Handling

The system includes robust fallback mechanisms:

1. **Analysis API Failure:** Falls back to `FALLBACK_VIDEO_PROMPTS`
2. **OpenAI API Key Missing:** Uses preset prompts
3. **Network Issues:** Graceful degradation with user notification
4. **Toast Notifications:** Informs users of analysis progress and any issues

## Technical Details

### AI SDK Integration

Uses the official Vercel AI SDK (`@ai-sdk/openai`) for:
- Type-safe API calls
- Streaming support (future enhancement)
- Automatic error handling
- Token usage tracking

### Sora 2 Prompting Best Practices

All generated prompts follow the official Sora 2 Prompting Guide:
- Detailed shot descriptions with timing
- Professional cinematography terminology
- Specific camera movements and angles
- Lighting and color grading specifications
- Sound design considerations
- Optimized for 4-12 second clips

### Performance Considerations

- Image analysis runs in parallel with UI placeholder creation
- Async/await pattern prevents blocking
- Fallback prompts ensure generation never fails
- Console logging for debugging and monitoring

## Future Enhancements

Potential improvements:
- User-selectable prompt styles (let users choose from 8+ styles)
- Custom prompt templates
- Fine-tuning based on user preferences
- Multi-language support
- Advanced analysis with GPT-4o reasoning
- Integration with other vision models
- Prompt caching for similar images

## Code Quality

- ✅ TypeScript strict mode compatible
- ✅ ESLint passing
- ✅ Modular architecture
- ✅ Comprehensive error handling
- ✅ Detailed logging
- ✅ Follows existing code conventions
- ✅ **API-optimized prompts** (~900-1000 chars, fits within Sora API constraints)

## References

- [OpenAI Responses API Guide](https://ai-sdk.dev/cookbook/guides/openai-responses)
- [Sora 2 Prompting Guide](https://cookbook.openai.com/examples/sora/sora2_prompting_guide)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/)
