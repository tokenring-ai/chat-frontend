import { TokenRingPlugin } from "@tokenring-ai/app";
import {WebHostService} from "@tokenring-ai/web-host";
import SPAResource from "@tokenring-ai/web-host/SPAResource";
import fs from "fs";
import path from "path";
import TokenRingApp from "@tokenring-ai/app";
import packageJSON from "./package.json" with {type: "json"};

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const indexHTML = path.resolve(app.packageDirectory,"frontend/chat/index.html");
    if (! fs.existsSync(indexHTML)) {
      throw new Error(`Chat frontend not found at ${indexHTML}`);
    }

    app.waitForService(WebHostService, webHostService => {
      webHostService.registerResource("Agent Chat Application", new SPAResource({
          type: 'spa',
          description: packageJSON.description,
          file: path.resolve(app.packageDirectory,"frontend/chat/index.html"),
          prefix: "/chat/"
      }));
    });
  },
} as TokenRingPlugin;