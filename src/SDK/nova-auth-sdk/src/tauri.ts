/**
 * Tauri OAuth Helper Utilities
 *
 * Provides utilities for handling OAuth flow in Tauri desktop applications.
 * Supports both system browser + deep link callback and embedded WebView.
 */

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    '__TAURI__' in window &&
    window.__TAURI__ !== undefined;
}

/**
 * Deep link callback handler configuration
 */
export interface DeepLinkConfig {
  /**
   * Custom URL scheme (e.g., 'nova://', 'myapp://')
   * The app should register this scheme to handle callbacks
   */
  scheme: string;

  /**
   * Callback path (default: '/oauth/callback')
   */
  path?: string;

  /**
   * Timeout in milliseconds (default: 5 minutes)
   */
  timeout?: number;
}

/**
 * OAuth callback result
 */
export interface OAuthCallbackResult {
  code: string;
  state: string;
  error?: string;
}

/**
 * Open system browser with OAuth URL
 * Works in Tauri using the shell open API
 */
export async function openSystemBrowser(url: string): Promise<void> {
  if (!isTauri()) {
    // Fallback for web environment
    window.open(url, '_blank');
    return;
  }

  // Use Tauri's shell.open API
  // @ts-ignore - Tauri API is dynamically injected
  const { open } = window.__TAURI__.shell;
  await open(url);
}

/**
 * Wait for deep link callback
 *
 * This sets up a listener for the deep link callback.
 * The callback URL format: {scheme}://{path}?code=xxx&state=xxx
 *
 * Note: This requires the Tauri app to register the custom URL scheme
 * in tauri.conf.json and handle incoming links.
 */
export function waitForDeepLinkCallback(
  config: DeepLinkConfig
): Promise<OAuthCallbackResult> {
  const { scheme, path = '/oauth/callback', timeout = 5 * 60 * 1000 } = config;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('OAuth callback timeout'));
    }, timeout);

    // Handle incoming URL from Tauri
    const handleIncomingUrl = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const callbackUrl = customEvent.detail;

      try {
        const url = new URL(callbackUrl);

        // Verify scheme and path
        if (!url.protocol.startsWith(scheme.replace('://', ''))) {
          return; // Ignore URLs with different scheme
        }

        if (path && url.pathname !== path) {
          return; // Ignore URLs with different path
        }

        // Extract parameters
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          cleanup();
          resolve({ code: '', state: '', error });
          return;
        }

        if (code && state) {
          cleanup();
          resolve({ code, state, error: undefined });
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    // Set up event listener
    // Note: The Tauri app needs to dispatch this event when receiving a deep link
    window.addEventListener('tauri://deep-link-callback', handleIncomingUrl);

    function cleanup() {
      clearTimeout(timeoutId);
      window.removeEventListener('tauri://deep-link-callback', handleIncomingUrl);
    }
  });
}

/**
 * Complete OAuth flow using system browser and deep link callback
 *
 * Usage:
 * ```typescript
 * const tokens = await completeOAuthWithBrowser({
 *   scheme: 'nova://',
 *   getOAuthUrl: async () => {
 *     const { url, state } = await authClient.getOAuthUrl('github');
 *     return { url, state };
 *   }
 * });
 * ```
 */
export async function completeOAuthWithBrowser(
  config: DeepLinkConfig & {
    getOAuthUrl: () => Promise<{ url: string; state: string }>;
  }
): Promise<{ accessToken: string; refreshToken: string }> {
  const { scheme, getOAuthUrl } = config;

  // Step 1: Get OAuth URL from SDK
  const { url, state: expectedState } = await getOAuthUrl();

  // Step 2: Open system browser
  await openSystemBrowser(url);

  // Step 3: Wait for deep link callback
  const callback = await waitForDeepLinkCallback({ ...config, scheme });

  if (callback.error) {
    throw new Error(`OAuth error: ${callback.error}`);
  }

  // Verify state to prevent CSRF attacks
  if (callback.state !== expectedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }

  // Note: The actual token exchange happens on the backend
  // The frontend just needs to handle the callback
  // The backend will redirect to the deep link with tokens

  // Parse tokens from callback URL (if backend sends them in URL)
  // Otherwise, the frontend needs to make an API call to complete the flow

  throw new Error('Token exchange not implemented - backend should handle this');
}

