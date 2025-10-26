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

**CONTENT (MUST BE COMPLETELY DIFFERENT):**
- Different subjects, people, characters (NOT the reference subject)
- Different locations, environments, settings
- Different objects, props, items
- Different actions, moments, scenarios
- Different time of day, weather (for longer time jumps)

**ABSOLUTE RULE**: The reference image shows ONE moment. The storyline images show LATER moments in the same story WORLD, NOT the same subject/scene.

CRITICAL REQUIREMENTS:

1. **EXCLUDE ALL REFERENCE ELEMENTS** (ABSOLUTE PRIORITY):
   - DO NOT include ANY subjects, people, or characters from the reference image
   - DO NOT show ANY objects, props, or items visible in the reference
   - DO NOT use the same location, setting, or environment
   - DO NOT replicate ANY part of the reference composition
   - DO NOT show body parts, clothing, or accessories from reference
   - THINK: "What ELSE is happening in this world?" NOT "What is this subject doing now?"
   
   **REFRAME YOUR THINKING:**
   - Reference shows: Woman applying lipstick → Generate: Empty street where she's heading, or cafe she'll enter, or mirror reflection of someone else
   - Reference shows: Detective at desk → Generate: The crime scene he's investigating, or suspect's hideout, or evidence photos
   - Reference shows: Chef cooking → Generate: The restaurant dining room, or ingredients being delivered, or customer waiting

2. **NARRATIVE CONTINUITY**: Each image shows what ELSE is happening in the story world:
   - +1min: Related consequence/context (a door closing, footsteps departing, result of the action)
   - +5min: Connected location/event (where the story is heading, what's being affected, secondary characters)
   - +25min: Story world expansion (related spaces, consequences unfolding, contextual elements)
   - +2h+: Long-term effects (environments transformed, consequences visible, story world evolved)

3. **EXPONENTIAL TIME LOGIC**: Time jumps increase exponentially (×5 multiplier)
   - Image 1: +1min later (immediate ripple effect - what's happening elsewhere as a result?)
   - Image 2: +5min later (few minutes - related location or consequence unfolding)
   - Image 3: +25min later (half hour - story world expanded, different angle of narrative)
   - Image 4: +125min = +2h5m later (two hours - major story world transformation visible)
   - Image 8: +78,125min = ~54 days later (completely transformed world showing long-term effects)
   - Show VISIBLE story world evolution, NOT subject tracking

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

5. **CONTENT TRANSFORMATION RULES**: Show completely different elements of the story world
   - +1min: Different element/location (NOT the reference subject - show effects, consequences, or related spaces)
   - +5min: Expanded story context (completely different scene that's narratively connected)
   - +25min: Story world depth (show other characters, locations, or consequences)
   - +2h+: World transformation (how the story world has changed, evolved, or been affected)
   
   EXAMPLES showing proper EXCLUSION:
   - Reference: Woman applying lipstick in mirror → +1min: Empty lipstick tube on bathroom counter (she left)
   - Reference: Woman applying lipstick in mirror → +5min: Taxi pulling up outside building (where she's going)
   - Reference: Woman applying lipstick in mirror → +25min: Restaurant table set for two, empty chairs (destination awaiting)
   - Reference: Woman applying lipstick in mirror → +2h: Same mirror, different person's reflection (time passed, others using space)
   
   - Reference: Detective at desk with papers → +1min: Case file photo of crime scene (what he was looking at)
   - Reference: Detective at desk with papers → +5min: Dark warehouse exterior he's investigating (where story goes)
   - Reference: Detective at desk with papers → +25min: Suspect's apartment, empty (investigation progressed)
   - Reference: Detective at desk with papers → +2h: Police interrogation room, suspect in chair (case advanced)

6. **FORBIDDEN PATTERNS** (STRICTLY ENFORCE): 
   - NEVER include the reference subject/person/character in ANY form
   - NEVER show the same objects, items, or props from reference
   - NEVER use the same location, room, or setting
   - NEVER show the same body parts, hands, faces, or clothing
   - NEVER replicate ANY visual element from the reference
   - NEVER create "what the subject is doing now" - create "what ELSE is happening"
   - NEVER follow the subject - expand the WORLD
   - NEVER make variations - make PROGRESSION
   
   **KEY MINDSET**: You are NOT filming the same subject at different times. You are showing how the STORY WORLD evolves.

PROMPT STRUCTURE:
Each storyline prompt must be structured as:

"{styleLockPrompt}. [Time context: +{timeElapsed} later]. [Subject evolution]. [Scene changes appropriate to time elapsed]. [Maintain exact: color grading ({grading}), lighting signature, lens characteristics, film grain ({filmGrain}), cinematographer style ({cinematographer}), director aesthetic ({director})]. [Camera work]. [Atmospheric details]."

LENGTH REQUIREMENTS:
- Each prompt: 350-450 characters (increased for technical precision)
- Must be complete and self-contained
- Include all visual elements for exact style matching

EXAMPLE PROMPTS (showing proper EXCLUSION with STYLE preservation):

Reference: Portrait of a detective in a noir office at night, sitting at desk looking at case files

[+1min] "{styleLockPrompt}. One minute later: Close-up of crime scene photograph lying on wet pavement, rain drops hitting the glossy surface, photo shows warehouse interior. Same teal-orange noir grading with crushed blacks, 85mm f/1.8 shallow DOF, hard side key from street lamp above with water reflections. Heavy 35mm Kodak grain, subtle vignette. Roger Deakins lighting, Denis Villeneuve mood. Detective left, now we see what he was investigating."

[+5min] "{styleLockPrompt}. Five minutes later: Dark warehouse exterior at night, loading dock door ajar, single yellow bulb visible inside casting shaft of light into foggy alley. Maintaining desaturated noir palette, same hard dramatic side lighting from industrial fixtures, 85mm f/1.8. Heavy film grain, corner vignette. Deakins shadows, Villeneuve atmosphere. Location from case file - where story is heading."

[+25min] "{styleLockPrompt}. Twenty-five minutes later: Abandoned warehouse interior, overturned chair in spotlight from cracked skylight, evidence markers numbered on concrete floor, dust particles in light beam. Identical teal-orange grading, same hard side key from overhead source creating deep shadows, 85mm wide aperture. Heavy grain texture, vignette present. Deakins style lighting, Villeneuve tension. Crime scene discovered - investigation unfolding."

[+2h5m] "{styleLockPrompt}. Two hours later: Police interrogation room, empty metal chair at table facing one-way mirror, coffee cup still steaming, tape recorder visible. Same noir color grading with institutional fluorescent modified to match tungsten warmth, identical hard lighting quality from above, 85mm f/1.8. Heavy film grain, vignette. Deakins atmospheric lighting, Villeneuve mystery. Case progressed - suspect brought in, detective's work paid off."

NOTE: The detective NEVER appears. We see the story world affected by his investigation, but we expand the narrative universe rather than tracking him.

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
