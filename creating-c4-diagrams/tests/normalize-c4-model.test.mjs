import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  normalizeC4Model,
  runNormalizeCli,
  validateC4Model,
} from "../scripts/normalize-c4-model.mjs";
import { c4SemanticProjection, exportStructurizrDsl, extractDslIdentifiers } from "../scripts/export-structurizr-dsl.mjs";

const evidence = (file, line, reason) => ({ file, line, reason });

const raw = {
  project: { name: "TempoCoach", description: "Practises rhythm", language: "en" },
  elements: [
    { id: "user", type: "Person", name: "Learner", description: "Practises rhythm", evidence: [evidence("README.md", 1, "Product role")], confidence: "inferred" },
    { id: "system", type: "Software System", name: "TempoCoach", description: "Coaches rhythm", evidence: [evidence("TempoCoach.xcodeproj/project.pbxproj", 1, "Owned product")], confidence: "confirmed" },
    { id: "phone", parentId: "system", type: "Container", name: "iPhone App", technology: "SwiftUI", description: "Runs practice", evidence: [evidence("TempoCoachApp.swift", 3, "Application entry")], confidence: "confirmed" },
    { id: "watch", parentId: "system", type: "Container", name: "Watch App", technology: "SwiftUI", description: "Measures rhythm", evidence: [evidence("TempoCoachWatchApp.swift", 4, "Application entry")], confidence: "confirmed" },
    {
      id: "flow", parentId: "phone", type: "Component", name: "Practice Flow", technology: "Swift", description: "Coordinates practice",
      responsibilities: ["Coordinates practice", "Presents progress"],
      inputs: [{ name: "Selected song", evidence: [evidence("PracticeView.swift", 10, "Song input")] }],
      outputs: [{ name: "Practice result", evidence: [evidence("PracticeView.swift", 18, "Result output")] }],
      implementationStatus: "active",
      evidenceSummary: "Three direct source signals",
      evidence: [evidence("PracticeView.swift", 8, "Stable entry flow")], confidence: "confirmed",
    },
  ],
  relationships: [
    { id: "uses-system", from: "user", to: "system", description: "Practises rhythm", evidence: [evidence("README.md", 1, "Product purpose")], confidence: "inferred" },
    { id: "uses-phone", from: "user", to: "phone", description: "Starts a practice session", evidence: [evidence("PracticeView.swift", 8, "User action")], confidence: "confirmed" },
    { id: "uses-flow", from: "user", to: "flow", description: "Controls the practice flow", evidence: [evidence("PracticeView.swift", 12, "Direct UI action")], confidence: "confirmed" },
    {
      id: "syncs", from: "phone", to: "watch", description: "Sends practice state", technology: "WCSession.transferUserInfo",
      purpose: "Synchronizes practice", payload: "Song + BeatGrid",
      senderEvidence: [evidence("SessionBridge.swift", 10, "Direct send")],
      receiverEvidence: [evidence("WatchSession.swift", 20, "Direct receive")],
      evidence: [evidence("SessionBridge.swift", 10, "Direct send")], confidence: "confirmed",
    },
  ],
};

function makeFixtureModel() {
  const fixture = structuredClone(raw);
  fixture.elements.push({
    id: "store",
    parentId: "system",
    type: "Container",
    name: "Practice Store",
    technology: "SQLite",
    description: "Stores practice results",
    dataStore: true,
    evidence: [evidence("PracticeStore.swift", 1, "Persistence boundary")],
    confidence: "confirmed",
  });
  return fixture;
}

test("derives stable C4 and visual-role tags", () => {
  const { model } = normalizeC4Model(makeFixtureModel(), { project: { name: "TempoCoach" } });
  const person = model.elements.find(({ id }) => id === "user");
  const store = model.elements.find(({ id }) => id === "store");
  assert.deepEqual(person.tags, ["Element", "Person", "person"]);
  assert.deepEqual(store.tags, ["Element", "Container", "data-store"]);
});

