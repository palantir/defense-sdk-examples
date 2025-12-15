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
import ReactDOM from "react-dom/client"; // <-- updated for React 18+
import { Provider, useSelector } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import store from "./app/store";
import NoLocationTable from "./components/NoLocationTable";
import TargetMap from "./components/TargetMap";
import TargetView from "./components/TargetView";
import { selectLoading } from "./features/targetApiGateway/targetApiGateway.selectors";
import AuthCallback from "./AuthCallback";
import auth from "./client/auth"; // <-- import your auth client
import "./index.scss";

// Simple AppAuthGate component
const AppAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  useEffect(() => {
    // Skip auth check on callback page
    if (window.location.pathname === "/auth/callback") {
      return;
    }

    // Check for token
    const hasToken = auth.getToken() !== undefined;

    if (hasToken) {
      setAuthState("authenticated");
    } else {
      // Try to sign in
      auth
        .signIn()
        .then(() => setAuthState("authenticated"))
        .catch(() => setAuthState("unauthenticated"));
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

// Render with RouterProvider and Provider
ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);
