/**
 * Unified HTTP client with timeout, retry, and error handling
 */

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
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

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

class HttpClient {
  private defaultTimeout = 30000;
  private defaultRetries = 0;

  /**
   * Fetch JSON data with automatic retry, timeout, and error handling
   */
  async fetchJson<T>(url: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.fetch<T>(url, config);
    return response.data;
  }

  /**
   * Fetch with full response details
   */
  async fetch<T>(url: string, config: RequestConfig = {}): Promise<FetchResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      signal,
    } = config;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal,
    };

    // Don't add body for GET/HEAD requests
    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return this.fetchWithRetry<T>(url, fetchOptions, timeout, retries);
  }

  /**
   * Fetch with FormData (for file uploads)
   */
  async fetchFormData<T>(
    url: string,
    formData: FormData,
    config: Omit<RequestConfig, 'body'> = {}
  ): Promise<T> {
    const {
      method = 'POST',
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

    const response = await this.fetchWithRetry<T>(url, fetchOptions, timeout, retries);
    return response.data;
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry<T>(
    url: string,
    init: RequestInit,
    timeout: number,
    maxRetries: number
  ): Promise<FetchResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init, timeout);
        const data = await this.parseResponse<T>(response);

        return {
          data,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          throw lastError;
        }

        // Don't retry on client errors (4xx) except 408, 429
        if (error instanceof HttpError) {
          const shouldRetry =
            error.status === 408 || // Request Timeout
            error.status === 429 || // Too Many Requests
            error.status >= 500;    // Server errors

          if (!shouldRetry) {
            throw error;
          }
        }

        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 500;
        await this.delay(baseDelay + jitter);
      }
    }

    throw lastError || new Error('Fetch failed');
  }

  /**
   * Fetch with timeout using AbortController
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout: number
  ): Promise<Response> {
    // Use provided signal or create new abort controller
    const controller = init.signal ? null : new AbortController();
    const timeoutId = setTimeout(
      () => controller?.abort(),
      timeout
    );

    try {
      const response = await fetch(url, {
        ...init,
        signal: init.signal || controller?.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpError(
          `Request timed out after ${timeout}ms`,
          408
        );
      }

      throw error;
    }
  }

  /**
   * Parse and validate response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || response.status === 204) {
      return undefined as T;
    }

    // Parse JSON responses
    if (contentType.includes('application/json')) {
      return response.json();
    }

    // Return text for other content types
    return response.text() as T;
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage: string;
    let errorDetails: any;

    try {
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        errorDetails = await response.json();
        errorMessage =
          errorDetails?.error ||
          errorDetails?.message ||
          `Request failed with status ${response.status}`;
      } else {
        const errorText = await response.text();
        errorMessage = errorText || `Request failed with status ${response.status}`;
        errorDetails = { text: errorText };
      }
    } catch {
      errorMessage = `Request failed with status ${response.status}`;
    }

    throw new HttpError(errorMessage, response.status, errorDetails);
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// Export singleton instance
export const httpClient = new HttpClient();

// Export class for custom instances
export { HttpClient };
