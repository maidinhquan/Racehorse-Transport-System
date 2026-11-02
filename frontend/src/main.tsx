import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./shared/context/ThemeContext";

import App from "./App";
import "./index.css";

// Expose API clients to window in dev mode for interactive console testing
if (import.meta.env.DEV) {
  import("./shared/api/flow4Wire").then((f4) => {
    (window as any).flow4Api = f4.flow4Api;
  });
  import("./shared/api/flow5Wire").then((f5) => {
    (window as any).flow5Api = f5.flow5Api;
  });
  import("./shared/api/flow6Wire").then((f6) => {
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
