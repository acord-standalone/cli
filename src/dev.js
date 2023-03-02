import WebSocket from "ws";
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
      let socket = new WebSocket(`ws://127.0.0.1:${port}/acord`);
      socket.on("open", () => {
        socket.close();
        resolve(port);
      });

      socket.on("error", () => {
        resolve(false);
      });

      socket.on("close", () => {
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

  const socketPort = await findPort(6463, 20);

  if (!socketPort) {
    console.log(`[${new Date().toLocaleTimeString()}] Unable to find a valid Acord instance! Trying again..`);

    await new Promise(r => setTimeout(r, 2500));

    return dev();
  }

  let ws = new WebSocket(`ws://127.0.0.1:${socketPort}/acord`);

  let watcher = chokidar.watch("./", { ignored: config.out.directory });

  watcher.on("all", async () => {
    if (isBuilding) return;
    isBuilding = true;

    try {
      let { config: manifest } = await build();
      let source = await fs.promises.readFile(path.resolve(config.out.directory, "./extension.js"), "utf-8");

      ws.send(JSON.stringify(
        [
          crypto.randomUUID(),
          "UpdateDevelopmentExtension",
          { source, manifest }
        ]
      ));

      console.log(`[${new Date().toLocaleTimeString()}] Extension sent to Acord instance! (${getLocalized(manifest.about.name)})`);
    } catch (err) {
      console.log(`[${new Date().toLocaleTimeString()}] Unable to build Acord extension!`, err);
    };

    isBuilding = false;
  });

  ws.onclose = () => {
    console.log(`[${new Date().toLocaleTimeString()}] Websocket connection closed!`);
    watcher.close();
    ws.close();
    dev();
  }

}
