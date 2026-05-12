import { handle } from "@hono/node-server/vercel";
import app from "../dist/boot.js";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

export default handle(app);
