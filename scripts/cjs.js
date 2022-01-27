const esbuild = require('esbuild')

esbuild.build({
	entryPoints: ['src/index.ts', 'src/services.ts'],
	platform: 'node',
	format: 'cjs',
	target: 'node14',
	outdir: 'build/format/cjs',
	sourcemap: true,
	treeShaking: true,
	minify: true
})
