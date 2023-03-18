import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import { build } from "./builder.js";
import crypto from "crypto";
import { readConfig } from "./config.js";
import { getLocalized } from "./utils.js";

async function findPort(start, increment) {
  let port = start - 1;
  while (port < start + increment) {
    port += 1;

    let val = await new Promise((resolve) => {
      fetch(`http://localhost:${port}/ping`).then((d) => {
        if (d.status === 200) {
          resolve(port);
        } else {
          resolve(false);
        }
      }).catch(() => {
        resolve(false);
      });

      setTimeout(() => {
        resolve(false);
      }, 100);
    });

    if (val) {
      return val;
    } else if (port === start + increment) {
      return null
    }
  }
}

let isBuilding = false;
export async function dev() {
  let config = await readConfig(path.resolve("./acord.cfg"));

  const port = await findPort(6160, 10);

  if (!port) {
    console.log(`[${new Date().toLocaleTimeString()}] Unable to find a valid Acord instance! Trying again..`);

    await new Promise(r => setTimeout(r, 2500));

    return dev();
  }

  let watcher = chokidar.watch("./", { ignored: config.out.directory });

  watcher.on("all", async () => {
    if (isBuilding) return;
    isBuilding = true;

    try {
      let { config: manifest } = await build();
      let source = await fs.promises.readFile(path.resolve(config.out.directory, "./source.js"), "utf-8");

      fetch(
        `http://localhost:${port}/handler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: "UpdateDevelopmentExtension",
            data: { source, manifest }
          })
        })
        .then((d) => {
          console.log(`[${new Date().toLocaleTimeString()}] Extension sent to Acord instance! (${getLocalized(manifest.about.name)})`);
        })
        .catch(() => {
          console.log(`[${new Date().toLocaleTimeString()}] Connection closed!`);
          watcher.close();
          setTimeout(dev, 2500);
        });
    } catch (err) {
      console.log(`[${new Date().toLocaleTimeString()}] Unable to build Acord extension!`, err);
    };

    isBuilding = false;
  });

}
