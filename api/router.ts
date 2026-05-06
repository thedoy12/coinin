import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { gameRouter } from "./routers/game-router";
import { productRouter } from "./routers/product-router";
import { orderRouter } from "./routers/order-router";
import { paymentRouter } from "./routers/payment-router";
import { adminRouter } from "./routers/admin-router";
import { popupRouter } from "./routers/popup-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  game: gameRouter,
  product: productRouter,
  order: orderRouter,
  payment: paymentRouter,
  popup: popupRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