test("normalizes declarative layout configuration for every view", () => {
  const { model } = normalizeC4Model(makeFixtureModel(), { project: { name: "TempoCoach" } });
  assert.ok(model.views.every(({ layoutConfiguration }) =>
    layoutConfiguration.direction === "LeftRight"
    && layoutConfiguration.rankSeparation >= 112
    && layoutConfiguration.nodeSeparation >= 72
    && layoutConfiguration.relationshipSeparation >= 28));
});

test("derives scoped L1, L2, and L3 views from one hierarchy", () => {
  const { model } = normalizeC4Model(raw, { project: { name: "TempoCoach" } });

  assert.deepEqual(model.views.map(({ level }) => level), [1, 2, 3]);
  assert.deepEqual(model.views.find(({ level }) => level === 1).elementIds.sort(), ["system", "user"]);
  assert.deepEqual(model.views.find(({ level }) => level === 2).elementIds.sort(), ["phone", "user", "watch"]);
  assert.deepEqual(model.views.find(({ level }) => level === 3).elementIds.sort(), ["flow", "user"]);
  assert.deepEqual(validateC4Model(model), []);
});

test("preserves rich element I/O, status, and both ends of relationship evidence", () => {
  const { model } = normalizeC4Model(raw, { project: { name: "TempoCoach" } });
  const flow = model.elements.find(({ id }) => id === "flow");
  const syncs = model.relationships.find(({ id }) => id === "syncs");

  assert.deepEqual(flow.responsibilities, ["Coordinates practice", "Presents progress"]);
  assert.deepEqual(flow.inputs.map(({ name }) => name), ["Selected song"]);
  assert.deepEqual(flow.outputs.map(({ name }) => name), ["Practice result"]);
  assert.equal(flow.implementationStatus, "active");
  assert.equal(flow.evidenceSummary, "Three direct source signals");
  assert.equal(syncs.purpose, "Synchronizes practice");
  assert.equal(syncs.payload, "Song + BeatGrid");
  assert.equal(syncs.senderEvidence.length, 1);
  assert.equal(syncs.receiverEvidence.length, 1);
  assert.equal(syncs.evidence.length, 2);
});

test("repairs recoverable metadata and dangling references without inventing code diagrams", () => {
  const broken = structuredClone(raw);
  broken.relationships.push({ id: "bad", from: "missing", to: "phone", description: "Uses" });
  broken.elements[4].description = "";
  const result = normalizeC4Model(broken, { project: { name: "TempoCoach" } });

  assert.equal(result.model.relationships.some(({ id }) => id === "bad"), false);
  assert.ok(result.repairs.some(({ code }) => code === "relationship-dangling-removed"));
  assert.ok(result.issues.some(({ code }) => code === "component-description-defaulted"));
  assert.equal(result.model.elements.find(({ id }) => id === "flow").confidence, "review-required");
  assert.equal(result.model.views.some(({ level }) => level === 4), false);
});

test("removes Components outside a Container and flags inter-container relationships without technology", () => {
  const broken = structuredClone(raw);
  broken.elements.push({ id: "orphan", parentId: "system", type: "Component", name: "Source File", description: "A file", technology: "Swift" });
  broken.relationships.find(({ id }) => id === "syncs").technology = "";
  const result = normalizeC4Model(broken, {});

  assert.equal(result.model.elements.some(({ id }) => id === "orphan"), false);
  assert.ok(result.repairs.some(({ code }) => code === "element-invalid-parent-removed"));
  assert.ok(result.issues.some(({ code }) => code === "relationship-technology-required"));
});

test("removes descendants of elements with invalid parents", () => {
  const broken = structuredClone(raw);
  broken.elements.push(
    { id: "invalid-container", parentId: "missing-system", type: "Container", name: "Invalid Container", description: "Invalid parent", technology: "Swift" },
    { id: "descendant", parentId: "invalid-container", type: "Component", name: "Descendant", description: "Invalid ancestor", technology: "Swift" },
  );
  const result = normalizeC4Model(broken, {});

  assert.equal(result.model.elements.some(({ id }) => id === "invalid-container"), false);
  assert.equal(result.model.elements.some(({ id }) => id === "descendant"), false);
  assert.deepEqual(result.repairs.filter(({ code }) => code === "element-invalid-parent-removed").map(({ elementId }) => elementId), ["invalid-container", "descendant"]);
  assert.deepEqual(validateC4Model(result.model), []);
});

