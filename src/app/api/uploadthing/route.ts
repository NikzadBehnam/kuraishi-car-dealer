import { createRouteHandler } from "uploadthing/next";

import { uploadRouter } from "./core.ts";

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
