import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadStory } from "./lib/loadStory";
import "./index.css";

void loadStory().then((loaded) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App loaded={loaded} />
    </StrictMode>,
  );
});
