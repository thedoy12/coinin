import { handle } from "@hono/node-server/vercel";
import app from "./boot";

export const config = {
  maxDuration: 60,
};

export default handle(app);
