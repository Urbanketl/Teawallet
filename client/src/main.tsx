import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

console.log("Main.tsx loading...");

const container = document.getElementById("root");
console.log("Root container:", container);

if (container) {
  try {
    // Ensure container is empty before rendering
    container.innerHTML = '';
    
    const root = createRoot(container);
    root.render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error rendering app:", error);
  }
} else {
  console.error("Root element not found!");
}
