import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./shared/context/ThemeContext";
import { ErrorBoundary } from "./shared/components";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <GoogleOAuthProvider
          clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
        >
          <App />
        </GoogleOAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);