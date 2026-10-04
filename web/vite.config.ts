import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// NFR-1: the built page can't reach the network. Added at build time only,
// because it would also block the dev server's own scripts and HMR socket.
const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";

function contentSecurityPolicy(): Plugin {
  return {
    name: "said-csp",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" },
    ],
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), contentSecurityPolicy()],
  // The preview pane assigns a free port through PORT; Vite doesn't read it by itself.
  server: { port: Number(process.env.PORT) || 5173 },
});
