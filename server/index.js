import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const port = Number.parseInt(process.env.PORT || "8765", 10);
const host = process.env.HOST || "127.0.0.1";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "herman-coach",
  });
});

app.use("/assets", express.static(path.join(rootDir, "assets"), { index: false }));

app.get(["/app.js", "/styles.css"], (request, response) => {
  response.sendFile(path.join(rootDir, request.path));
});

app.get(["/", "/u/:token"], (_request, response) => {
  response.sendFile(path.join(rootDir, "index.html"));
});

app.use((_request, response) => {
  response.status(404).json({
    error: "Not found",
  });
});

app.listen(port, host, () => {
  console.log(`HermanCoach listening on http://${host}:${port}`);
});
