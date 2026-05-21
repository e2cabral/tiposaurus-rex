import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  outDir: 'dist',
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
});
