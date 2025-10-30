/** Prompt formatting: single space */
const PROMPT_SINGLE_SPACE = " ";
/** Prompt formatting: whitespace regex */
const PROMPT_WHITESPACE_REGEX = /\s+/g;
/**
 * Formats image variation prompts with flexible cinematography recomposition directives
 */

/**
 * Supported recomposition style families for image variation generation.
 */
export type ImageVariationRecompositionStyle =
  | "controlled-formalist"
  | "documentary-handheld"
  | "expressionist-dramatic"
  | "naturalistic"
  | "poetic-minimalist"
  | "stylized-graphic";

/**
 * Options to control how the image variation prompt recomposes the scene.
 * - All properties are optional; sensible defaults are applied.
 */
export interface ImageVariationOptions {
  /**
   * Cinematographer reference name to guide visual technique.
   * Use getAllCinematographerReferences() or getRandomCinematographerReference() for curated values.
   */
  cinematographerReference?: string;
  /**
   * Director reference name to guide aesthetic and storytelling approach.
   * Use getAllDirectorReferences() or getRandomDirectorReference() for curated values.
   */
  directorReference?: string;
  /**
   * Output formatting for the generated prompt.
   * - "multiline": Human-readable with headings and line breaks (default)
   * - "singleline": Compacted single-line string with whitespace collapsed
   */
  outputFormat?: "multiline" | "singleline";
  /**
   * Recomposition style family. Use "auto" to allow the model to pick a coherent style
   * that best suits the camera directive. Defaults to "auto".
   */
  recompositionStyle?: ImageVariationRecompositionStyle | "auto";
}

/** Guidance line: choose a single style. */
const AUTO_GUIDANCE_CHOOSE_ONE =
  "Choose ONE recomposition style that best suits the directive from the following list.";
/** Guidance line: avoid mixing styles. */
const AUTO_GUIDANCE_DO_NOT_MIX =
  "Do not mix styles; commit to a single coherent approach:";
/** Instruction bullet: apply directive prefix. */
const INSTRUCTION_APPLY_DIRECTIVE_PREFIX =
  "Apply this cinematography directive:";
/** Instruction bullet: output heavily influenced by reference image style. */
const INSTRUCTION_OUTPUT_IMPORTANT =
  "IMPORTANT: Edit the referenced image according to the user's instructions, while maintaining the colours, mood and cinematic style of the original.";
/** Instruction bullet: recompose according to chosen style. */
const INSTRUCTION_RECOMPOSE_CHOSEN_STYLE =
  "Recompose the scene according to the chosen style.";
/** Camera aesthetics bullet: pick focal length and aperture. */
const LINE_CAMERA_PICK_FOCAL_APERTURE =
  "Select focal length and aperture appropriate to the directive and style (e.g., 24–85mm, f/2.8–f/8).";
/** Cinematic mood bullet: maintain rendering quality. */
const LINE_CINEMATIC_MAINTAIN_RENDER_QUALITY =
  "Maintain consistent rendering quality and avoid novelty artifacts (excessive bloom or oversaturation).";
/** Cinematic mood bullet: subtle atmosphere for depth. */
const LINE_CINEMATIC_SUBTLE_ATMOSPHERE =
  "Subtle atmosphere is acceptable where appropriate (haze or particulate) to add depth.";
/** Cinematic mood bullet: preserve continuity with reference. */
const LINE_CINEMATIC_PRESERVE_CONTINUITY =
  "Preserve continuity with the reference while rebuilding composition, camera, and set design to fit the chosen style.";
/** Lighting and tone bullet: align lighting to style. */
const LINE_LIGHTING_ALIGN_TO_STYLE =
  "Align lighting with the chosen style (e.g., low-key, mid-key, high-key, natural, mixed).";
/** Lighting and tone bullet: retain color palette for continuity. */
const LINE_LIGHTING_RETAIN_COLOR_CONTINUITY =
  "Retain the original image's color palette and grading for tonal continuity unless the user prompt requests a departure.";
/** Reference bullet: cinematographer prefix. */
const LINE_REFERENCE_CINEMATOGRAPHER_PREFIX =
  "Cinematographer style reference:";
/** Reference bullet: director prefix. */
const LINE_REFERENCE_DIRECTOR_PREFIX = "Director aesthetic reference:";
/** Visual discipline bullet: remove conflicting elements. */
const LINE_VISUAL_REMOVE_CONFLICTS =
  "Remove elements that conflict with the user intent; keep composition clean and purposeful.";
/** Visual discipline bullet: ensure separation and geometry. */
const LINE_VISUAL_SEPARATION_GEOMETRY =
  "Ensure clear subject separation, intentional negative space, and balanced geometry.";
/** Visual discipline bullet: use camera and blocking to reinforce. */
const LINE_VISUAL_USE_CAMERA_BLOCKING =
  "Use camera height, angle, distance, and blocking to reinforce the directive.";

