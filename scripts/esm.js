const esbuild = require('esbuild')

esbuild.build({
	entryPoints: ['src/index.ts', 'src/services.ts'],
	platform: 'node',
	format: 'esm',
	target: 'node16',
	outdir: 'build/format/esm',
	sourcemap: true,
	treeShaking: true,
	minify: true
})
