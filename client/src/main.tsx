import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("Main.tsx loading...");

const container = document.getElementById("root");
console.log("Root container:", container);

if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error rendering app:", error);
  }
} else {
  console.error("Root element not found!");
}
