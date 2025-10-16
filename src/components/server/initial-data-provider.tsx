/**
 * Server Component that pre-fetches and provides initial application data.
 * 
 * This component runs only on the server and fetches data before rendering.
 * It passes the data to client components, eliminating client-side waterfalls.
 */

import { preloadAppData } from "@/lib/server/convex-server";
import { InitialDataClient } from "./initial-data-client";

/**
 * Server Component: Loads initial data and passes to client wrapper.
 * 
 * Benefits:
 * - Pre-fetches user data and projects on server
 * - Reduces Time to First Byte (TTFB) for authenticated users
 * - Eliminates client-side waterfall of auth → user → projects
 * - Data is available immediately on page load
 */
export async function InitialDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialData = await preloadAppData();

  return (
    <InitialDataClient initialData={initialData}>
      {children}
    </InitialDataClient>
  );
}
