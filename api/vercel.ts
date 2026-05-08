import { handle } from "hono/vercel";
import app from "./boot";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

const handler = handle(app);

export default handler;
