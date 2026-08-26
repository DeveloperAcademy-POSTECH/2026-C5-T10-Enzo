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
  assert.ok(model.elements.some(({ type, name }) => type === "Component" && /메시징|Messaging/.test(name)));
  assert.ok(model.elements.some(({ type, name }) => type === "Component" && /영속성|Persistence/.test(name)));
  assert.ok(model.elements.some(({ type, name }) => type === "Component" && /센서|Sensor/.test(name)));
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

test("never pulls dependency evidence from another target by matching a symbol name", () => {
  const runtimeEvidence = { file: "Example/DataStore.swift", line: 1, symbol: "DataStore", reason: "class declaration" };
  const scan = {
    project: { name: "Example" },
    files: [{ path: "Example.xcodeproj/project.pbxproj", kind: "xcode-project" }],
    targets: [
      { id: "APP", name: "Example", productType: "com.apple.product-type.application", runtimeKind: "macos-app", isTest: false, evidence: { file: "Example.xcodeproj/project.pbxproj", reason: "target" } },
      { id: "TEST", name: "ExampleTests", productType: "com.apple.product-type.bundle.unit-test", runtimeKind: "unknown-runtime", isTest: true, targetDependencyNames: [], evidence: { file: "Example.xcodeproj/project.pbxproj", reason: "test target" } },
    ],
    declarations: [
      { kind: "class", name: "DataStore", conformances: [], attributes: [], targetNames: ["Example"], evidence: runtimeEvidence },
      { kind: "class", name: "DataStoreTests", conformances: [], attributes: [], targetNames: ["ExampleTests"], evidence: { file: "ExampleTests/DataStoreTests.swift", line: 1, reason: "test declaration" } },
    ],
    imports: [{ name: "SwiftData", targetNames: ["Example"], evidence: { file: runtimeEvidence.file, line: 2, reason: "Swift import" } }],
    dependencies: [{ kind: "initializer-call", fromSymbol: "DataStoreTests", toSymbol: "DataStore", targetNames: ["ExampleTests"], evidence: { file: "ExampleTests/DataStoreTests.swift", line: 4, reason: "test-only initializer" } }],
    interfaces: [],
    interactions: [],
    artifacts: [],
  };

  const model = synthesizeC4Model(scan, { language: "en" });
  const component = model.elements.find(({ type }) => type === "Component");

  assert.ok(component);
  assert.equal(component.evidence.some(({ file }) => file.includes("Tests")), false);
  assert.equal(JSON.stringify(model.relationships).includes("DataStoreTests"), false);
});
