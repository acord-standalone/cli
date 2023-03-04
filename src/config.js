import fs from "fs";

/**
 * @param {"plugin"|"theme"} type
 */
export function getDefaultConfig(type) {
  return {
    index: type == "plugin" ? "./src/index.js" : "./src/style.css",
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
    },
    ...(type == "plugin" ? {
      api: {
        i18n: true,
        patcher: true,
        events: true,
        storage: true,
        websocket: true,
        ui: true,
        utils: true,
        dom: true,
        dev: true,
        modules: {
          node: [
            { name: "fs", reason: "Something meaningful.." },
          ],
          common: [
            { name: "UserStore", reason: "Something meaningful.." },
          ],
          custom: [
            {
              name: "Rest",
              lazy: false,
              reason: "Something meaningful..",
              filter: {
                "path": {
                  "after": [
                    "exports.Z",
                    "exports.ZP",
                    "exports.default",
                    "exports"
                  ]
                },
                "filter": {
                  "in": "properties",
                  "by": [
                    [
                      "get",
                      "post",
                      "getAPIBaseURL"
                    ]
                  ]
                }
              },
            }
          ]
        }
      }
    } : {}),
    mode: "development",
    config: []
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