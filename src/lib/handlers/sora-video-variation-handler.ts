/**
 * Sora 2 Video Variation Handler
 * Generates 4 cinematic video variations from a reference image using Sora 2 model
 * with AI-generated prompts based on image analysis
 */

import { VIDEO_DEFAULTS } from "@/constants/canvas";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { expandStorylinesToPrompts } from "@/lib/sora-prompt-generator";
import { generateStorylines } from "@/lib/storyline-generator";
import type {
  PlacedImage,
  PlacedVideo,
  VideoGenerationSettings,
} from "@/types/canvas";
import { snapPosition } from "@/utils/snap-utils";
import { calculateBalancedPosition } from "./variation-handler";

interface SoraVideoVariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  viewport: { x: number; y: number; scale: number };
  falClient: { storage: { upload: (blob: Blob) => Promise<string> } };
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setIsApiKeyDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveVideoGenerations: React.Dispatch<
    React.SetStateAction<Map<string, any>>
  >;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  customApiKey?: string;
  basePrompt?: string;
  videoSettings?: Partial<VideoGenerationSettings>;
}

/**
 * Fallback prompts for Sora 2 video variations (used if image analysis fails)
 * Based on Sora 2 prompting guide - creates dynamic videos with one cut per second
 */
const FALLBACK_VIDEO_PROMPTS = [
  `Style: High-energy commercial cinematography, 120fps slow-motion mixed with real-time cuts. Anamorphic flares, shallow depth of field, saturated color grade with crushed blacks and lifted highlights. Sharp motion blur on fast movements; lens breathing for intensity.

  [Reference image subject] becomes the focal point of a rapid-fire sequence. Environment adapts to create maximum visual drama: reflective surfaces, atmospheric haze, directional lighting that carves shadows and highlights. Each beat escalates energy.

  Cinematography:
  Camera: rapid cuts between angles—close-up, wide, overhead, tracking
  Lens: 24mm to 85mm mix; shallow DOF to isolate subject against chaos
  Lighting: hard key with colored gels (cyan/magenta split); practical flares
  Mood: explosive, visceral, relentless

  Optimized Shot List (4 shots / 4s total):
  0.00–1.00 — "Impact Frame" (close-up, snap zoom in)
  Hard cut from reference image. Camera punches into extreme close-up of subject's most striking feature. Single strobe flash creates freeze-frame effect with motion blur trails.

  1.00–2.00 — "Orbit Reveal" (wide shot, 270° barrel roll)
  Cut to wide. Camera spins rapidly around subject as environment explodes with particle effects, confetti, or light rays. Subject remains sharp; background streaks.

  2.00–3.00 — "Overhead Strike" (top-down, slow push)
  Cut to bird's eye view. Subject centered in frame. Dramatic shadows radiate outward. Camera descends slowly while subject performs micro-gesture (head turn, hand raise).

  3.00–4.00 — "Exit Flare" (medium shot, dolly back with lens flare)
  Cut to eye-level medium shot. Subject moves decisively toward camera. Bright light source behind creates anamorphic flare that consumes frame by end.

  Actions:
  - Shot 1: Eyes snap open / object revealed
  - Shot 2: Full rotation with dramatic gesture
  - Shot 3: Subtle movement holds attention
  - Shot 4: Decisive step forward into light

  Background Sound:
  Bass hit, whoosh transition, rising tone, impact reverb`,

  `Style: Surreal psychological thriller, color-graded like a fever dream. Heavy vignette, chromatic aberration on edges, unsettling color shifts (teal to amber). Film grain with digital glitch artifacts. Handheld micro-jitter creates unease.

  [Reference image subject] exists in a fractured reality where each second distorts space and logic. Environment bends, mirrors multiply, gravity questions itself. Beautiful but wrong—like a memory collapsing.

  Cinematography:
  Camera: disorienting angles; no two shots share same orientation
  Lens: 28mm wide with barrel distortion; everything slightly off-center
  Lighting: motivated sources that don't make sense; multiple colored practicals
  Mood: hypnotic, unsettling, beautiful decay

  Optimized Shot List (4 shots / 4s total):
  0.00–1.00 — "The Unchanged" (straight-on medium shot)
  Reference image holds perfectly still. Background begins subtle parallax drift. Subject remains frozen while world starts moving.

  1.00–2.00 — "Kaleidoscope Break" (Dutch angle, 45° tilt)
  Hard cut. Camera tilted. Multiple exposure effect—subject appears twice, slightly offset. Color shifts to inverted palette. Background kaleidoscopes.

  2.00–3.00 — "Gravity Hesitates" (upside-down wide shot)
  Cut to inverted perspective. Camera rotates 180°. Subject defies physics—floating, suspended, or standing on ceiling. Depth flattens.

  3.00–4.00 — "Collapse Inward" (extreme close-up with radial blur)
  Cut to tight shot of subject's eyes or hands. Radial motion blur pulls everything toward center. Frame distorts, stretches, then snaps to black.

  Actions:
  - Shot 1: Perfect stillness as world shifts
  - Shot 2: Double-take moment, head turns in two directions
  - Shot 3: Body reorients to impossible gravity
  - Shot 4: Small gesture triggers visual collapse

  Background Sound:
  Reversed audio, pitch-shifted breathing, clock ticking wrong, distant echo`,

  `Style: High-fashion runway meets music video intensity. Crisp digital capture with film emulation LUT, sharp contrast, bold color blocking. Wind effects, fabric motion, and dramatic lighting create constant movement. Cinematic 2.39:1 framing.

  [Reference image subject] becomes the center of a fashion storm—environment reacts to presence with wind, light bursts, and geometric elements. Each cut amplifies sophistication and edge.

  Cinematography:
  Camera: precise, editorial cuts; each angle more striking than the last
  Lens: 50mm and 135mm primes; razor-sharp focus, creamy bokeh
  Lighting: high-contrast key with rim lights; colored accents (gold, electric blue)
  Mood: confident, powerful, elevated

  Optimized Shot List (4 shots / 4s total):
  0.00–1.00 — "The Arrival" (medium-wide, slow push)
  Reference image comes alive. Camera glides forward. Wind kicks in—hair and fabric begin flowing. Single spotlight from above creates dramatic shadow.

  1.00–2.00 — "Profile Power" (side angle, sharp pan)
  Cut to 90° profile. Camera whips horizontally, creating motion blur, then locks sharp. Geometric light patterns project across subject. Strong rim light carves silhouette.

  2.00–3.00 — "Detail Obsession" (extreme close-up, orbital track)
  Cut to macro detail—jewelry, texture, eyes, lips. Camera arcs slowly around focal point. Everything else falls to soft bokeh. Secondary light kiss adds dimension.

  3.00–4.00 — "Exit Through Geometry" (wide shot, dolly back)
  Cut to wide. Subject walks toward camera while geometric light panels cascade behind. Camera pulls back to reveal full frame. Final light burst.

  Actions:
  - Shot 1: Subtle head tilt, wind catches hair
  - Shot 2: Sharp profile turn, eyes to camera
  - Shot 3: Micro-expression, detail movement
  - Shot 4: Confident stride forward, commanding presence

  Background Sound:
  Bass pulse, fabric rustle, heel click, atmospheric whoosh`,

  `Style: Experimental time-lapse meets narrative cinema. Mixed frame rates (12fps to 60fps), speed ramping, and temporal distortion. Day-to-night color shifts, light streaks, and controlled motion blur. Filmic texture with digital precision.

  [Reference image subject] exists across compressed time. Each second represents hours passing—light changes, environment transforms, but subject remains constant. Beautiful study of impermanence.

  Cinematography:
  Camera: locked position across all four shots for temporal continuity
  Lens: 35mm prime; deep depth of field captures environment change
  Lighting: natural progression from dawn to twilight in 4 seconds
  Mood: contemplative, surreal, poetic

  Optimized Shot List (4 shots / 4s total):
  0.00–1.00 — "Dawn Breaks" (locked medium shot)
  Reference image at sunrise. Cool blue light. Subject moves at normal speed while sky accelerates—clouds rush, sun rises rapidly. Long shadows shorten.

  1.00–2.00 — "Noon Burn" (same frame, time accelerates)
  Hard cut to midday. Subject performs one slow gesture while sun arcs overhead. Harsh top-down lighting. Shadows spin beneath. Background crowds blur past.

  2.00–3.00 — "Golden Descent" (same frame, atmosphere thickens)
  Cut to golden hour. Warm amber light floods frame. Subject continues slow motion gesture while light quality transforms dramatically. Sky goes from blue to orange.

  3.00–4.00 — "Night Settles" (same frame, stars emerge)
  Cut to dusk. Cool twilight. City lights flicker on in rapid succession. Stars streak into trails. Subject completes motion and holds. Moon rises in fast-forward.

  Actions:
  - Subject performs ONE continuous, slow gesture across all four cuts
  - Environment accelerates around stationary/slow-moving subject
  - Each cut is same camera position but different time of day
  - Final frame: subject has aged/changed subtly or not at all

  Background Sound:
  Time-stretch ambient—birds to crickets, city wakes to sleeps, wind shifts pitch`,
] as const;

