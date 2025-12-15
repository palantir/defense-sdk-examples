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
// auth.ts
import {
  generateCodeVerifier,
  generateCodeChallenge,
  openBrowserAndGetAuthCode,
  saveToken,
  getToken,
} from './authUtils';

const CLIENT_ID = import.meta.env.VITE_FOUNDRY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_FOUNDRY_REDIRECT_URL;
const API_URL = import.meta.env.VITE_FOUNDRY_API_URL;
const AUTH_URL = `${API_URL}/multipass/api/oauth2/authorize`;
const TOKEN_URL = `${API_URL}/multipass/api/oauth2/token`;
const TARGET_SCOPES = 'api:target-read api:target-write';

function getAuthUrl(codeChallenge: string, state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: TARGET_SCOPES
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function signIn(): Promise<string> {
  // 1. Use cached token if valid
  const cached = getToken();
  if (cached) return cached;

  // 2. PKCE/OAuth2 popup flow
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = Math.random().toString(36).substring(2);

  // 3. Open popup and get code
  const authUrl = getAuthUrl(codeChallenge, state);
  const code = await openBrowserAndGetAuthCode(authUrl, REDIRECT_URI);

  // 4. Exchange code for token
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
      scope: '',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch token');
  }

  const data = await response.json();
  if (!data.access_token || !data.expires_in) {
    throw new Error('Invalid token response');
  }

  saveToken(data.access_token, data.expires_in);
  return data.access_token;
}

export default { signIn, getToken };
