import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// #region agent log
fetch("http://127.0.0.1:7245/ingest/8e23b003-f8b6-4cc6-ba2c-068d5409bacc", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "73a298",
  },
  body: JSON.stringify({
    sessionId: "73a298",
    runId: "pre-fix",
    hypothesisId: "C",
    location: "frontend/src/main.tsx:boot",
    message: "React app boot",
    data: {
      pathname: window.location.pathname,
      search: window.location.search,
      href: window.location.href,
      hasRoot: Boolean(document.getElementById("root")),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
