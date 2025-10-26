/**
 * Storyline Image Generator
 * 
 * Generates single-frame narrative progressions with exponential time jumps.
 * Unlike video storylines (multi-beat sequences), this creates individual images
 * that show how a subject/scene evolves over exponentially increasing time periods.
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { calculateTimeProgression, formatTimeLabel } from "@/utils/time-progression-utils";

/**
 * System prompt for storyline image generation.
 * 
 * Focuses on:
 * 1. Narrative continuity (not random B-roll)
 * 2. Exponential time progression
 * 3. Enhanced visual coherence through exact style locking
 */
export const STORYLINE_IMAGE_GENERATION_SYSTEM_PROMPT = `
You are a master visual storyteller creating SINGLE-FRAME narrative progressions with EXPONENTIAL TIME JUMPS.

You will be given:
- A detailed style/mood analysis of a reference image
- The subject and context of that reference
- Time elapsed since the reference moment (exponential progression: 1min, 5min, 25min, 2h+, etc.)

Your mission: Generate STORYLINE SHOTS that show HOW THE SUBJECT/SCENE HAS EVOLVED over elapsed time.

CRITICAL REQUIREMENTS:

1. **NARRATIVE CONTINUITY**: This is NOT B-roll. Each image continues the story of the reference subject.
   - +1min: Immediate continuation (subtle change - character shifts position, light changes, small action)
   - +5min: Short-term development (small escalation - new element introduced, minor scene change)
   - +25min: Medium-term shift (clear progression - environment altered, mood shifted)
   - +2h+: Long-term transformation (major change - time-of-day shift, substantial narrative progress)

2. **EXPONENTIAL TIME LOGIC**: Time jumps increase exponentially (×5 multiplier)
   - Image 1: +1min later (almost immediate)
   - Image 2: +5min later (few minutes)
   - Image 3: +25min later (half hour)
   - Image 4: +125min = +2h5m later (two hours)
   - Image 8: +78,125min = ~54 days later
   - Show believable progression appropriate to elapsed time

3. **VISUAL COHERENCE LOCK** (ABSOLUTE PRIORITY):
   Every generated image MUST match the reference's aesthetic with EXACT precision.

   **Color Grading Lock**: Match EXACT colorimetry:
   - Brightness: {brightness}
   - Contrast: {contrast}
   - Color harmony: {harmony}
   - Warmth: {warmth}
   - Highlight tint: {highlightTint}
   - Shadow tint: {shadowTint}
   - Saturation: {saturation}
   - Specific hex colors: {dominantColors}

   **Lighting Signature Lock**: Replicate EXACT setup:
   - Key light: {keyLight}
   - Fill light: {fillLight}
   - Back light: {backLight}
   - Contrast ratio: {contrastRatio}
   
   **Lens Language Lock**: Match EXACT optical characteristics:
   - Focal length: {focalLength}mm
   - Aperture: {aperture}
   - Depth of field: {depthOfField}
   - Lens type: {lensType}
   - Lens look: {lensLook}
   
   **Post-Processing Lock**: Apply ALL effects:
   - Film grain intensity: {filmGrainIntensity}/100
   - Film grain type: {filmGrain}
   - Halation: {halation}
   - Vignette: {vignette}
   - Other effects: {postProcessingEffects}
   
   **Style Authority Lock**:
   - Cinematographer style: {cinematographer} (maintain their signature techniques)
   - Director aesthetic: {director} (follow their visual language)

4. **STYLE LOCK SENTENCE**: START EVERY PROMPT WITH the provided style lock sentence:
   "{styleLockPrompt}"
   
   This sentence encodes all critical visual parameters and MUST be the first element of every prompt.

5. **SUBJECT EVOLUTION**: Show natural progression of the reference subject
   - Early images (+1min, +5min): Subject still present, subtle changes
   - Medium images (+25min): Subject may have moved/changed, environment shifts
   - Late images (+2h+): Major transformations allowed, but narrative connection clear

6. **FORBIDDEN ELEMENTS**: 
   - Do NOT introduce completely unrelated subjects
   - Do NOT break visual coherence
   - Do NOT ignore the time progression logic
   - Do NOT create generic B-roll disconnected from the reference story

PROMPT STRUCTURE:
Each storyline prompt must be structured as:

"{styleLockPrompt}. [Time context: +{timeElapsed} later]. [Subject evolution]. [Scene changes appropriate to time elapsed]. [Maintain exact: color grading ({grading}), lighting signature, lens characteristics, film grain ({filmGrain}), cinematographer style ({cinematographer}), director aesthetic ({director})]. [Camera work]. [Atmospheric details]."

LENGTH REQUIREMENTS:
- Each prompt: 350-450 characters (increased for technical precision)
- Must be complete and self-contained
- Include all visual elements for exact style matching

EXAMPLE PROMPTS:

Reference: Portrait of a detective in a noir office at night

[+1min] "{styleLockPrompt}. One minute later: The detective leans back in his chair, cigarette smoke curling through the shaft of venetian blind light. Same teal-orange noir grading with crushed blacks, 85mm f/1.8 shallow DOF, hard side key with soft fill. Heavy 35mm Kodak grain, subtle vignette. Roger Deakins lighting, Denis Villeneuve mood."

[+5min] "{styleLockPrompt}. Five minutes later: The detective stands by the rain-streaked window, city lights bokeh in background. Maintaining desaturated noir palette, same hard side key now catching raindrops, 85mm f/1.8. Heavy film grain, corner vignette. Deakins shadows, Villeneuve atmosphere."

[+25min] "{styleLockPrompt}. Twenty-five minutes later: Empty office chair, detective's hat on desk, window now fully dark with distant neon reflections. Identical teal-orange grading, same lighting setup without subject, 85mm wide aperture. Heavy grain texture, vignette present. Deakins style lighting, Villeneuve narrative."

RESPONSE FORMAT:
Respond ONLY with JSON matching this structure:
{
  "concepts": [
    {
      "prompt": "Complete generation prompt with style lock prepended",
      "timeElapsed": 1,
      "timeLabel": "+1min",
      "narrativeNote": "Brief description of story beat (20-30 words)"
    },
    ...
  ]
}

The number of concepts will match the requested count (4, 8, or 12).
`;

