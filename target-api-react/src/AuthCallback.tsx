import React, { useEffect, useState } from "react";
import { Spinner } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import auth from "./client/auth";

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
