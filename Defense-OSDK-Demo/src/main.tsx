/*
 * (c) Copyright 2026 Palantir Technologies Inc. All rights reserved.
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

import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AuthCallback from "./AuthCallback";
import AppWithErrorBoundary from "./components/app/AppWithErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";
import { SelectionProvider } from "./context/SelectionContext";
import { OsdkDataProvider } from "./context/OsdkDataContext";
import "./i18n/config";
import "./index.scss";

// Create the router with improved routes
// Use import.meta.env.BASE_URL which Vite sets from the 'base' config
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppWithErrorBoundary />,
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
], {
  basename: import.meta.env.BASE_URL,
});

const rootElement = document.getElementById("root");
if (rootElement == null) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <ThemeProvider>
    <SelectionProvider>
      <OsdkDataProvider>
        <RouterProvider router={router} />
      </OsdkDataProvider>
    </SelectionProvider>
  </ThemeProvider>,
);
