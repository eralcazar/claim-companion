import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";

createRoot(document.getElementById("root")!).render(
  <ImpersonationProvider>
    <App />
  </ImpersonationProvider>
);
