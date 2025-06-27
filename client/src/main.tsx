import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure DOM is loaded before mounting
function mountApp() {
  const container = document.getElementById("root");
  if (container) {
    // Clear any existing content
    container.innerHTML = '';
    const root = createRoot(container);
    root.render(<App />);
  } else {
    console.error("Root element not found");
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
