import * as esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["index.ts"],
	bundle: true,
	minify: true,
	external: ["@prisma/client", "bun"],
	platform: "node",
	target: "node18",
	outfile: "dist/index.js",
	format: "esm",
});
