import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";

// Get stored theme from localStorage and apply it immediately
const storedTheme = localStorage.getItem("app-theme") || "default";
const htmlElement = document.documentElement;

// Remove all theme classes first
htmlElement.classList.remove('forest', 'default');

// Apply the stored theme
if (storedTheme === "forest") {
  htmlElement.classList.add("forest");
} else {
  htmlElement.classList.add("default");
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider 
    attribute="class" 
    defaultTheme="dark" 
    enableSystem={false} 
    forcedTheme="dark"
  >
    <App />
  </ThemeProvider>
);

