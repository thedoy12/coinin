import { handle } from "@hono/node-server/vercel";
import app from "../dist/boot.js";

export const config = {
  maxDuration: 60,
};

export default handle(app);
