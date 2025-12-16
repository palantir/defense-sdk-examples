/*
 * (c) Copyright 2024 Palantir Technologies Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const CLIENT_ID = import.meta.env.VITE_FOUNDRY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_FOUNDRY_REDIRECT_URL;
const API_URL = import.meta.env.VITE_FOUNDRY_API_URL;
const AUTH_URL = `${API_URL}/multipass/api/oauth2/authorize`;
const TOKEN_URL = `${API_URL}/multipass/api/oauth2/token`;
const TARGET_SCOPES =
  "api:target-read api:target-write";

function getAuthUrl(codeChallenge: string, state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope: TARGET_SCOPES,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function signIn(): Promise<string> {
  // 1. Use cached token if valid
  const cached = getToken();
  if (cached) return cached;

  // 2. Check if we're in the callback page
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  // If we have a code in the URL, we're in the callback page
  if (code) {
    console.log("Processing OAuth callback with authorization code");
    const codeVerifier = sessionStorage.getItem("code_verifier");

    if (!codeVerifier) {
      console.error("No code verifier found in session storage");
      throw new Error("Authentication failed: No code verifier found");
    }

    return exchangeCodeForToken(code, codeVerifier);
  }

  // 3. Start new PKCE/OAuth2 popup flow
  console.log("Starting new OAuth flow");
  const codeVerifier = generateCodeVerifier();
  // Store the code verifier in session storage
  sessionStorage.setItem("code_verifier", codeVerifier);

  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = Math.random().toString(36).substring(2);
  sessionStorage.setItem("oauth_state", state);

  // 4. Open popup and get code
  const authUrl = getAuthUrl(codeChallenge, state);
  const authCode = await openBrowserAndGetAuthCode(authUrl, REDIRECT_URI);

  // 5. Exchange code for token
  return exchangeCodeForToken(authCode, codeVerifier);
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<string> {
  console.log("Exchanging code for token");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
      scope: "",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange failed:", errorText);
    throw new Error(`Failed to fetch token: ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token || !data.expires_in) {
    console.error("Invalid token response:", data);
    throw new Error("Invalid token response");
  }

  console.log("Token received successfully");
  saveToken(data.access_token, data.expires_in);
  return data.access_token;
}

export function generateCodeVerifier(): string {
  // 43-128 characters, URL-safe base64
  const array = new Uint8Array(64);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function generateCodeChallenge(
  codeVerifier: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return base64Digest;
}

// Open browser and get authorization code
export function openBrowserAndGetAuthCode(
  authUrl: string,
  redirectUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Open the authorization URL in a popup window
    const popup = window.open(
      authUrl,
      "oauth-popup",
      "width=500,height=600,scrollbars=yes,resizable=yes"
    );

    if (!popup) {
      reject(
        new Error(
          "Failed to open popup window. Please allow popups for this site."
        )
      );
      return;
    }

    // Check if the popup is closed manually by the user
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        reject(new Error("Authentication was cancelled by the user."));
      }
    }, 1000);

    // Listen for messages from the popup (if using postMessage approach)
    const messageListener = (event: MessageEvent) => {
      // Verify the origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === "OAUTH_SUCCESS" && event.data.code) {
        clearInterval(checkClosed);
        window.removeEventListener("message", messageListener);
        popup.close();
        resolve(event.data.code);
      } else if (event.data.type === "OAUTH_ERROR") {
        clearInterval(checkClosed);
        window.removeEventListener("message", messageListener);
        popup.close();
        reject(new Error(event.data.error || "Authentication failed"));
      }
    };

    window.addEventListener("message", messageListener);

    // Poll the popup URL to check for redirect (fallback method)
    const pollTimer = setInterval(() => {
      try {
        if (popup.location.href.includes(redirectUrl)) {
          const url = new URL(popup.location.href);
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          clearInterval(pollTimer);
          clearInterval(checkClosed);
          window.removeEventListener("message", messageListener);
          popup.close();

          if (error) {
            reject(new Error(`OAuth error: ${error}`));
          } else if (code) {
            resolve(code);
          } else {
            reject(new Error("No authorization code received"));
          }
        }
      } catch (e) {
        // Cross-origin error is expected while the popup is on the auth domain
        // Continue polling until it redirects back to our domain
      }
    }, 1000);

    // Set a timeout for the authentication process
    setTimeout(() => {
      clearInterval(pollTimer);
      clearInterval(checkClosed);
      window.removeEventListener("message", messageListener);
      if (!popup.closed) {
        popup.close();
      }
      reject(new Error("Authentication timeout. Please try again."));
    }, 300000); // 5 minute timeout
  });
}

// Token storage and retrieval
export function saveToken(token: string, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000 - 5000; // 5s buffer
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_token_expiry", expiresAt.toString());
}

export function getToken(): string | null {
  const token = localStorage.getItem("auth_token");
  const expiry = localStorage.getItem("auth_token_expiry");
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_token_expiry");
    return null;
  }
  return token;
}

export default { signIn, getToken, exchangeCodeForToken };
