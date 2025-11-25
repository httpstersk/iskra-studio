import { router } from "../init";
import { generateFiboImageVariation } from "./procedures/generate-fibo-image-variation";
import { generateImageStream } from "./procedures/generate-image-stream";
import { generateImageToVideo } from "./procedures/generate-image-to-video";
import { generateImageVariation } from "./procedures/generate-image-variation";
import { generateTextToImage } from "./procedures/generate-text-to-image";

/**
 * tRPC application router for image and video generation workflows.
 *
 * @remarks
 * This router exposes streaming subscriptions for long-running operations and
 * mutations for single-shot requests. It integrates with fal.ai through a
 * server-side client, transparently applying rate limits.
 */
export const appRouter = router({
  generateImageToVideo,
  generateTextToImage,
  generateImageStream,
  generateImageVariation,
  generateFiboImageVariation,
});

export type AppRouter = typeof appRouter;
