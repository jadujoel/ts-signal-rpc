export async function build() {
  await Bun.build({
    entrypoints: ["src/index.html"],
    outdir: "dist",
    sourcemap: "linked"
  })
}

if (import.meta.main) {
  await build()
}