/**
 * Generate deep link callback URL
 *
 * @param scheme - Custom URL scheme (e.g., 'nova://')
 * @param path - Callback path (default: '/oauth/callback')
 * @param params - Query parameters to include
 */
export function buildDeepLinkUrl(
  scheme: string,
  path: string = '/oauth/callback',
  params: Record<string, string> = {}
): string {
  const url = new URL(scheme.replace('://', '://'));
  url.pathname = path;

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

/**
 * Parse deep link callback URL
 *
 * Extracts OAuth parameters from a deep link URL
 */
export function parseDeepLinkUrl(
  callbackUrl: string,
  expectedScheme: string
): OAuthCallbackResult {
  try {
    const url = new URL(callbackUrl);

    if (!url.protocol.startsWith(expectedScheme.replace('://', ''))) {
      throw new Error(`Invalid scheme: expected ${expectedScheme}`);
    }

    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const error = url.searchParams.get('error') || undefined;

    return { code, state, error };
  } catch (err) {
    throw new Error(`Failed to parse callback URL: ${err}`);
  }
}

/**
 * WebView OAuth flow configuration
 */
export interface WebViewOAuthConfig {
  /**
   * Width of the WebView window (default: 600)
   */
  width?: number;

  /**
   * Height of the WebView window (default: 700)
   */
  height?: number;

  /**
   * Window title
   */
  title?: string;

  /**
   * Whether to close window after successful login (default: true)
   */
  closeOnSuccess?: boolean;
}

/**
 * Complete OAuth flow using embedded WebView
 *
 * This opens a new Tauri window with a WebView for OAuth.
 * More complex to set up but works without deep link configuration.
 *
 * Note: This requires the Tauri app to have a secondary window configured.
 */
export async function completeOAuthWithWebView(
  config: WebViewOAuthConfig & {
    oauthUrl: string;
    onSuccess: (tokens: any) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  if (!isTauri()) {
    throw new Error('WebView OAuth is only supported in Tauri environment');
  }

  // @ts-ignore - Tauri API is dynamically injected
  const { WebviewWindow } = window.__TAURI__.window;

  const {
    oauthUrl,
    width = 600,
    height = 700,
    title = 'Sign in with OAuth',
    onSuccess,
    onError,
  } = config;

  // Create a new webview window for OAuth
  const webview = new WebviewWindow('oauth-login', {
    url: oauthUrl,
    width,
    height,
    title,
    resizable: true,
    decorations: true,
  });

  // Listen for messages from the webview
  // The OAuth callback page should post a message with the tokens
  webview.once('tauri://message', (event: Event) => {
    const message = event as MessageEvent;
    try {
      const payload = JSON.parse(message.data);

      if (payload.error) {
        onError(payload.error);
        webview.close();
        return;
      }

      onSuccess(payload);
      webview.close();
    } catch (err) {
      onError('Failed to parse OAuth response');
      webview.close();
    }
  });
}

/**
 * Create an HTML page for OAuth callback in WebView
 *
 * This page should be loaded when the OAuth provider redirects back.
 * It extracts the tokens from the URL and posts a message to the parent window.
 */
export function createWebViewCallbackHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OAuth Callback</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .success { color: #10b981; }
    .error { color: #ef4444; }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #6366f1;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p id="status">Completing sign in...</p>
  </div>
  <script>
    (function() {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const userId = params.get('user_id');
      const username = params.get('username');
      const error = params.get('error');

      if (error) {
        document.getElementById('status').className = 'error';
        document.getElementById('status').textContent = 'Error: ' + error;
        // Notify parent window
        if (window.opener) {
          window.opener.postMessage({ error }, '*');
        }
        setTimeout(() => window.close(), 3000);
        return;
      }

      if (accessToken) {
        document.getElementById('status').className = 'success';
        document.getElementById('status').textContent = 'Successfully signed in!';

        // Notify parent window with tokens
        const payload = {
          accessToken,
          refreshToken,
          userId,
          username
        };

        if (window.opener) {
          window.opener.postMessage(payload, '*');
        }

        // Also invoke Tauri API if available
        if (window.__TAURI__) {
          window.__TAURI__.invoke('oauth_callback', { payload });
        }

        setTimeout(() => window.close(), 1500);
      } else {
        document.getElementById('status').className = 'error';
        document.getElementById('status').textContent = 'No tokens received';
        setTimeout(() => window.close(), 3000);
      }
    })();
  </script>
</body>
</html>
  `;
}
