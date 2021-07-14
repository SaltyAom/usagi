const esbuild = require('esbuild')

esbuild
    .build({
        entryPoints: ['src/index.ts'],
        platform: 'node',
        format: 'esm',
        target: 'node14',
        outdir: 'build/format/esm',
        sourcemap: true,
    })
