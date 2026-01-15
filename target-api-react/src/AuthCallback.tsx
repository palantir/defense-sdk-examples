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

import React, { useEffect, useState } from "react";
import { Button, Intent, Spinner } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import auth from "./auth";

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Extract code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (!code) {
      setError("No authorization code received");
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    // Verify the state parameter to prevent CSRF attacks
    const savedState = sessionStorage.getItem("oauth_state");
    if (state && savedState && state !== savedState) {
      console.error("OAuth state mismatch - possible CSRF attack");
      setError("Authentication failed: Invalid state parameter");
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    // Check if this code has already been processed
    const processedCode = sessionStorage.getItem("processed_auth_code");
    if (processedCode === code) {
      console.log(
        "This authorization code has already been used, requesting new one"
      );
      setError(
        "This authorization code has already been used. Redirecting to login again..."
      );
      // Clear all OAuth state to ensure a fresh start
      auth.clearOAuthSessionStorage();
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    // Check for code timestamp - codes typically expire after 5 minutes
    const codeTimestamp = sessionStorage.getItem("auth_code_timestamp");
    if (codeTimestamp) {
      const timestamp = parseInt(codeTimestamp, 10);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - timestamp > fiveMinutes) {
        console.log(
          "Authorization code may have expired (older than 5 minutes)"
        );
        setError(
          "Authorization code may have expired. Starting a new login flow."
        );
        auth.clearOAuthSessionStorage();
        setTimeout(() => navigate("/"), 3000);
        return;
      }
    }

    // Process the callback directly
    const codeVerifier = sessionStorage.getItem("code_verifier");
    if (!codeVerifier) {
      console.error("No code verifier found in session storage");
      setError("Authentication failed: No code verifier found");
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    // Mark this code as being processed to prevent double processing
    console.log("Marking authorization code as processed");
    sessionStorage.setItem("processed_auth_code", code);

    // Exchange code for token
    console.log("AuthCallback: Processing OAuth code", {
      codeLength: code.length,
      hasVerifier: !!codeVerifier,
      verifierLength: codeVerifier.length,
    });

    auth
      .exchangeCodeForToken(code, codeVerifier)
      .then(() => {
        console.log("Authentication successful, redirecting to home");

        // Set a flag in sessionStorage to indicate successful authentication
        // This will be checked by the main application to trigger a state update
        sessionStorage.setItem("auth_completed", "true");

        // Send message to opener if this is in a popup
        if (window.opener && window.opener !== window) {
          window.opener.postMessage(
            { type: "OAUTH_SUCCESS", code },
            window.location.origin
          );
        }
        // Redirect to home page after successful authentication
        navigate("/", { replace: true });
      })
      .catch((e: unknown) => {
        console.error("AuthCallback error:", e);
        const errorMessage =
          e instanceof Error ? e.message : "Authentication failed";
        setError(errorMessage);

        // If we got an invalid_grant error, perform a complete OAuth reset
        if (errorMessage.includes("invalid_grant")) {
          console.log(
            "Performing complete OAuth reset due to invalid_grant error"
          );
          auth.resetOAuthCompletely();
        }

        // Notify opener of error if this is a popup
        if (window.opener && window.opener !== window) {
          window.opener.postMessage(
            { type: "OAUTH_ERROR", error: errorMessage },
            window.location.origin
          );
        }

        // Redirect after a delay
        setTimeout(() => navigate("/"), 3000);
      });
  }, [navigate]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <p>Redirecting to home page...</p>
        <Button
          intent={Intent.PRIMARY}
          onClick={() => {
            auth.resetOAuthCompletely();
            navigate("/");
          }}
          style={{ marginTop: "10px" }}
        >
          Try Again Now
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: "20px" }}>Processing authentication...</div>
      <Spinner />
    </div>
  );
};

export default AuthCallback;
