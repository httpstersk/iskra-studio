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
 * Expands a single storyline concept into a concise Sora-optimized prompt
 * Keeps prompts under 400 characters for API compatibility
 */
export function expandStorylineToPrompt(
  options: PromptGenerationOptions
): string {
  const { storyline, styleAnalysis, duration } = options;
  
  // Extract key visual elements
  const colors = styleAnalysis.colorPalette.dominant.slice(0, 2).join(" and ");
  const mood = styleAnalysis.mood.primary;
  const lighting = styleAnalysis.lighting.quality;
  const topMotifs = storyline.visualMotifs.slice(0, 2).join(", ");
  const topMoments = storyline.keyMoments.slice(0, 3).join(". ");
  
  // Build ultra-concise prompt focusing on visual storytelling
  return `${storyline.narrative} ${colors} color palette. ${lighting} lighting, ${mood} mood. ${storyline.setting}. ${topMoments}. Visual style: ${topMotifs}. ${storyline.cinematicStyle} cinematography with rapid ${duration}-second cuts.`.trim();
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


