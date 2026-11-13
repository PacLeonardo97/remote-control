import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import { tvRouter } from "./routes/tv.js";
import { remoteRouter } from "./routes/remote.js";
import { controlRouter } from "./routes/control.js";
import { remote } from "./controllers/remote.js";
import { errorHandler } from "./middlewares/errors.js";
import { loadTarget } from "./services/config.js";

const host = process.env.API_HOST || "127.0.0.1";
const port = Number(process.env.API_PORT || 3001);
const origin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const token = process.env.API_TOKEN;
if (
  !["127.0.0.1", "localhost", "::1"].includes(host) &&
  (!token || token.length < 24)
)
  throw new Error(
    "API_TOKEN of at least 24 characters is required for LAN access",
  );
const app = express();
app.use(cors({ origin }));
app.use(express.json({ limit: "16kb" }));
app.use("/api", (req, res, next) => {
  if (!token) return next();
  const supplied = req.headers.authorization?.replace(/^Bearer /, "") || "";
  const expected = Buffer.from(token);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return res
      .status(401)
      .json({
        error: { code: "UNAUTHORIZED", message: "Valid API token required" },
      });
  next();
});
app.use("/api/tv", tvRouter);
app.use("/api/remote", remoteRouter);
app.use("/api/control", controlRouter);
app.use("/api", (_req, res) =>
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "API route not found" } }),
);
const frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/dist",
);
app.use(express.static(frontendDist));
app.get("*", (_req, res) =>
  res.sendFile(path.join(frontendDist, "index.html")),
);
app.use(errorHandler);
await loadTarget();
await remote.load();
app.listen(port, host, () =>
  console.log(`TV API listening on http://${host}:${port}`),
);
