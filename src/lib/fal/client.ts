import { createFalClient, type FalClient } from "@fal-ai/client";
import { FAL_PROXY_PATH } from "./constants";

/**
 * Ensures the default FAL API key is available from environment variables.
 *
 * @returns The FAL API key from environment
 * @throws Error if FAL_KEY is not set
 */
export function ensureDefaultFalKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY environment variable is not set");
  }
  return key;
}

/**
 * Creates a FAL client configured to use the proxy endpoint.
 *
 * @returns A FalClient instance configured for proxy usage
 */
export function createProxyFalClient(): FalClient {
  return createFalClient({
    proxyUrl: FAL_PROXY_PATH,
  });
}

let defaultServerClient: FalClient | null = null;

/**
 * Gets or creates the singleton default server-side FAL client.
 *
 * @returns The default FalClient instance with server credentials
 */
function getDefaultServerClient(): FalClient {
  if (!defaultServerClient) {
    const key = ensureDefaultFalKey();
    defaultServerClient = createFalClient({
      credentials: () => key,
    });
  }
  return defaultServerClient;
}

/**
 * Creates or retrieves the default server-side FAL client.
 *
 * @returns A FalClient instance with server credentials
 */
export function createServerFalClient(): FalClient {
  return getDefaultServerClient();
}

/**
 * Gets the default server client for internal use.
 * @internal
 */
export function getDefaultClient(): FalClient {
  return getDefaultServerClient();
}
