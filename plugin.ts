import {TokenRingPlugin} from "@tokenring-ai/app";
import {WebHostService} from "@tokenring-ai/web-host";
import SPAResource from "@tokenring-ai/web-host/SPAResource";
import fs from "fs";
import path from "path";
import {z} from "zod";
import packageJSON from "./package.json" with {type: "json"};

const packageConfigSchema = z.object({
  chatFrontend: z.object({
    spaDirectory: z.string(),
  })
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    const indexFile = path.resolve(config.chatFrontend.spaDirectory,"index.html");
    if (! fs.existsSync(indexFile)) {
      throw new Error(`Chat frontend not found at ${indexFile}`);
    }

    app.waitForService(WebHostService, webHostService => {
      webHostService.registerResource("Agent Chat Application", new SPAResource({
          type: 'spa',
          description: packageJSON.description,
          file: indexFile,
          prefix: "/chat/"
      }));
    });
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;