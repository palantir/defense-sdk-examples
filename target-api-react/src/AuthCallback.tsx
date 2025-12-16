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
    // Process the callback
    auth
      .signIn()
      .then(() => {
        // Redirect to home page after successful authentication
        navigate("/", { replace: true });
      })
      .catch((e) => {
        const errorMessage =
          e instanceof Error ? e.message : "Authentication failed";
        setError(errorMessage);

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