/** Section heading: Camera aesthetics. */
const SECTION_CAMERA_AESTHETICS = "CAMERA AESTHETICS:";
/** Section heading: Cinematic mood. */
const SECTION_CINEMATIC_MOOD = "CINEMATIC MOOD:";
/** Section heading: Instructions. */
const SECTION_INSTRUCTIONS = "INSTRUCTIONS:";
/** Section heading: Lighting and tone. */
const SECTION_LIGHTING_TONE = "LIGHTING AND TONE:";
/** Section heading: Reference influences. */
const SECTION_REFERENCE_INFLUENCES = "REFERENCE INFLUENCES:";
/** Section heading: Visual discipline. */
const SECTION_VISUAL_DISCIPLINE = "VISUAL DISCIPLINE:";
/** Heading for user-provided prompt section. */
const USER_PROMPT_HEADING = "USER PROMPT:";

/**
 * Cinematographer reference names (alphabetical)
 */
const CINEMATOGRAPHER_REFERENCES = [
  "Bradford Young",
  "Emmanuel Lubezki",
  "Gordon Willis",
  "Greg Toland",
  "Greig Fraser",
  "Haris Zambarloukos",
  "Hoyte van Hoytema",
  "Janusz Kamiński",
  "Linus Sandgren",
  "Mandy Walker",
  "Rachel Morrison",
  "Robert Elswit",
  "Roger Deakins",
  "Vittorio Storaro",
  "Wally Pfister",
] as const;

/**
 * Director reference names (alphabetical)
 */
const DIRECTOR_REFERENCES = [
  "Akira Kurosawa",
  "Alfonso Cuarón",
  "Bong Joon-ho",
  "Chloé Zhao",
  "Christopher Nolan",
  "David Fincher",
  "Denis Villeneuve",
  "Greta Gerwig",
  "Martin Scorsese",
  "Quentin Tarantino",
  "Ridley Scott",
  "Sofia Coppola",
  "Stanley Kubrick",
  "Steven Spielberg",
  "Wes Anderson",
] as const;

/**
 * Style-specific guidance snippets used to encourage diverse recompositions.
 * Values are multi-line bullet lists.
 */
const RECOMPOSITION_STYLE_GUIDANCE: Record<
  ImageVariationRecompositionStyle,
  string
> = {
  "controlled-formalist": [
    "- Controlled, deliberate framing with balanced composition.",
    "- Prefer stabilized moves (dolly/slider) or locked-off shots.",
    "- Geometric alignment and clean lines; minimal visual clutter.",
  ].join("\n"),
  "documentary-handheld": [
    "- Observational, handheld feel with naturalistic movement.",
    "- Imperfect framing and organic reframing; available light look.",
    "- Emphasize immediacy and authenticity.",
  ].join("\n"),
  "expressionist-dramatic": [
    "- Bold angles and dramatic shadow play with heightened contrast.",
    "- Psychological tension via exaggerated composition and lighting.",
    "- Selective focus and stylized highlights are welcome.",
  ].join("\n"),
  naturalistic: [
    "- Unobtrusive camera with realistic perspective and scale.",
    "- Ambient or motivated lighting with gentle contrast.",
    "- Composition supports subject without calling attention to the camera.",
  ].join("\n"),
  "poetic-minimalist": [
    "- Sparse composition and intentional negative space.",
    "- Subtle motion with restrained detail and clean backgrounds.",
    "- Understated tonal range and textures.",
  ].join("\n"),
  "stylized-graphic": [
    "- Strong shapes, color blocks, and graphic silhouettes.",
    "- Symmetry/asymmetry used intentionally for visual impact.",
    "- Bold visual motifs with clean edges.",
  ].join("\n"),
};

/**
 * Build guidance text for a given recomposition style.
 * If style is "auto", present a curated style list and instruct to pick one.
 */
function buildStyleGuidance(
  style: ImageVariationRecompositionStyle | "auto"
): string {
  if (style === "auto") {
    const styleList = Object.keys(RECOMPOSITION_STYLE_GUIDANCE)
      .sort()
      .map((s) => `- ${s}`)
      .join("\n");

    return [AUTO_GUIDANCE_CHOOSE_ONE, AUTO_GUIDANCE_DO_NOT_MIX, styleList].join(
      "\n"
    );
  }

  return RECOMPOSITION_STYLE_GUIDANCE[style];
}

/**
 * Flattens a text block into a single line by collapsing whitespace into single spaces.
 */
function flattenToSingleLine(text: string): string {
  return text.replace(PROMPT_WHITESPACE_REGEX, PROMPT_SINGLE_SPACE).trim();
}

/**
 * Generic helper to randomly select an item from an array.
 */
function getRandomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Builds the instructions section with directive and style guidance.
 */
function buildInstructionsSection(
  directive: string,
  styleGuidance: string
): string {
  return [
    SECTION_INSTRUCTIONS,
    `- ${INSTRUCTION_APPLY_DIRECTIVE_PREFIX} ${directive}`,
    `- ${INSTRUCTION_OUTPUT_IMPORTANT}`,
    styleGuidance,
  ].join("\n");
}

