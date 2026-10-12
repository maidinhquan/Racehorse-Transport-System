import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./shared/context/ThemeContext";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
<<<<<<< HEAD
    <GoogleOAuthProvider
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "dummy-client-id"}
    >
      <App />
    </GoogleOAuthProvider>
=======
    <ThemeProvider>
      <GoogleOAuthProvider
        clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      >
        <App />
      </GoogleOAuthProvider>
    </ThemeProvider>
>>>>>>> 3d2288f51b55de3d323a2ff687d4b4f7cb7b3ff9
  </React.StrictMode>
);