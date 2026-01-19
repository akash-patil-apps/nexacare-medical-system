import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Starting React app...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

console.log("Root element found, rendering app...");
createRoot(rootElement).render(<App />);
console.log("App rendered successfully!");