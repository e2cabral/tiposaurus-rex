import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import fs from 'fs';

async function build() {
    try {
        if (fs.existsSync('dist')) {
            fs.rmSync('dist', { recursive: true, force: true });
        }

        fs.mkdirSync('dist', { recursive: true });

        await esbuild.build({
            entryPoints: ['src/index.ts'],
            bundle: true,
            platform: 'node',
            target: 'node16',
            outfile: 'dist/index.js',
            format: 'esm',
            plugins: [nodeExternalsPlugin()],
            minify: true,
        });

        const content = fs.readFileSync('dist/index.js', 'utf-8');
        fs.writeFileSync('dist/index.js', `#!/usr/bin/env node\n${content}`);
        fs.chmodSync('dist/index.js', '755');

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();