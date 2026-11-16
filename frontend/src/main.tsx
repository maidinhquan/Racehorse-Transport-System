import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./shared/context/ThemeContext";

import App from "./App";
import "./index.css";

// Expose API clients to window in dev mode for interactive console testing
if (import.meta.env.DEV) {
  import("./features/specialist/api/flow2Api").then((f2) => {
    (window as any).flow2Api = f2.flow2Api;
  });
  import("./shared/api/tracking").then((f4) => {
    (window as any).flow4Api = f4.flow4Api;
  });
  import("./shared/api/handover").then((f6) => {
    (window as any).flow6Api = f6.flow6Api;
  });
}

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <ThemeProvider>
      <GoogleOAuthProvider
        clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      >
        <App />
      </GoogleOAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
