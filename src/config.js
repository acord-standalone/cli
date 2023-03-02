import fs from "fs";

/**
 * @param {"plugin"|"theme"} type
 */
export function getDefaultConfig(type) {
  return {
    index: type == "plugin" ? "./index.js" : "./style.css",
    type,
    out: {
      minify: true,
      sourceMap: true,
      directory: "./dist"
    },
    about: {
      name: {
        default: `Example ${type}`
      },
      authors: [
        {
          name: "Unknown#0000",
          id: "0000",
          image: "https://example.com/avatar.png"
        }
      ],
      description: {
        default: `Example description.`,
      },
      version: "0.0.1",
      license: "MIT",
      readme: "./readme.md",
      previews: [
        {
          name: "Default",
          image: "https://example.com/preview.png"
        }
      ]
    }
  }
}

/**
 * @param {string} file
 */
export async function readConfig(file) {
  if (!fs.existsSync(file)) throw new Error(`Unable to locate Acord extension configuration file. (${file})`);

  try {
    let content = await fs.promises.readFile(file, "utf-8");
    let json = JSON.parse(content);

    if (!["theme", "plugin"].includes(json?.type)) throw new Error(`Invalid type given in Acord extension. Only "plugin" or "theme" are allowed! (${file})`);

    return json;
  } catch {
    throw new Error(`Unable to parse Acord configuration file. (${file})`);
  }
}