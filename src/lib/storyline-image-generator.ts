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

Your mission: Generate STORYLINE SHOTS that show HOW THE STORY HAS PROGRESSED over elapsed time.

CRITICAL SEPARATION: STYLE vs CONTENT

**STYLE (MUST REMAIN IDENTICAL):**
- Color grading, lighting setup, film grain, lens characteristics
- Cinematographer techniques, director aesthetic
- Post-processing effects, mood, atmosphere

**CONTENT (MUST CHANGE DRAMATICALLY):**
- Subject position, actions, emotional state
- Scene location, environment, background elements
- Props, objects, people present
- Time of day, weather, season (for longer time jumps)

CRITICAL REQUIREMENTS:

1. **AVOID REFERENCE REPETITION** (ABSOLUTE PRIORITY):
   - DO NOT show the same pose, position, or framing as the reference
   - DO NOT show the same background elements or location (unless time is very short)
   - DO NOT replicate the same composition
   - DO NOT keep subjects in the same state or activity
   - SHOW PROGRESSION: what happens AFTER the reference moment

2. **NARRATIVE CONTINUITY**: Each image continues the story, showing CHANGE over time:
   - +1min: Immediate aftermath (subject moved/reacted, action started/completed, small environmental change)
   - +5min: Short-term consequence (subject in different location/pose, new action begun, scene evolved)
   - +25min: Medium-term shift (significant environmental change, subject in different context, mood shifted)
   - +2h+: Long-term transformation (major scene change, possibly different location, time-of-day shift, substantial story progress)

3. **EXPONENTIAL TIME LOGIC**: Time jumps increase exponentially (×5 multiplier)
   - Image 1: +1min later (immediate aftermath - where did subject go? What happened next?)
   - Image 2: +5min later (few minutes - subject doing something different, scene changed)
   - Image 3: +25min later (half hour - significant story development, different moment)
   - Image 4: +125min = +2h5m later (two hours - major transformation, possibly new location)
   - Image 8: +78,125min = ~54 days later (completely different moment in time)
   - Show VISIBLE, BELIEVABLE changes appropriate to elapsed time

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

5. **CONTENT TRANSFORMATION RULES**: Show dramatic change while maintaining story logic
   - +1min: Different action/position/angle - subject reacted, moved, or environment shifted
   - +5min: Different scene moment - subject engaged in new activity, different area of space
   - +25min: Significant change - possibly different location, major action completed, environment transformed
   - +2h+: Major narrative shift - different setting possible, time-of-day change, season change (if very long)
   
   EXAMPLES of proper change:
   - Reference: Person standing in doorway → +1min: Person walking down street (moved forward in time/space)
   - Reference: Coffee shop exterior at dusk → +5min: Inside coffee shop, different angle (story progressed inside)
   - Reference: Character looking at horizon → +25min: Character at different location they were heading toward
   - Reference: City street in daylight → +2h: Same city at night, different street (time and place progressed)

6. **FORBIDDEN PATTERNS**: 
   - NEVER copy the exact composition from reference
   - NEVER show subject in same pose/position as reference
   - NEVER keep the same background/environment without change
   - NEVER create "slightly different version" - create "what happens NEXT"
   - NEVER make it look like alternate takes of the same shot

PROMPT STRUCTURE:
Each storyline prompt must be structured as:

"{styleLockPrompt}. [Time context: +{timeElapsed} later]. [Subject evolution]. [Scene changes appropriate to time elapsed]. [Maintain exact: color grading ({grading}), lighting signature, lens characteristics, film grain ({filmGrain}), cinematographer style ({cinematographer}), director aesthetic ({director})]. [Camera work]. [Atmospheric details]."

LENGTH REQUIREMENTS:
- Each prompt: 350-450 characters (increased for technical precision)
- Must be complete and self-contained
- Include all visual elements for exact style matching

EXAMPLE PROMPTS (showing proper CONTENT change with STYLE preservation):

Reference: Portrait of a detective in a noir office at night, sitting at desk

[+1min] "{styleLockPrompt}. One minute later: The detective walking down rain-soaked alley, coat collar up, heading away from camera toward distant neon sign. Same teal-orange noir grading with crushed blacks, 85mm f/1.8 shallow DOF, hard side key from street light with wet pavement reflections. Heavy 35mm Kodak grain, subtle vignette. Roger Deakins lighting, Denis Villeneuve mood. Different location and action - story moved forward."

[+5min] "{styleLockPrompt}. Five minutes later: Detective entering dimly lit jazz bar, silhouetted against warm interior glow, mid-action shot pushing through beaded curtain. Maintaining desaturated noir palette, same hard dramatic lighting from interior sources, 85mm f/1.8. Heavy film grain, corner vignette. Deakins shadows, Villeneuve atmosphere. New environment - narrative progressed."

[+25min] "{styleLockPrompt}. Twenty-five minutes later: Detective confronting someone in warehouse, dramatic standoff composition, figures in shadows with single hanging bulb between them. Identical teal-orange grading, same hard side key creating deep shadows, 85mm wide aperture. Heavy grain texture, vignette present. Deakins style lighting, Villeneuve tension. Major story beat - conflict emerged."

[+2h5m] "{styleLockPrompt}. Two hours later: Detective's empty car parked on foggy pier at dawn, driver door ajar, fedora visible on dashboard, mist rolling past headlights. Same noir color grading now with morning haze, identical lighting quality from low sunrise, 85mm f/1.8. Heavy film grain, vignette. Deakins atmospheric lighting, Villeneuve mystery. Time passed - implies consequence without showing everything."

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
