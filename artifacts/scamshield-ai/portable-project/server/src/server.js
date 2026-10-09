import path from "node:path";
import dotenv from "dotenv";
import app from "./app.js";

const serverDirectory = import.meta.dirname;
dotenv.config({ path: path.resolve(serverDirectory, "../../.env") });
dotenv.config({
  path: path.resolve(serverDirectory, "../.env"),
  override: false,
});

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port number.");
}

const server = app.listen(port, "0.0.0.0", () => {
  console.info(`ScamShield API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
