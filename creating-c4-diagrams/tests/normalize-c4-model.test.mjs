import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  normalizeC4Model,
  runNormalizeCli,
  validateC4Model,
} from "../scripts/normalize-c4-model.mjs";

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

test("validates hierarchy independently of element array order", () => {
  const reordered = structuredClone(raw);
  reordered.elements.reverse();
  const result = normalizeC4Model(reordered, {});

  assert.equal(result.issues.some(({ code }) => code === "element-parent-invalid"), false);
  assert.deepEqual(validateC4Model(result.model), []);
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
