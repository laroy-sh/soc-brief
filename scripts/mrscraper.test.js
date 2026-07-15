// Offline test — mocks fetch, never hits the live API. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { scrape } from "./mrscraper.js";

const mockFetch = (reply) => {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => reply, text: async () => JSON.stringify(reply) };
  };
  fn.calls = calls;
  return fn;
};

test("builds the documented request and returns markdown", async () => {
  process.env.MRSCRAPER_API_TOKEN = "test-token";
  const f = mockFetch({ success: true, markdown: "# Hello", data: "ignored" });
  const out = await scrape("https://example.com", { fetchImpl: f, geoCode: "DE" });
  assert.equal(out, "# Hello");
  const { url, init } = f.calls[0];
  assert.equal(url, "https://api.mrscraper.com?super=true&html=true");
  assert.equal(init.method, "POST");
  assert.equal(init.headers["x-api-token"], "test-token");
  const body = JSON.parse(init.body);
  assert.equal(body.url, "https://example.com");
  assert.equal(body.agent, "general");
  assert.equal(body.geo_code, "DE");
});

test("json format returns data and requires a prompt", async () => {
  process.env.MRSCRAPER_API_TOKEN = "test-token";
  const f = mockFetch({ success: true, data: { posts: [] } });
  const out = await scrape("https://example.com", { fetchImpl: f, format: "json", prompt: "list posts" });
  assert.deepEqual(out, { posts: [] });
  await assert.rejects(scrape("https://example.com", { fetchImpl: f, format: "json" }), /requires opts.prompt/);
});

test("fails fast without token", async () => {
  delete process.env.MRSCRAPER_API_TOKEN;
  await assert.rejects(scrape("https://example.com"), /MRSCRAPER_API_TOKEN is not set/);
});
