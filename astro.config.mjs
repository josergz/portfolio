import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite"; // <--- Nuevo import
import vercel from "@astrojs/vercel";

export default defineConfig({
  // 1. Quitamos tailwind() de aquí
  integrations: [],
  output: "server",
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  // 2. Agregamos Tailwind aquí como plugin de Vite
  vite: {
    plugins: [tailwindcss()],
  },
  security: {
    checkOrigin: false,
  },
  site: "https://www.josergz.dev",
});
