import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { deepmerge } from "deepmerge-ts";
import express from "express";
import proxyaddr from "proxy-addr";
import qs from "qs";

test("malformed compressed requests leave the HTTP server available", async (t) => {
  const app = express();
  app.use(express.json({ limit: "64kb" }));
  app.post("/input", (request, response) => response.json(request.body));
  app.get("/health", (_request, response) => response.json({ ok: true }));
  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).json({ error: "Invalid request body" });
  });

  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, "listening");

  const compressed = gzipSync(JSON.stringify({ prompt: "A normal request" }));
  const accepted = await send(server, {
    path: "/input",
    body: compressed,
    headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
  });
  assert.equal(accepted.status, 200);
  assert.deepEqual(JSON.parse(accepted.body), { prompt: "A normal request" });

  const malformed = await send(server, {
    path: "/input",
    body: Buffer.concat([compressed, Buffer.from("trailing-invalid-compressed-data")]),
    headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
  });
  assert.ok([200, 400].includes(malformed.status));

  const oversized = await send(server, {
    path: "/input",
    body: Buffer.from(JSON.stringify({ prompt: "x".repeat(65 * 1024) })),
    headers: { "Content-Type": "application/json" },
  });
  assert.equal(oversized.status, 413);

  const health = await send(server, { path: "/health" });
  assert.equal(health.status, 200);
  assert.deepEqual(JSON.parse(health.body), { ok: true });
});

test("request parsers reject invalid body-size limits", () => {
  assert.throws(() => express.json({ limit: "not-a-size" }), TypeError);
  assert.throws(() => express.urlencoded({ extended: false, limit: "not-a-size" }), TypeError);
});

test("IPv4-mapped proxy subnets do not trust unrelated clients", () => {
  const malformedTrust = proxyaddr.compile("::ffff:10.0.0.0/8");
  assert.equal(malformedTrust("203.0.113.10"), false);

  const explicitTrust = proxyaddr.compile("10.0.0.0/8");
  assert.equal(explicitTrust("10.1.2.3"), true);
  assert.equal(explicitTrust("203.0.113.10"), false);
});

test("query parsing enforces array limits for comma-separated bracket keys", () => {
  assert.throws(() => qs.parse("a[]=1,2,3,4", {
    comma: true,
    arrayLimit: 3,
    throwOnLimitExceeded: true,
  }), /array limit exceeded/i);
});

test("query round trips handle attacker-controlled constructor properties", () => {
  const parsed = qs.parse("x[constructor][isBuffer]=y", { plainObjects: true });
  assert.doesNotThrow(() => qs.stringify(parsed));
});

test("configuration merging handles recursive objects without stack exhaustion", () => {
  const first = { database: { host: "localhost" } };
  first.self = first;
  const second = { database: { port: 5432 } };
  second.self = second;

  const merged = deepmerge(first, second);
  assert.deepEqual(merged.database, { host: "localhost", port: 5432 });
  assert.equal(merged.self, merged);
});

function send(server, { path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: "127.0.0.1",
      port: server.address().port,
      path,
      method: body ? "POST" : "GET",
      headers: { ...headers, ...(body ? { "Content-Length": body.length } : {}) },
      agent: false,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => resolve({
        status: response.statusCode,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    request.setTimeout(5000, () => request.destroy(new Error("Test request timed out")));
    request.on("error", reject);
    request.end(body);
  });
}
