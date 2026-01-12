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
import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components/spinner/spinner";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import store from "./app/store";
import NoLocationTable from "./components/NoLocationTable";
import TargetMap from "./components/TargetMap";
import TargetView from "./components/TargetView";
import { selectLoading } from "./features/targetApiGateway/targetApiGateway.selectors";
import AuthCallback from "./AuthCallback";
import auth from "./auth";
import "./index.scss";

// Simple AppAuthGate component
const AppAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  // This effect runs when auth_completed is set by auth.ts
  // It's specifically to handle the scenario when authentication completes
  useEffect(() => {
    const handleAuthComplete = () => {
      console.log("Auth completion handler triggered");
      const authCompleted = sessionStorage.getItem("auth_completed");

      if (authCompleted === "true") {
        console.log("Auth completed flag detected, updating state");
        // Clear the flag so we don't process it again
        sessionStorage.removeItem("auth_completed");

        // Force a small delay to ensure token is saved
        setTimeout(() => {
          // Check if we have a valid token now
          if (auth.getToken() !== null) {
            console.log(
              "Valid token confirmed after authentication, proceeding as authenticated"
            );
            setAuthState("authenticated");
          } else {
            console.warn(
              "No valid token found after authentication completion"
            );
          }
        }, 100);
      }
    };

    // Set up listener for storage events (for cross-tab communication)
    window.addEventListener("storage", handleAuthComplete);

    // Listen for the custom event we dispatch in auth.ts (for same-tab communication)
    window.addEventListener("auth_completed", handleAuthComplete);

    // Also check immediately in case we already returned from callback
    handleAuthComplete();

    return () => {
      window.removeEventListener("storage", handleAuthComplete);
      window.removeEventListener("auth_completed", handleAuthComplete);
    };
  }, []);

  // Debug console log when authState changes
  useEffect(() => {
    console.log("Authentication state changed to:", authState);
  }, [authState]);

  // Main authentication effect
  useEffect(() => {
    // Skip auth check on callback page
    if (window.location.pathname === "/auth/callback") {
      return;
    }

    // Check for token
    const hasToken = auth.getToken() !== null;

    if (hasToken) {
      console.log("Valid token found in storage, proceeding as authenticated");
      setAuthState("authenticated");
    } else {
      console.log("No valid token found, starting authentication flow");
      // Clear any stale OAuth state data
      sessionStorage.removeItem("processed_auth_code");
      sessionStorage.removeItem("invalid_grant_received");

      // Try to sign in
      auth
        .signIn()
        .then(() => {
          console.log("Sign in successful");
          setAuthState("authenticated");
        })
        .catch((error) => {
          console.error("Authentication error:", error);

          // Show detailed error to help with debugging
          const errorMsg = error.message || "Unknown error";
          console.log(`Authentication failed with error: ${errorMsg}`);

          // When an error occurs, ensure we set the state to unauthenticated
          // so the user sees the sign in button again
          setAuthState("unauthenticated");

          // Clear all storage on any authentication error to ensure a clean slate
          console.log(
            "Clearing all OAuth storage due to authentication failure"
          );
          sessionStorage.removeItem("processed_auth_code");
          sessionStorage.removeItem("code_verifier");
          sessionStorage.removeItem("oauth_state");
          sessionStorage.removeItem("auth_completed");
          sessionStorage.removeItem("invalid_grant_received");

          // Only clear token storage on invalid_grant to avoid losing valid tokens on
          // network errors or other transient issues
          if (error.message && error.message.includes("invalid_grant")) {
            console.log("Invalid grant detected, also clearing token storage");
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_token_expiry");
          }

          // After a short delay, show the sign in button to allow retrying
          setTimeout(() => {
            console.log("Authentication ready for retry");
            setAuthState("unauthenticated");
          }, 1000);
        });
    }
  }, []);

  if (authState === "loading") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div style={{ marginBottom: "20px" }}>Signing in...</div>
        <Spinner intent="primary" size={SpinnerSize.LARGE} />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h2>Authentication Required</h2>
        <button
          onClick={() => auth.signIn()}
          style={{ padding: "10px 20px", fontSize: "16px" }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

// Your main App component as before
const App: React.FC = () => {
  const loading = useSelector(selectLoading);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [targetsWithoutLocation, setTargetsWithoutLocation] = useState<any[]>(
    []
  );
  const [contextMenuLocation, setContextMenuLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  return (
    <div className="main-container">
      {loading && (
        <div className="spinner-overlay">
          <Spinner intent="primary" size={SpinnerSize.LARGE} />
        </div>
      )}
      <h1>Palantir Target API Gateway [React Demo]</h1>
      <div className="content-container">
        <div className="left-container">
          <TargetMap
            setSelectedTarget={setSelectedTarget}
            setModalContent={setModalContent}
            modalContent={modalContent}
            selectedTarget={selectedTarget}
            setTargetsWithoutLocation={setTargetsWithoutLocation}
            setContextMenuLocation={setContextMenuLocation}
          />
        </div>
        <div className="right-container">
          <TargetView
            selectedTarget={selectedTarget}
            setModalContent={setModalContent}
            modalContent={modalContent}
            contextMenuLocation={contextMenuLocation}
          />
          {targetsWithoutLocation.length > 0 && (
            <NoLocationTable
              targetsWithoutLocation={targetsWithoutLocation}
              setSelectedTarget={setSelectedTarget}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Create the router with improved routes
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AppAuthGate>
        <App />
      </AppAuthGate>
    ),
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  // Fallback route to handle any other paths
  {
    path: "*",
    element: (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Go Home</a>
      </div>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);
