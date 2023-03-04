import fs from "fs/promises"
import { existsSync } from "fs";
import path from "path"
import * as rollup from "rollup"
import esbuildPlugin from "rollup-plugin-esbuild";
import esbuild from "esbuild";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import injectPlugin from "@rollup/plugin-inject";
import sass from "sass";
import stuffs from "stuffs";
import { getDefaultConfig, readConfig } from "./config.js";
import crypto from "crypto";

export default async function buildPlugin(config = {}) {
  config = stuffs.defaultify(config, getDefaultConfig(config?.type || "plugin"))
  if (!["plugin", "theme"].includes(config.type)) throw new Error(`Invalid type given in Acord extension. Only "plugin" or "theme" are allowed!`);
  if (config.type === "theme" && (!config.index.endsWith(".css") && !config.index.endsWith(".sass") && !config.index.endsWith(".scss"))) throw new Error(`Invalid index file given in Acord theme. Only .css, .sass, and .scss files are allowed!`);

  const rollupPlugins = [
    {
      name: "acord-transforms",
      // S/CSS compilation
      async transform(code, id) {
        const isSass = id.endsWith(".sass") || id.endsWith(".scss")
        if (id.endsWith(".css") || isSass) {
          const cssCode = isSass ? sass.compile(id).css : code;

          const minified = (
            await esbuild.transform(cssCode, {
              minify: true,
              loader: "css",
            })
          ).code.trim();

          return {
            map: { mappings: "" },
            code:
              (config.index.endsWith(".css") || config.index.endsWith(".sass") || config.index.endsWith(".scss"))
                ? `export default () => ${JSON.stringify(minified)}`
                : `import { injectCSS } from "@acord/patcher";\nexport default () => injectCSS(${JSON.stringify(minified)});`
          }
        }

        return null;
      },
      // pack :static imports as strings
      async load(id) {
        if (!id.endsWith(":static")) return null;

        const code = await fs.readFile(id.slice(0, -7), "utf-8");
        return {
          code: `export default ${JSON.stringify(code)}`,
          map: { mappings: "" },
        };
      },
    },
    injectPlugin({
      React: ["@acord/modules/common/React", "*"],
    }),
    json(),
    nodeResolve({ browser: true }),
    // allow require() in deps for compat but not in user code - use ESM!!!!
    commonjs({
      include: /.*\/node_modules\/.*/,
    }),
  ];

  const rollupConfig = {
    input: config.index,
    onwarn: () => { },
    external: ["react", "react-dom"],
    plugins: [
      esbuildPlugin({
        target: "esnext"
      }),
      ...rollupPlugins,
    ],
  };

  const bundle = await rollup.rollup(rollupConfig);

  let outputOptions = {
    format: "iife",
    compact: !!config?.out?.minify,
    globals(id) {
      if (id.startsWith("@acord")) return `$${id.slice(1).replace(/\//g, ".")}`;
      const map = {
        react: "acord.modules.common.React",
        "react-dom": "acord.modules.common.ReactDOM",
      };
      return map[id] || null;
    },
    plugins: [
      esbuildPlugin({
        target: "esnext",
        minify: !!config?.out?.minify,
        sourceMap: config?.out?.sourceMap !== false,
      })
    ],
    ...(config?.out?.sourceMap !== false ? { sourcemap: "inline" } : {})
  };

  return {
    async write(outDir) {
      await bundle.write({
        ...outputOptions,
        file: path.join(outDir, "source.js")
      });

      await bundle.close();
    },
    async get() {
      const { output } = await bundle.generate(outputOptions);
      await bundle.close();
      return output;
    },
    watchFiles: bundle.watchFiles,
  };
};

export async function build() {
  let config = await readConfig(path.resolve("./acord.cfg"));
  let plugin = await buildPlugin(config);

  let dir = config.out.directory;

  if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true });

  delete config.index;
  delete config.out;

  config.readme = !!config?.about?.readme;

  if (config.readme && existsSync(config.about.readme)) {
    await fs.copyFile(
      path.resolve(config.about.readme),
      path.resolve(dir, "./readme.md")
    )
    delete config.about.readme;
  }

  await plugin.write(dir);

  config = {
    hash: crypto.createHash("sha256")
      .update(
        `${await fs.readFile(path.resolve(dir, "./source.js"), "utf-8")}-${JSON.stringify(config)}`,
        "utf-8"
      ).digest("hex"),
    ...config
  }

  await fs.writeFile(
    path.resolve(dir, "./manifest.json"),
    JSON.stringify(config, null, 2),
    "utf-8"
  );

  return {
    plugin,
    config
  }
}
