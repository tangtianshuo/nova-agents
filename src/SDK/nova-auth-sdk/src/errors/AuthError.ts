/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  /**
   * HTTP status code
   */
  public readonly statusCode: number;

  /**
   * Error message from API
   */
  public readonly apiMessage?: string;

  /**
   * Original error (if any)
   */
  public readonly originalError?: unknown;

  constructor(
    message: string,
    statusCode: number = 0,
    apiMessage?: string,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.apiMessage = apiMessage;
    this.originalError = originalError;

    // Maintains proper stack trace
    Object.setPrototypeOf(this, AuthError.prototype);
  }

  /**
   * Create AuthError from fetch response
   */
  static async fromResponse(response: Response): Promise<AuthError> {
    let apiMessage: string | undefined;

    try {
      const data = await response.json() as { error?: string };
      apiMessage = data.error;
    } catch {
      // If parsing fails, use status text
      apiMessage = response.statusText;
    }

    return new AuthError(
      `Authentication failed: ${apiMessage || response.statusText}`,
      response.status,
      apiMessage
    );
  }

  /**
   * Create AuthError from network error
   */
  static fromNetworkError(error: unknown): AuthError {
    return new AuthError(
      'Network error: Unable to connect to authentication server',
      0,
      undefined,
      error
    );
  }

  /**
   * Create AuthError for timeout
   */
  static timeout(): AuthError {
    return new AuthError(
      'Request timeout: Authentication server did not respond in time',
      0
    );
  }

  /**
   * Check if error is due to invalid credentials
   */
  isInvalidCredentials(): boolean {
    return this.statusCode === 401 || this.apiMessage === 'Invalid credentials';
  }

  /**
   * Check if error is due to network issues
   */
  isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  /**
   * Check if error is due to server error
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}
