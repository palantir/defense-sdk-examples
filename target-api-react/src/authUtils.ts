// Function to open browser and get authorization code
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
        // We'll continue polling until it redirects back to our domain
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