/**
 * Builds the reference influences section if references are provided.
 */
function buildReferencesSection(
  directorReference?: string,
  cinematographerReference?: string
): string {
  const referenceLines: string[] = [];

  if (directorReference) {
    referenceLines.push(
      `- ${LINE_REFERENCE_DIRECTOR_PREFIX} ${directorReference}`
    );
  }
  if (cinematographerReference) {
    referenceLines.push(
      `- ${LINE_REFERENCE_CINEMATOGRAPHER_PREFIX} ${cinematographerReference}`
    );
  }

  return referenceLines.length
    ? `${SECTION_REFERENCE_INFLUENCES}\n${referenceLines.join("\n")}`
    : "";
}

/**
 * Builds the camera aesthetics section.
 */
function buildCameraAestheticsSection(): string {
  return [
    SECTION_CAMERA_AESTHETICS,
    `- ${LINE_CAMERA_PICK_FOCAL_APERTURE}`,
  ].join("\n");
}

/**
 * Builds the lighting and tone section.
 */
function buildLightingToneSection(): string {
  return [
    SECTION_LIGHTING_TONE,
    `- ${LINE_LIGHTING_ALIGN_TO_STYLE}`,
    `- ${LINE_LIGHTING_RETAIN_COLOR_CONTINUITY}`,
  ].join("\n");
}

/**
 * Builds the visual discipline section.
 */
function buildVisualDisciplineSection(): string {
  return [
    SECTION_VISUAL_DISCIPLINE,
    `- ${LINE_VISUAL_REMOVE_CONFLICTS}`,
    `- ${LINE_VISUAL_SEPARATION_GEOMETRY}`,
    `- ${LINE_VISUAL_USE_CAMERA_BLOCKING}`,
  ].join("\n");
}

/**
 * Builds the cinematic mood section.
 */
function buildCinematicMoodSection(): string {
  return [
    SECTION_CINEMATIC_MOOD,
    `- ${LINE_CINEMATIC_MAINTAIN_RENDER_QUALITY}`,
    `- ${LINE_CINEMATIC_SUBTLE_ATMOSPHERE}`,
    `- ${LINE_CINEMATIC_PRESERVE_CONTINUITY}`,
  ].join("\n");
}

/**
 * Builds the user prompt section if a user prompt is provided.
 */
function buildUserPromptSection(userPrompt?: string): string {
  return userPrompt ? `\n\n${USER_PROMPT_HEADING}\n${userPrompt}` : "";
}

/**
 * Returns all cinematographer references in alphabetical order.
 */
export function getAllCinematographerReferences(): readonly string[] {
  return [...CINEMATOGRAPHER_REFERENCES];
}

/**
 * Returns all director references in alphabetical order.
 */
export function getAllDirectorReferences(): readonly string[] {
  return [...DIRECTOR_REFERENCES];
}

/**
 * Returns all recomposition styles in alphabetical order.
 */
export function getAllRecompositionStyles(): readonly ImageVariationRecompositionStyle[] {
  return Object.keys(
    RECOMPOSITION_STYLE_GUIDANCE
  ).sort() as ImageVariationRecompositionStyle[];
}

/**
 * Randomly selects one cinematographer reference from the available set.
 */
export function getRandomCinematographerReference(): string {
  return getRandomItem(CINEMATOGRAPHER_REFERENCES);
}

/**
 * Randomly selects one director reference from the available set.
 */
export function getRandomDirectorReference(): string {
  return getRandomItem(DIRECTOR_REFERENCES);
}

/**
 * Randomly selects one recomposition style from the available set.
 */
export function getRandomRecompositionStyle(): ImageVariationRecompositionStyle {
  return getRandomItem(getAllRecompositionStyles());
}

/**
 * Formats a prompt for image variation generation with flexible cinematography recomposition.
 *
 * @param directive - Camera directive from CAMERA_VARIATIONS.
 * @param userPrompt - Optional user-provided prompt for additional context.
 * @param options - Optional configuration for recomposition style selection.
 * @returns Formatted prompt with cinematography instructions.
 */
export function formatImageVariationPrompt(
  directive: string,
  userPrompt?: string,
  options: ImageVariationOptions = {}
): string {
  const {
    cinematographerReference,
    directorReference,
    outputFormat = "multiline",
    recompositionStyle = "auto",
  } = options;

  const styleGuidance = buildStyleGuidance(recompositionStyle);
  const referencesSection = buildReferencesSection(
    directorReference,
    cinematographerReference
  );

  const sections = [
    buildInstructionsSection(directive, styleGuidance),
    referencesSection,
    buildCameraAestheticsSection(),
    buildLightingToneSection(),
    buildVisualDisciplineSection(),
    buildCinematicMoodSection(),
  ].filter(Boolean);

  const prompt = `${sections.join("\n\n")}${buildUserPromptSection(userPrompt)}`;

  return outputFormat === "singleline" ? flattenToSingleLine(prompt) : prompt;
}
