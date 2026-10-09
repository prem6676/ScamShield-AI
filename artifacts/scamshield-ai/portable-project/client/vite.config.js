import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const projectRoot = path.resolve(root, "..");
  const rootEnv = loadEnv(mode, projectRoot, "");
  const clientEnv = loadEnv(mode, root, "VITE_");
  const apiBaseUrl =
    process.env.VITE_API_BASE_URL ||
    rootEnv.VITE_API_BASE_URL ||
    clientEnv.VITE_API_BASE_URL;
  if (apiBaseUrl) process.env.VITE_API_BASE_URL = apiBaseUrl;

  const apiPort = Number(process.env.PORT || rootEnv.PORT || 5000);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("PORT must be a valid TCP port number.");
  }

  return {
    root,
    envDir: projectRoot,
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
