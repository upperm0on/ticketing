import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["ticketing-ey3b.onrender.com"],
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    }
  },
  preview: {
    allowedHosts: true,
  },
});
