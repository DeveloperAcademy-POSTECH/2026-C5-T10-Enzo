import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runPipeline } from "../scripts/build-c4-explorer.mjs";

const fixture = path.resolve(import.meta.dirname, "fixtures/sample-xcode-project");

test("keeps the generated explorer dense, evidence-backed, and limited to C4 L1-L3", async () => {
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-richness-"));
  const result = await runPipeline({ projectRoot: fixture, outputDirectory, language: "ko" });
  const runtimeContainers = result.model.elements.filter(({ type, visualRole }) =>
    type === "Container" && visualRole !== "data-store");
  const components = result.model.elements.filter(({ type }) => type === "Component");
  const externalFileStore = result.model.elements.find(({ type, external, visualRole }) =>
    type === "Software System" && external && visualRole === "data-store");

  assert.equal(runtimeContainers.length, 2);
  assert.equal(result.model.elements.some(({ type, name }) => type === "Container" && /Tests/.test(name)), false);
  assert.ok(components.length >= 6);
  assert.ok(components.every(({ responsibilities, inputs, outputs, evidence }) =>
    responsibilities?.length && inputs?.length && outputs?.length && evidence?.length >= 2 && evidence.length <= 18));
  assert.ok(components.every(({ name }) => !/View$|App$/.test(name)));
  assert.ok(externalFileStore);
  assert.ok(result.model.relationships.some(({ technology, senderEvidence, receiverEvidence }) =>
    /WCSession/.test(technology ?? "") && senderEvidence?.length && receiverEvidence?.length));
  assert.ok(result.model.relationships.some(({ technology, from }) =>
    from === externalFileStore.id && /Security-scoped URL/.test(technology ?? "")));
  assert.deepEqual(result.model.views.map(({ level }) => level), [1, 2, 3, 3]);
  assert.ok(result.model.views.filter(({ level }) => level === 3).every(({ elementIds, relationshipIds }) =>
    elementIds.length >= 4 && relationshipIds.length >= 3));
  assert.deepEqual(result.validation.errors, []);
});
