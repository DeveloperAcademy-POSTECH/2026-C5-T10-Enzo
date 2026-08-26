import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { scanXcodeProject } from "../scripts/scan-xcode-project.mjs";
import { synthesizeC4Model } from "../scripts/synthesize-c4-model.mjs";

const fixture = path.resolve(import.meta.dirname, "fixtures/sample-xcode-project");

test("builds target containers, cohesive components, rich I/O, and paired directional relationships", async () => {
  const scan = await scanXcodeProject(fixture);
  const model = synthesizeC4Model(scan, { language: "ko" });

  assert.ok(model.elements.some(({ type, name }) => type === "Container" && /Watch/.test(name)));
  assert.ok(model.elements.some(({ type, responsibilities, inputs, outputs }) =>
    type === "Component" && responsibilities?.length && inputs?.length && outputs?.length));

  const session = model.relationships.find(({ technology }) => /transferUserInfo/.test(technology));
  assert.ok(session?.senderEvidence.length);
  assert.ok(session?.receiverEvidence.length);
  assert.match(session.description, /Song|곡|BeatGrid|박자 지도/);
  const files = model.elements.find(({ type, external, visualRole }) => type === "Software System" && external && visualRole === "data-store");
  assert.ok(files);
  assert.ok(model.relationships.some(({ from, to, technology }) => from === files.id && to !== files.id && /Security-scoped URL/.test(technology)));
});

test("does not synthesize runtime containers from test targets", async () => {
  const scan = await scanXcodeProject(fixture);
  const model = synthesizeC4Model(scan, { language: "ko" });

  assert.equal(model.elements.some(({ type, name }) => type === "Container" && /Tests/.test(name)), false);
  assert.ok(model.excludedCandidates.some(({ reason }) => /test target/i.test(reason)));
});

test("clusters source declarations by architectural responsibility instead of creating one Component per View", async () => {
  const scan = await scanXcodeProject(fixture);
  const model = synthesizeC4Model(scan, { language: "ko" });
  const runtimeContainers = model.elements.filter(({ type, visualRole }) => type === "Container" && visualRole !== "data-store");

  for (const container of runtimeContainers) {
    const components = model.elements.filter(({ type, parentId }) => type === "Component" && parentId === container.id);
    assert.ok(components.length >= 2 && components.length <= 12);
    assert.equal(components.some(({ name }) => name === "PracticeView" || name === "TempoCoachApp"), false);
    assert.ok(components.every(({ responsibilities, inputs, outputs, evidence }) =>
      responsibilities.length && inputs.length && outputs.length && evidence.length >= 2 && evidence.length <= 18));
  }
  assert.ok(model.elements.some(({ type, name }) => type === "Component" && /프레젠테이션|Presentation/.test(name)));
  assert.ok(model.elements.some(({ type, name }) => type === "Component" && /연결|Connectivity/.test(name)));
  assert.ok(model.elements.some(({ type, name }) => type === "Component" && /박자 매처|Beat Matcher/.test(name)));
  assert.ok(model.elements.some(({ type, name }) => type === "Component" && /리듬 코치|Rhythm Coach/.test(name)));
});

test("creates reverse communication only when opposite-direction send evidence exists", async () => {
  const scan = await scanXcodeProject(fixture);
  const model = synthesizeC4Model(scan, { language: "ko" });
  const containers = model.elements.filter(({ type, name }) => type === "Container" && !/저장소|Store/.test(name));
  const phone = containers.find(({ name }) => !/Watch/.test(name));
  const watch = containers.find(({ name }) => /Watch/.test(name));
  const crossRuntime = model.relationships.filter(({ from, to }) =>
    (from === phone?.id && to === watch?.id) || (from === watch?.id && to === phone?.id));

  assert.ok(crossRuntime.some(({ from }) => from === phone?.id));
  assert.ok(crossRuntime.some(({ from }) => from === watch?.id));
  assert.ok(crossRuntime.every(({ senderEvidence }) => senderEvidence?.length));
});
