import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-origin" } }));
app.use(cors({ origin: false }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(
    getClerkProxyHost(req) ?? "",
    process.env.CLERK_PUBLISHABLE_KEY,
  ),
})));
app.use("/api", rateLimit({
  windowMs: 60000, limit: 180, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "You're moving quickly. Please wait a moment and try again." },
}));
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const host = getClerkProxyHost(req) ?? req.get("host");
    if (req.get("sec-fetch-site") === "cross-site" || (origin && new URL(origin).host !== host)) {
      res.status(403).json({ error: "Please make this request from the app." }); return;
    }
  }
  next();
});

app.use("/api", router);
app.use(((error, req, res, _next) => {
  req.log.error({ name: error?.name, code: error?.code }, "Request could not be completed");
  const status = error?.type === "entity.too.large" ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ error: status === 400 ? "Please send valid information and try again." : "Something didn't save. Please try again in a moment." });
}) as express.ErrorRequestHandler);

export default app;