/**
 * Storyline concept with time progression
 */
export interface StorylineImageConcept {
  /** Complete generation prompt with style lock */
  prompt: string;
  
  /** Time elapsed in minutes */
  timeElapsed: number;
  
  /** Formatted time label (e.g., "+1min", "+2h5m") */
  timeLabel: string;
  
  /** Brief narrative description */
  narrativeNote: string;
}

/**
 * Set of storyline image concepts
 */
export interface StorylineImageConceptSet {
  /** Array of storyline concepts */
  concepts: StorylineImageConcept[];
}

/**
 * Options for storyline image generation
 */
export interface GenerateStorylineImageConceptsOptions {
  /** Number of storyline images to generate */
  count: number;
  
  /** Style and mood analysis from reference image */
  styleAnalysis: ImageStyleMoodAnalysis;
  
  /** Optional user-provided context */
  userContext?: string;
}

/**
 * Generates storyline image concepts with exponential time progression.
 * 
 * Calls the API route which uses OpenAI to generate narrative progressions
 * that maintain visual coherence while advancing the story.
 * 
 * @param options - Generation options
 * @returns Promise resolving to storyline concept set
 * @throws Error if generation fails
 */
export async function generateStorylineImageConcepts(
  options: GenerateStorylineImageConceptsOptions
): Promise<StorylineImageConceptSet> {
  const { count, styleAnalysis, userContext } = options;

  const response = await fetch("/api/generate-storyline-images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      count,
      styleAnalysis,
      userContext,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `Storyline image generation failed with status ${response.status}`
    );
  }

  const result = await response.json();
  return result;
}

/**
 * Builds enriched style context string from analysis
 * Used to populate template variables in the system prompt
 */
export function buildStorylineStyleContext(
  analysis: ImageStyleMoodAnalysis
): Record<string, string> {
  const { colorPalette, lighting, visualStyle, styleSignature, narrativeTone } = analysis;

  return {
    // Colorimetry
    brightness: styleSignature.colorimetry.brightness,
    contrast: styleSignature.colorimetry.contrast,
    harmony: styleSignature.colorimetry.harmony,
    warmth: styleSignature.colorimetry.warmth,
    highlightTint: styleSignature.colorimetry.highlightTint,
    shadowTint: styleSignature.colorimetry.shadowTint,
    saturation: styleSignature.colorimetry.saturation.toString(),
    dominantColors: colorPalette.dominant.join(", "),
    grading: colorPalette.grading,
    
    // Lighting
    keyLight: styleSignature.lightingSignature.key,
    fillLight: styleSignature.lightingSignature.fill,
    backLight: styleSignature.lightingSignature.back,
    contrastRatio: styleSignature.lightingSignature.contrastRatio,
    
    // Lens
    focalLength: styleSignature.lensLanguage.focalLengthMm.toString(),
    aperture: styleSignature.lensLanguage.apertureF,
    depthOfField: styleSignature.lensLanguage.depthOfField,
    lensType: styleSignature.lensLanguage.lensType,
    lensLook: styleSignature.lensLanguage.look,
    
    // Post-processing
    filmGrainIntensity: styleSignature.postProcessingSignature.filmGrainIntensity.toString(),
    filmGrain: visualStyle.filmGrain,
    halation: styleSignature.postProcessingSignature.halation ? "present" : "none",
    vignette: styleSignature.postProcessingSignature.vignette,
    postProcessingEffects: visualStyle.postProcessing.join(", "),
    
    // Creative authorities
    cinematographer: narrativeTone.cinematographer,
    director: narrativeTone.director,
    
    // Style lock
    styleLockPrompt: styleSignature.styleLockPrompt,
  };
}
