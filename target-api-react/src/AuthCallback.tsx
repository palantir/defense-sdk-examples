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
import { Spinner } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import auth from "./auth";

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Extract code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (!code) {
      setError("No authorization code received");
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    // Process the callback directly
    const codeVerifier = sessionStorage.getItem("code_verifier");
    if (!codeVerifier) {
      console.error("No code verifier found in session storage");
      setError("Authentication failed: No code verifier found");
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    // Exchange code for token
    console.log("AuthCallback: Processing OAuth code");
    auth
      .exchangeCodeForToken(code, codeVerifier)
      .then(() => {
        console.log("Authentication successful, redirecting to home");
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