/**
 * Analyzes an image using OpenAI's vision model with structured output
 */
async function analyzeImage(imageUrl: string): Promise<ImageStyleMoodAnalysis> {
  const response = await fetch("/api/analyze-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error || `Image analysis failed with status ${response.status}`
    );
  }

  const result = await response.json();
  return result.analysis;
}

/**
 * Uploads an image blob to fal.ai storage
 */
async function uploadImageToFal(
  blob: Blob,
  customApiKey: string | undefined,
  toast: SoraVideoVariationHandlerDeps["toast"],
  setIsApiKeyDialogOpen: SoraVideoVariationHandlerDeps["setIsApiKeyDialogOpen"]
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", blob, "image.png");

    const response = await fetch("/api/fal/upload", {
      method: "POST",
      body: formData,
      headers: customApiKey ? { authorization: `Bearer ${customApiKey}` } : {},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Upload failed with status ${response.status}`
      );
    }

    const result = await response.json();
    return result.url;
  } catch (error: unknown) {
    const isRateLimit =
      (error as { status?: number; message?: string }).status === 429 ||
      (error as { message?: string }).message?.includes("429") ||
      (error as { message?: string }).message?.includes("rate limit");

    if (isRateLimit) {
      toast({
        title: "Rate limit exceeded",
        description: "Add your FAL API key to bypass rate limits.",
        variant: "destructive",
      });
      setIsApiKeyDialogOpen(true);
    } else {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
    throw error;
  }
}

/**
 * Converts an image to a blob
 */
async function imageToBlob(imageSrc: string): Promise<Blob> {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.drawImage(img, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/png",
      0.95
    );
  });
}

/**
 * Generates 4 cinematic video variations from a reference image using Sora 2
 */
export const handleSoraVideoVariations = async (
  deps: SoraVideoVariationHandlerDeps
) => {
  const {
    images,
    selectedIds,
    falClient,
    setVideos,
    setIsGenerating,
    setIsApiKeyDialogOpen,
    setActiveVideoGenerations,
    toast,
    customApiKey,
    basePrompt = "",
    videoSettings = {},
  } = deps;

  // Validate selection
  if (selectedIds.length !== 1) {
    toast({
      title: "Select one image",
      description:
        "Please select exactly one image to generate video variations",
      variant: "destructive",
    });
    return;
  }

  const selectedImage = images.find((img) => img.id === selectedIds[0]);
  if (!selectedImage) {
    toast({
      title: "Image not found",
      description: "The selected image could not be found",
      variant: "destructive",
    });
    return;
  }

  setIsGenerating(true);

  try {
    // Upload the reference image
    toast({
      title: "Preparing image",
      description: "Uploading reference image...",
    });

    const blob = await imageToBlob(selectedImage.src);
    const imageUrl = await uploadImageToFal(
      blob,
      customApiKey,
      toast,
      setIsApiKeyDialogOpen
    );

    let videoPrompts: string[];

    try {
      // Stage 1: Analyze image style/mood
      const imageAnalysis = await analyzeImage(imageUrl);
      console.log("[Sora Variations] Stage 1: Image analysis completed:", {
        colorPalette: imageAnalysis.colorPalette.dominant,
        mood: imageAnalysis.mood.primary,
        energy: imageAnalysis.mood.energy,
        aesthetics: imageAnalysis.visualStyle.aesthetic,
      });

      toast({
        title: "Generating storylines",
        description: "Creating unique cinematic narratives...",
      });

      // Stage 2: Generate storyline concepts using AI
      const duration = parseInt(videoSettings.duration as string) || 4;
      const storylineSet = await generateStorylines({
        styleAnalysis: imageAnalysis,
        duration,
      });

      console.log("[Sora Variations] Stage 2: Generated storylines:", {
        count: storylineSet.storylines.length,
        styleTheme: storylineSet.styleTheme,
        titles: storylineSet.storylines.map((s) => s.title),
      });

      toast({
        title: "Expanding into prompts",
        description: "Building shot-by-shot sequences...",
      });

      // Stage 3: Expand storylines into full Sora prompts
      videoPrompts = expandStorylinesToPrompts(
        storylineSet.storylines,
        imageAnalysis,
        duration
      );

      console.log("[Sora Variations] Stage 3: Expanded prompts:", {
        promptCount: videoPrompts.length,
        avgLength: Math.round(
          videoPrompts.reduce((sum, p) => sum + p.length, 0) /
            videoPrompts.length
        ),
      });
    } catch (analysisError) {
      console.error(
        "[Sora Variations] Image analysis failed, using fallback prompts:",
        analysisError
      );

      toast({
        title: "Using fallback prompts",
        description:
          "Image analysis unavailable, using preset cinematic styles",
      });

      videoPrompts = [...FALLBACK_VIDEO_PROMPTS];
    }

    // Create video placeholders immediately for optimistic UI
    const timestamp = Date.now();
    const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

    // Position indices for 4 variations: top, right, bottom, left
    const positionIndices = [0, 2, 4, 6];

    const videoPlaceholders: PlacedVideo[] = videoPrompts.map(
      (promptText, index) => {
        const positionIndex = positionIndices[index];
        const position = calculateBalancedPosition(
          snappedSource.x,
          snappedSource.y,
          positionIndex,
          selectedImage.width,
          selectedImage.height,
          selectedImage.width,
          selectedImage.height
        );

        return {
          id: `sora-video-${timestamp}-${index}`,
          src: "", // Will be filled when generation completes
          x: position.x,
          y: position.y,
          width: selectedImage.width,
          height: selectedImage.height,
          rotation: 0,
          isVideo: true as const,
          duration: parseInt(videoSettings.duration as string) || 4,
          currentTime: VIDEO_DEFAULTS.CURRENT_TIME,
          isPlaying: VIDEO_DEFAULTS.IS_PLAYING,
          isLooping: VIDEO_DEFAULTS.IS_LOOPING,
          volume: VIDEO_DEFAULTS.VOLUME,
          muted: VIDEO_DEFAULTS.MUTED,
          isLoading: true,
        };
      }
    );

    // Add placeholders to canvas
    setVideos((prev) => [...prev, ...videoPlaceholders]);

    // Show generation started toast
    toast({
      title: "Generating video variations",
      description: `Creating 4 AI-analyzed cinematic videos with Sora 2 (${videoSettings.duration || 4}s each)...`,
    });

    // Set up active video generations
    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);

      videoPrompts.forEach((variationPrompt, index) => {
        const videoId = `sora-video-${timestamp}-${index}`;

        // Use the AI-generated variation prompt based on image analysis
        console.log(`[Sora Variation ${index}] Setting AI-generated prompt:`, {
          promptLength: variationPrompt.length,
          promptPreview: variationPrompt.substring(0, 150),
        });

        // Extract prompt from videoSettings to prevent overwriting our variation prompt
        const { prompt: _unusedPrompt, ...restVideoSettings } =
          videoSettings as any;

        newMap.set(videoId, {
          imageUrl,
          prompt: variationPrompt,
          modelId: "sora-2",
          resolution: videoSettings.resolution || "auto",
          aspectRatio: videoSettings.aspectRatio || "auto",
          duration: parseInt(videoSettings.duration as string) || 4,
          sourceImageId: selectedIds[0],
          isVariation: true,
          ...restVideoSettings, // Spread remaining settings without prompt
        });
      });

      return newMap;
    });

    setIsGenerating(false);
  } catch (error) {
    console.error("Error generating Sora video variations:", error);

    toast({
      title: "Generation failed",
      description:
        error instanceof Error
          ? error.message
          : "Failed to generate video variations",
      variant: "destructive",
    });

    setIsGenerating(false);
  }
};
