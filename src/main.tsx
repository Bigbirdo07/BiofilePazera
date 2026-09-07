import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./index.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    {!isTauri && <Analytics />}
  </React.StrictMode>,
);
