import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.PUBLIC_BASE_PATH || readCliBase() || "/",
  plugins: [react()],
})

function readCliBase() {
  const inlineBase = process.argv.find((arg) => arg.startsWith("--base="));
  if (inlineBase) return inlineBase.slice("--base=".length);

  const baseFlagIndex = process.argv.indexOf("--base");
  if (baseFlagIndex >= 0) return process.argv[baseFlagIndex + 1];

  return undefined;
}
