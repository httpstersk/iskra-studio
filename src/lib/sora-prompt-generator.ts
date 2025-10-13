/**
 * Sora 2 Prompt Generator - OPTIMIZED FOR API
 * Generates HIGH-INTENSITY creative prompts with 1 CUT PER SECOND
 * Prompts optimized for Sora API character limits (~800 chars max)
 */

interface PromptGenerationOptions {
  imageAnalysis: string;
  duration: number;
}

/**
 * Extracts brief visual summary from analysis
 */
function extractVisualSummary(analysis: string): string {
  const summary = analysis
    .substring(0, 150)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return summary + (analysis.length > 150 ? "..." : "");
}

/**
 * Generates 4 INTENSE cinematic prompts optimized for API constraints
 */
export function generateSoraPromptsFromAnalysis(
  options: PromptGenerationOptions
): string[] {
  const { imageAnalysis, duration } = options;
  const visualSummary = extractVisualSummary(imageAnalysis);

  return [
    generateExplosiveEnergyPrompt(visualSummary, duration),
    generateKaleidoscopeRealityPrompt(visualSummary, duration),
    generateFashionStormPrompt(visualSummary, duration),
    generateTimeCollapsePrompt(visualSummary, duration),
  ];
}

/**
 * Style 1: EXPLOSIVE ENERGY
 */
function generateExplosiveEnergyPrompt(
  visualSummary: string,
  duration: number
): string {
  return `EXPLOSIVE commercial cinematography. 120fps. ${duration} RAPID 1-SECOND CUTS. Anamorphic flares, motion blur streaks, hyper-saturated colors, crushed blacks, blown highlights.

Image: ${visualSummary}

Each second = NEW DRAMATIC ANGLE:
Violent zoom-ins → orbital camera spins → extreme macro details → overhead plunges → whip pans to profile → low-angle power shots → mirror reflections → wide pullback reveals → dutch tilt rotations → slow-mo explosions → tracking parallels → final lens flare.

Camera WHIPS between: extreme close-ups, wide reveals, macro textures. Strobing key light, cyan/magenta gels, practical bursts.

Subject actions: Snap attention → head whip → sharp gestures → body rotation → fabric flare → power step → intense expression → geometric poses.

CONTROLLED CHAOS. Subject sharp, environment explodes. Every cut = VISUAL PUNCH.`;
}

/**
 * Style 2: KALEIDOSCOPE REALITY
 */
function generateKaleidoscopeRealityPrompt(
  visualSummary: string,
  duration: number
): string {
  return `KALEIDOSCOPE surreal cinematography. ${duration} 1-SECOND CUTS. Reality SPLINTERS. Heavy chromatic aberration, prism effects, glitch artifacts. Colors shift: teal → magenta → toxic green → amber.

Image: ${visualSummary}

Each cut = IMPOSSIBLE PERSPECTIVE:
Still subject/moving background → mirrors multiply → gravity inverts → dutch 45° tilts → reflection paradoxes → fisheye distortion → color inversions → temporal splits → spiral zoom vertigo → digital glitches → prism rainbows → radial collapse.

Contradictory lighting. Colored practicals fighting. Volumetric chaos.

Actions: Perfect stillness → impossible symmetry → fragments multiply → gravity defies → temporal doubles → spiral motion → glitch reconstruction.

FEVER DREAM aesthetic. Subject recognizable but TRANSFORMED. Physics optional. Hypnotic rhythm.`;
}

/**
 * Style 3: FASHION STORM
 */
function generateFashionStormPrompt(
  visualSummary: string,
  duration: number
): string {
  return `ULTRA high-fashion editorial. RED 8K 60fps. ${duration} 1-SECOND CUTS. Razor-sharp. Wind machine BLASTING. Geometric light patterns. Bold color blocking, neon accents.

Image: ${visualSummary}

Each cut = POWER EDITORIAL ANGLE:
Emergence with wind → whip to profile → overhead symmetry → macro worship → low dominance → 360° spinning reveal → back mystery → dutch tilt edge → mirror doubles → fabric explosion → spotlight isolation → walk-off exit.

Hard key 45°, rim lights carving silhouette, gold/electric blue spots. Dramatic shadows, geometric patterns slash frame.

Actions: Power stance → sharp 90° turn → fierce eye contact → editorial gestures → hair flip → confident stride → sculptural poses.

FASHION WEAPON aesthetic. Subject OWNS frame. Every shot = magazine cover quality. Diagonal lines, triangular composition.`;
}

/**
 * Style 4: TIME COLLAPSE
 */
function generateTimeCollapsePrompt(
  visualSummary: string,
  duration: number
): string {
  return `TEMPORAL WARFARE cinematography. Mixed frame rates 12fps-240fps. ${duration} 1-SECOND CUTS. Time NON-LINEAR. Speed ramps MID-SHOT. Light streaks, motion trails, past/present/future collapse.

Image: ${visualSummary}

Each cut = TEMPORAL EFFECT:
Dawn rushes sunrise in 1s → sun arcs/shadow spins → crowd time-lapse blur → slow subject/fast world → reverse time flow → golden hour compression → day-to-night collapse → speed ramp stutter → motion trail echoes → frozen background/moving subject → weather transformation → temporal convergence (past/present/future versions coexist).

Natural light accelerated. Shadows move wrong. Sources rush through day-night in ${duration} cuts.

Subject = ANCHOR in temporal storm. Frozen while world rushes → slow-mo in accelerated reality → forward in backward time.

IMPOSSIBLE yet beautiful. Time is the special effect.`;
}
