import { TokenRingPlugin } from "@tokenring-ai/app";
import {WebHostService} from "@tokenring-ai/web-host";
import SPAResource from "@tokenring-ai/web-host/SPAResource";
import path from "path";
import TokenRingApp from "@tokenring-ai/app";
import packageJSON from "./package.json" with {type: "json"};

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    app.waitForService(WebHostService, webHostService => {
      webHostService.registerResource("Agent Chat Application", new SPAResource({
        type: 'spa',
        description: packageJSON.description,
        file: path.resolve(import.meta.dirname, "./dist/index.html"),
        prefix: "/chat/"
      }));
    });
  },
} as TokenRingPlugin;