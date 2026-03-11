import { build, $ } from "bun";

await build({
	entrypoints: ["./sources/main.ts"],
	outdir: "./build",
	target: "node",
	format: "esm",
});

await $`tsc --declaration --emitDeclarationOnly --outDir ./build sources/main.ts`;
