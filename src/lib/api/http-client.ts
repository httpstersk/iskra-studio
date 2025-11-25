/**
 * Unified HTTP client with timeout, retry, and error handling
 * Uses errors-as-values pattern with @safe-std/error
 */

import { HttpErr, isErr, tryPromise } from "@/lib/errors/safe-errors";

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

export interface FetchResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

class HttpClient {
  private defaultTimeout = 30000;
  private defaultRetries = 0;

  /**
   * Fetch JSON data with automatic retry, timeout, and error handling
   * Returns errors as values instead of throwing
   */
  async fetchJson<T>(
    url: string,
    config: RequestConfig = {},
  ): Promise<T | HttpErr> {
    const response = await this.fetch<T>(url, config);
    if (isErr(response)) {
      return response;
    }
    return response.data;
  }

  /**
   * Fetch with full response details
   * Returns errors as values instead of throwing
   */
  async fetch<T>(
    url: string,
    config: RequestConfig = {},
  ): Promise<FetchResponse<T> | HttpErr> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      signal,
    } = config;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal,
    };

    // Don't add body for GET/HEAD requests
    if (body !== undefined && method !== "GET" && method !== "HEAD") {
      fetchOptions.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }

    return this.fetchWithRetry<T>(url, fetchOptions, timeout, retries);
  }

  /**
   * Fetch with FormData (for file uploads)
   * Returns errors as values instead of throwing
   */
  async fetchFormData<T>(
    url: string,
    formData: FormData,
    config: Omit<RequestConfig, "body"> = {},
  ): Promise<T | HttpErr> {
    const {
      method = "POST",
      headers = {},
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      signal,
    } = config;

    const fetchOptions: RequestInit = {
      method,
      headers, // Don't set Content-Type for FormData
      body: formData,
      signal,
    };

    const response = await this.fetchWithRetry<T>(
      url,
      fetchOptions,
      timeout,
      retries,
    );
    if (isErr(response)) {
      return response;
    }
    return response.data;
  }

  /**
   * Fetch with retry logic
   * Returns errors as values instead of throwing
   */
  private async fetchWithRetry<T>(
    url: string,
    init: RequestInit,
    timeout: number,
    maxRetries: number,
  ): Promise<FetchResponse<T> | HttpErr> {
    let lastError: HttpErr | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await this.fetchWithTimeout(url, init, timeout);

      if (isErr(response)) {
        lastError = response;

        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          return lastError;
        }

        // Don't retry on client errors (4xx) except 408, 429
        const shouldRetry =
          response.payload.status === 408 || // Request Timeout
          response.payload.status === 429 || // Too Many Requests
          response.payload.status >= 500; // Server errors

        if (!shouldRetry) {
          return response;
        }

        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 500;
        await this.delay(baseDelay + jitter);
        continue;
      }

      const data = await this.parseResponse<T>(response);
      if (isErr(data)) {
        lastError = data;

        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          return lastError;
        }

        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 500;
        await this.delay(baseDelay + jitter);
        continue;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    }

    return (
      lastError ||
      new HttpErr({
        status: 0,
        message: "Fetch failed after all retries",
      })
    );
  }

  /**
   * Fetch with timeout using AbortController
   * Returns errors as values instead of throwing
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout: number,
  ): Promise<Response | HttpErr> {
    // Use provided signal or create new abort controller
    const controller = init.signal ? null : new AbortController();
    const timeoutId = setTimeout(() => controller?.abort(), timeout);

    const fetchResult = await tryPromise(
      fetch(url, {
        ...init,
        signal: init.signal || controller?.signal,
      }),
    );

    clearTimeout(timeoutId);

    if (isErr(fetchResult)) {
      const error = fetchResult.payload;

      if (error instanceof Error && error.name === "AbortError") {
        return new HttpErr({
          status: 408,
          message: `Request timed out after ${timeout}ms`,
        });
      }

      return new HttpErr({
        status: 0,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return fetchResult;
  }

  /**
   * Parse and validate response
   * Returns errors as values instead of throwing
   */
  private async parseResponse<T>(response: Response): Promise<T | HttpErr> {
    if (!response.ok) {
      return this.handleErrorResponse(response);
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (!contentType || response.status === 204) {
      return undefined as T;
    }

    // Parse JSON responses
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (error) {
        return new HttpErr({
          status: response.status,
          message: `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // Return text for other content types
    try {
      return (await response.text()) as T;
    } catch (error) {
      return new HttpErr({
        status: response.status,
        message: `Failed to read response: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Handle error responses
   * Returns errors as values instead of throwing
   */
  private async handleErrorResponse(response: Response): Promise<HttpErr> {
    let errorMessage: string;
    let errorDetails: unknown;

    try {
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        errorDetails = await response.json();
        errorMessage =
          (errorDetails as { error?: string; message?: string })?.error ||
          (errorDetails as { error?: string; message?: string })?.message ||
          `Request failed with status ${response.status}`;
      } else {
        const errorText = await response.text();
        errorMessage =
          errorText || `Request failed with status ${response.status}`;
        errorDetails = { text: errorText };
      }
    } catch {
      errorMessage = `Request failed with status ${response.status}`;
    }

    return new HttpErr({
      status: response.status,
      message: errorMessage,
      response: errorDetails,
    });
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a configured instance with custom defaults
   */
  withDefaults(defaults: Partial<RequestConfig>): HttpClient {
    const client = new HttpClient();

    // Override fetch to merge defaults
    const originalFetch = client.fetch.bind(client);
    client.fetch = async <T>(url: string, config: RequestConfig = {}) => {
      return originalFetch<T>(url, { ...defaults, ...config });
    };

    return client;
  }
}

// Re-export for convenience
export { HttpErr, isErr } from "@/lib/errors/safe-errors";

// Export singleton instance
export const httpClient = new HttpClient();

// Export class for custom instances
export { HttpClient };
