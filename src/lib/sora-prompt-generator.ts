/**
 * Sora 2 Prompt Generator - OPTIMIZED FOR API
 * Expands storyline concepts into full Sora prompts with 1 CUT PER SECOND
 * Prompts optimized for Sora API character limits (~800 chars max)
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { StorylineConcept } from "@/lib/schemas/storyline-schema";

interface PromptGenerationOptions {
  storyline: StorylineConcept;
  styleAnalysis: ImageStyleMoodAnalysis;
  duration: number;
}

/**
 * Builds a concise style descriptor from analysis
 */
function buildStyleDescriptor(analysis: ImageStyleMoodAnalysis): string {
  const { colorPalette, lighting, mood, visualStyle } = analysis;
  
  const colors = colorPalette.dominant.slice(0, 3).join(", ");
  const colorMood = `${colorPalette.saturation}, ${colorPalette.temperature}`;
  const lightQuality = `${lighting.quality} lighting with ${lighting.mood} mood`;
  const aesthetic = visualStyle.aesthetic.slice(0, 2).join(", ");
  const energy = `${mood.energy} energy, ${mood.primary}`;
  
  return `${colors} palette (${colorMood}). ${lightQuality}. ${aesthetic} aesthetic. ${energy}.`;
}

/**
 * Generates camera/technical specifications based on cinematic style
 */
function buildTechnicalSpec(
  styleAnalysis: ImageStyleMoodAnalysis,
  storylineCinematicStyle: string
): string {
  const { cinematicPotential } = styleAnalysis;
  
  // Map cinematic style to technical approach
  const styleMap: Record<string, string> = {
    "commercial high-energy": "120fps high-speed. Anamorphic flares, motion blur streaks.",
    "surreal dreamlike": "Mixed frame rates. Heavy chromatic aberration, prism effects, glitch artifacts.",
    "editorial fashion": "RED 8K 60fps. Razor-sharp. Wind machine effects. Geometric light patterns.",
    "experimental time-based": "Mixed frame rates 12fps-240fps. Speed ramps, light streaks, motion trails.",
  };
  
  // Find matching style or default
  const matchingKey = Object.keys(styleMap).find(key => 
    storylineCinematicStyle.toLowerCase().includes(key)
  );
  
  return matchingKey 
    ? styleMap[matchingKey]
    : `High-quality cinematography. ${cinematicPotential.editingPace} pacing.`;
}

/**
 * Expands a single storyline concept into a complete Sora prompt
 */
export function expandStorylineToPrompt(
  options: PromptGenerationOptions
): string {
  const { storyline, styleAnalysis, duration } = options;
  
  const styleDesc = buildStyleDescriptor(styleAnalysis);
  const technicalSpec = buildTechnicalSpec(styleAnalysis, storyline.cinematicStyle);
  const effects = styleAnalysis.cinematicPotential.visualEffects.slice(0, 3).join(", ");
  
  // Build shot list from key moments
  const shotList = storyline.keyMoments.map((moment, index) => {
    const shotNumber = index + 1;
    return `${shotNumber}. ${moment}`;
  }).join("\n");
  
  // Build visual motifs list
  const motifs = storyline.visualMotifs.join(", ");
  
  return `${storyline.cinematicStyle.toUpperCase()}. ${technicalSpec} ${duration} RAPID 1-SECOND CUTS.

Style reference: ${styleDesc}

STORYLINE: ${storyline.narrative}
Setting: ${storyline.setting}

KEY SHOTS (${duration}s sequence):
${shotList}

Camera techniques: ${styleAnalysis.cinematicPotential.camerawork.slice(0, 4).join(", ")}
Visual motifs: ${motifs}
Effects: ${effects}

Lighting: ${styleAnalysis.lighting.direction}, ${styleAnalysis.lighting.quality}. ${styleAnalysis.lighting.mood} mood.

Emotional arc: ${storyline.emotionalArc}

INTENSITY: Every cut = VISUAL PUNCH. ${storyline.subject} commands the frame.`.trim();
}

/**
 * Expands multiple storylines into Sora prompts
 */
export function expandStorylinesToPrompts(
  storylines: StorylineConcept[],
  styleAnalysis: ImageStyleMoodAnalysis,
  duration: number
): string[] {
  return storylines.map(storyline => 
    expandStorylineToPrompt({ storyline, styleAnalysis, duration })
  );
}


