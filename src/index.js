#! /usr/bin/env node

import { plsParseArgs } from "plsargs";
import chalk from "chalk";
import { getDefaultConfig } from "./config.js";
import path from "path";
import { build } from "./builder.js";
import fs from "fs";
import { dev } from "./dev.js";

const args = plsParseArgs(process.argv.slice(2));

function sendBanner() {
  console.log(`Acord is a Discord extension platform to enable extension developers to make extensions more easily and wisely.`);
}

function sendHelp() {
  let t$ = chalk.greenBright("$").toString();
  let tAcord = chalk.cyanBright("acord-cli").toString();
  console.log(
    [
      "",
      `${t$} ${tAcord} build`,
      chalk.blackBright(`  - Makes your plugin to ready to use.`).toString(),
      `${t$} ${tAcord} help`,
      chalk.blackBright(`  - Shows this message.`).toString(),
      `${t$} ${tAcord} init <plugin|theme>`,
      chalk.blackBright(`  - Initializes an Acord plugin configuration.`).toString(),
      `${t$} ${tAcord} dev`,
      chalk.blackBright(`  - Actively watches for file changes and then updates your plugin on Acord.`).toString(),
      ""
    ].join("\n")
  );
}

const commands = [
  {
    name: "build",
    async execute() {
      sendBanner();
      await build();
      console.log(`[${new Date().toLocaleTimeString()}] Acord extension successfully builded.`);
    }
  },
  {
    name: "dev",
    async execute() {
      sendBanner();
      console.log(`Enabling the development server..`);
      await dev();
      console.log(`Development server is ready!`);
    }
  },
  {
    name: "help",
    execute() {
      sendBanner();
      sendHelp();
    }
  },
  {
    name: "init",
    async execute() {
      sendBanner();

      let type = args.get(1);

      if (!["theme", "plugin"].includes(type))
        return console.log(`Please specify a extension type! (theme or plugin)`)

      let config = getDefaultConfig(type);
      let text = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(path.resolve("./acord.cfg"), text);

      console.log(chalk.blackBright(text));
      console.log(`[${new Date().toLocaleTimeString()}] Acord project initialized!`)
    }
  }
];

{
  const command = commands.find(i => (args.get(0) || "help") == i.name);
  if (command) {
    command.execute();
  } else {
    commands.find(i => i.name == "help").execute();
  }
}