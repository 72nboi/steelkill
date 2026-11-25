import { defineConfig } from 'astro/config';

// https://astro.build/config
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  // Root hosting by default; set BASE_PATH=/steelkill for GitHub project Pages.
  base: process.env.BASE_PATH || '/'
});
