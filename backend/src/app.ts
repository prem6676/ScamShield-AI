import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
const allowedOrigins = process.env.CLIENT_ORIGIN
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const candidate = err as { status?: number; statusCode?: number; message?: string };
  const rawStatus = candidate.statusCode ?? candidate.status ?? 500;
  const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
  const message =
    status === 413
      ? "Request body is too large."
      : status >= 500
        ? "The server could not complete this request."
        : candidate.message ?? "Invalid request.";

  if (status >= 500) {
    req.log.error({ err }, "Request failed");
  }
  res.status(status).json({ error: message });
});

export default app;