test("normalizes substitution and token-escape sequences before both JSON and DSL export", () => {
  const unsafe = structuredClone(raw);
  unsafe.project.name = "Tempo${BUILD_NAME}";
  unsafe.elements[0].name = 'Learner "quoted" C:\\Temp';
  unsafe.elements[0].description = String.raw`Reads C:\new and \${HOME}`;
  unsafe.elements[0].tags = ["role${TAG}"];
  unsafe.elements[2].technology = "SwiftUI\\";
  unsafe.relationships[0].description = String.raw`Sends C:\notes via \${CHANNEL}`;

  const result = normalizeC4Model(unsafe, {});
  const dslSemantics = extractDslIdentifiers(exportStructurizrDsl(result.model));
  const person = result.model.elements.find(({ id }) => id === "user");
  const relationship = result.model.relationships.find(({ id }) => id === "uses-system");

  assert.doesNotMatch(JSON.stringify(result.model), /\$\{|\\\\n/);
  assert.deepEqual(dslSemantics, c4SemanticProjection(result.model));
  assert.equal(dslSemantics.elements.find(({ id }) => id === "user").description, person.description);
  assert.equal(dslSemantics.relationships.includes(JSON.stringify([relationship.from, relationship.to, relationship.description, relationship.technology ?? ""])), true);
  assert.deepEqual(
    result.repairs.filter(({ code }) => code === "dsl-text-normalized").map(({ field }) => field).sort(),
    ["element.description", "element.tags", "element.technology", "project.name", "relationship.description"],
  );
});

test("repairs duplicate top-level names and directed relationship descriptions deterministically", () => {
  const duplicate = structuredClone(raw);
  duplicate.elements.push({
    id: "case-variant-name-system",
    type: "Software System",
    name: "learner",
    description: "A distinct system",
    evidence: [evidence("Duplicate.swift", 1, "Duplicate name fixture")],
    confidence: "confirmed",
  }, {
    id: "duplicate-name-system",
    type: "Software System",
    name: "Learner",
    description: "An exactly duplicate name",
    evidence: [evidence("Duplicate.swift", 2, "Exact duplicate name fixture")],
    confidence: "confirmed",
  });
  duplicate.relationships.push(
    { id: "uses-system-case-variant", from: "user", to: "system", description: "practises rhythm", technology: "HTTPS", evidence: [evidence("Duplicate.swift", 3, "Case variant")], confidence: "confirmed" },
    { id: "uses-system-different-tech", from: "user", to: "system", description: "Practises rhythm", technology: "HTTPS", evidence: [evidence("Duplicate.swift", 4, "Different technology")], confidence: "confirmed" },
  );

  const first = normalizeC4Model(duplicate, {});
  const second = normalizeC4Model(duplicate, {});
  const topLevelNames = first.model.elements
    .filter(({ type }) => type === "Person" || type === "Software System")
    .map(({ name }) => name);
  const directedDescriptions = first.model.relationships
    .map(({ from, to, description }) => JSON.stringify([from, to, description]));

  assert.equal(new Set(topLevelNames).size, topLevelNames.length);
  assert.equal(new Set(directedDescriptions).size, directedDescriptions.length);
  assert.ok(first.model.elements.some(({ name }) => name === "learner"));
  assert.ok(first.model.relationships.some(({ description }) => description === "practises rhythm"));
  assert.ok(first.repairs.some(({ code }) => code === "element-name-duplicate-repaired"));
  assert.ok(first.repairs.some(({ code }) => code === "relationship-description-duplicate-repaired"));
  assert.ok(first.issues.some(({ code }) => code === "element-name-duplicate-repaired"));
  assert.ok(first.issues.some(({ code }) => code === "relationship-description-duplicate-repaired"));
  assert.deepEqual(first, second);
});

test("keeps exact relationship case variants distinct", () => {
  const fixture = structuredClone(raw);
  fixture.relationships.push({
    id: "case-variant",
    from: "user",
    to: "system",
    description: "practises rhythm",
    evidence: [evidence("Case.swift", 1, "Case variant")],
    confidence: "confirmed",
  });

  const result = normalizeC4Model(fixture, {});

  assert.ok(result.model.relationships.some(({ id }) => id === "uses-system"));
  assert.ok(result.model.relationships.some(({ id }) => id === "case-variant"));
  assert.equal(result.repairs.some(({ code, relationshipId }) => code === "relationship-duplicate-removed" && relationshipId === "case-variant"), false);
});

test("keeps pipe-containing relationship tuples collision-free", () => {
  const fixture = structuredClone(raw);
  fixture.relationships.push(
    { id: "pipe-description", from: "user", to: "system", description: "a|b", technology: "c", evidence: [evidence("Pipe.swift", 1, "Description pipe")], confidence: "confirmed" },
    { id: "pipe-technology", from: "user", to: "system", description: "a", technology: "b|c", evidence: [evidence("Pipe.swift", 2, "Technology pipe")], confidence: "confirmed" },
  );

  const result = normalizeC4Model(fixture, {});

  assert.ok(result.model.relationships.some(({ id }) => id === "pipe-description"));
  assert.ok(result.model.relationships.some(({ id }) => id === "pipe-technology"));
});

test("merges all evidence channels when a true exact relationship duplicate collapses", () => {
  const fixture = structuredClone(raw);
  fixture.relationships.find(({ id }) => id === "uses-system").evidence = [];
  fixture.relationships.push({
    id: "uses-system-exact-copy",
    from: "user",
    to: "system",
    description: "Practises rhythm",
    senderEvidence: [evidence("Duplicate.swift", 10, "Sender duplicate evidence")],
    receiverEvidence: [evidence("Duplicate.swift", 20, "Receiver duplicate evidence")],
    evidence: [evidence("Duplicate.swift", 30, "General duplicate evidence")],
    confidence: "confirmed",
  });

  const result = normalizeC4Model(fixture, {});
  const survivor = result.model.relationships.find(({ id }) => id === "uses-system");

  assert.equal(result.model.relationships.some(({ id }) => id === "uses-system-exact-copy"), false);
  assert.deepEqual(survivor.senderEvidence, [evidence("Duplicate.swift", 10, "Sender duplicate evidence")]);
  assert.deepEqual(survivor.receiverEvidence, [evidence("Duplicate.swift", 20, "Receiver duplicate evidence")]);
  assert.deepEqual(survivor.evidence, [
    evidence("Duplicate.swift", 30, "General duplicate evidence"),
    evidence("Duplicate.swift", 10, "Sender duplicate evidence"),
    evidence("Duplicate.swift", 20, "Receiver duplicate evidence"),
  ]);
  assert.ok(result.repairs.some(({ code, relationshipId, survivorRelationshipId }) =>
    code === "relationship-duplicate-removed"
    && relationshipId === "uses-system-exact-copy"
    && survivorRelationshipId === "uses-system"));
  assert.equal(result.issues.some(({ code, relationshipId }) => code === "evidence-required" && relationshipId === "uses-system"), false);
});

test("removes Person and Software System technology before JSON and DSL parity", () => {
  const fixture = structuredClone(raw);
  fixture.elements[0].technology = "Human";
  fixture.elements[1].technology = "Swift";

  const result = normalizeC4Model(fixture, {});

  assert.equal("technology" in result.model.elements.find(({ id }) => id === "user"), false);
  assert.equal("technology" in result.model.elements.find(({ id }) => id === "system"), false);
  assert.equal(result.model.elements.find(({ id }) => id === "phone").technology, "SwiftUI");
  assert.deepEqual(extractDslIdentifiers(exportStructurizrDsl(result.model)), c4SemanticProjection(result.model));
  assert.deepEqual(
    result.repairs.filter(({ code }) => code === "element-technology-removed").map(({ elementId }) => elementId),
    ["user", "system"],
  );
});

test("normalizes comma-bearing user tags before JSON and DSL parity", () => {
  const fixture = structuredClone(raw);
  fixture.elements[0].tags = ["practice,coach"];

  const result = normalizeC4Model(fixture, {});
  const person = result.model.elements.find(({ id }) => id === "user");

  assert.deepEqual(person.tags, ["Element", "Person", "person", "practice;coach"]);
  assert.deepEqual(extractDslIdentifiers(exportStructurizrDsl(result.model)), c4SemanticProjection(result.model));
  assert.deepEqual(
    result.repairs.filter(({ code }) => code === "element-tag-comma-normalized"),
    [{ code: "element-tag-comma-normalized", elementId: "user", index: 0, original: "practice,coach", value: "practice;coach" }],
  );
});

test("validates hierarchy independently of element array order", () => {
  const reordered = structuredClone(raw);
  reordered.elements.reverse();
  const result = normalizeC4Model(reordered, {});

  assert.equal(result.issues.some(({ code }) => code === "element-parent-invalid"), false);
  assert.deepEqual(validateC4Model(result.model), []);
});

test("repairs top-level parents and incompatible visual roles", () => {
  const fixture = structuredClone(raw);
  fixture.elements.find(({ id }) => id === "user").parentId = "system";
  fixture.elements.find(({ id }) => id === "phone").visualRole = "person";

  const result = normalizeC4Model(fixture, {});
  const person = result.model.elements.find(({ id }) => id === "user");
  const container = result.model.elements.find(({ id }) => id === "phone");

  assert.equal("parentId" in person, false);
  assert.equal(container.visualRole, "application-container");
  assert.ok(result.repairs.some(({ code, elementId }) => code === "element-top-level-parent-removed" && elementId === "user"));
  assert.ok(result.repairs.some(({ code, elementId }) => code === "element-visual-role-repaired" && elementId === "phone"));
  assert.deepEqual(validateC4Model(result.model), []);
});

test("rejects canonical hierarchy, tag, visual-role, view abstraction, and layout mutations", () => {
  const mutations = [
    {
      code: "element-parent-invalid",
      mutate(model) { model.elements.find(({ id }) => id === "user").parentId = "system"; },
    },
    {
      code: "element-tags-required",
      mutate(model) { model.elements.find(({ id }) => id === "phone").tags = ["Element", "Container"]; },
    },
    {
      code: "element-visual-role-invalid",
      mutate(model) { model.elements.find(({ id }) => id === "flow").visualRole = "data-store"; },
    },
    {
      code: "view-abstraction-invalid",
      mutate(model) { model.views.find(({ level }) => level === 2).elementIds.push("flow"); },
    },
    {
      code: "view-layout-configuration-invalid",
      mutate(model) { model.views[0].layoutConfiguration = { direction: "Diagonal", rankSeparation: 0, nodeSeparation: -1, relationshipSeparation: Number.NaN }; },
    },
    {
      code: "element-parent-invalid",
      mutate(model) { model.elements.find(({ id }) => id === "phone").parentId = "user"; },
    },
  ];

  for (const { code, mutate } of mutations) {
    const model = normalizeC4Model(raw, {}).model;
    mutate(model);
    assert.ok(validateC4Model(model).some((item) => item.code === code), code);
  }
});

test("writes normalized model and inspection JSON through the CLI", async () => {
  const directory = await fs.mkdtemp("/private/tmp/creating-c4-normalize-");
  const rawPath = path.join(directory, "raw.json");
  const scanPath = path.join(directory, "scan.json");
  const modelPath = path.join(directory, "model.json");
  const inspectionPath = path.join(directory, "inspection.json");
  await fs.writeFile(rawPath, JSON.stringify(raw));
  await fs.writeFile(scanPath, JSON.stringify({ project: { name: "TempoCoach" } }));

  assert.equal(await runNormalizeCli([rawPath, scanPath, modelPath, inspectionPath]), 0);
  assert.equal(JSON.parse(await fs.readFile(modelPath, "utf8")).views.length, 3);
  assert.deepEqual(Object.keys(JSON.parse(await fs.readFile(inspectionPath, "utf8"))).sort(), ["issues", "repairs"]);
});
