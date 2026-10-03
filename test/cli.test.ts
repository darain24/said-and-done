import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { EXIT, run } from "../src/cli.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (l: string) => out.push(l), err: (l: string) => err.push(l) } };
}

test("cli: --version prints the package version", async () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  const c = capture();
  assert.equal(await run(["--version"], c.io), EXIT.ok);
  assert.deepEqual(c.out, [pkg.version]);
});

test("cli: no arguments prints help", async () => {
  const c = capture();
  assert.equal(await run([], c.io), EXIT.ok);
  assert.match(c.out.join("\n"), /Usage: said <command>/);
});

test("cli: an unknown command is a usage error", async () => {
  const c = capture();
  assert.equal(await run(["frobnicate"], c.io), EXIT.usage);
  assert.match(c.err.join("\n"), /Unknown command "frobnicate"/);
});

test("cli: an unknown flag is a usage error", async () => {
  const c = capture();
  assert.equal(await run(["--nope"], c.io), EXIT.usage);
  assert.match(c.err.join("\n"), /said --help/);
});
