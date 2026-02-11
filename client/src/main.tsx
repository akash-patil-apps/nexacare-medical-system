import React from "react";
import { createRoot } from "react-dom/client";
import { API_BASE } from "./lib/apiBase";
import App from "./App";
import "./index.css";

// When deployed (e.g. Vercel), API_BASE is set so /api calls go to the backend URL
if (API_BASE) {
  const origFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    let url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
    if (url.startsWith("/") && !url.startsWith("//")) {
      const newUrl = API_BASE + url;
      if (input instanceof Request) {
        input = new Request(newUrl, input);
      } else {
        input = newUrl;
      }
    }
    return origFetch.call(window, input, init);
  };
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);