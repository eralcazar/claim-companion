import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ImpersonationProvider>
      <App />
    </ImpersonationProvider>
  </HelmetProvider>
);
