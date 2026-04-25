await Bun.build({
	entrypoints: ["index.ts"],
	minify: true,
	external: ["@prisma/client", "./output/client", ".prisma", "prisma"],
	outdir: "./dist",
	format: "esm",
	target: "bun",
});
