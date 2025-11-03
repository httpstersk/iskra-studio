/**
 * Server Component wrapper for the main canvas page.
 *
 * Pre-fetches initial data on the server before rendering the client canvas,
 * reducing initial load time and improving user experience.
 */

import { Suspense } from "react";
import { InitialDataProvider } from "./initial-data-provider";
import LoadingFallback from "../loading-fallback";

/**
 * Server wrapper that loads data and wraps the canvas page.
 *
 * @param children - The client-side canvas page component
 */
export async function CanvasPageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InitialDataProvider>{children}</InitialDataProvider>
    </Suspense>
  );
}
