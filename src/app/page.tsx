/**
 * Canvas Page - Main application page (Server Component Wrapper)
 * 
 * Pre-fetches initial data server-side before rendering the canvas.
 * This improves Time to Interactive (TTI) and reduces client-side waterfalls.
 */

import { CanvasPageWrapper } from "@/components/server/canvas-page-wrapper";
import { CanvasPageClient } from "./canvas-page-client";

/**
 * Server Component: Main canvas page entry point
 * 
 * Benefits of this architecture:
 * - Server-side data pre-fetching eliminates waterfall requests
 * - User data, projects, and quota loaded before client hydration
 * - Improved perceived performance and faster Time to Interactive
 * - Progressive loading with Suspense boundaries
 */
export default async function CanvasPage() {
  return (
    <CanvasPageWrapper>
      <CanvasPageClient />
    </CanvasPageWrapper>
  );
}
