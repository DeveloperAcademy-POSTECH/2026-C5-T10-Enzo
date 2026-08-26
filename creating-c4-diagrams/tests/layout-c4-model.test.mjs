import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  LAYOUT_TOKENS,
  layoutC4Model,
  measureNode,
  rectanglesOverlap,
  routeRelationship,
  runLayoutCli,
} from "../scripts/layout-c4-model.mjs";
import { normalizeC4Model } from "../scripts/normalize-c4-model.mjs";

const ev = (file, line) => [{ file, line, reason: "Fixture evidence" }];

function makeFixtureModel() {
  return {
    project: { name: "TempoCoach", description: "Coaches rhythm", language: "en" },
    elements: [
      { id: "user", type: "Person", name: "Learner", description: "Practises rhythm", evidence: ev("PracticeView.swift", 8), confidence: "confirmed" },
      { id: "system", type: "Software System", name: "TempoCoach", description: "Coordinates paired rhythm practice", evidence: ev("project.pbxproj", 27), confidence: "confirmed" },
      { id: "files", type: "Software System", external: true, name: "User Files", description: "Provides user-selected audio", evidence: ev("PracticeView.swift", 5), confidence: "confirmed" },
      { id: "phone", parentId: "system", type: "Container", name: "iPhone App", technology: "SwiftUI", description: "Controls practice and analyzes audio", evidence: ev("TempoCoachApp.swift", 3), confidence: "confirmed" },
      { id: "watch", parentId: "system", type: "Container", name: "Watch App", technology: "SwiftUI", description: "Measures wrist motion", evidence: ev("TempoCoachWatchApp.swift", 4), confidence: "confirmed" },
      { id: "store", parentId: "system", type: "Container", visualRole: "data-store", name: "Practice Store", technology: "SwiftData", description: "Persists practice sessions", evidence: ev("RhythmStore.swift", 4), confidence: "confirmed" },
      { id: "presentation", parentId: "phone", type: "Component", name: "Practice Presentation", technology: "SwiftUI", description: "Presents controls and results", evidence: ev("PracticeView.swift", 3), confidence: "confirmed" },
      { id: "coordinator", parentId: "phone", type: "Component", name: "Practice Coordinator", technology: "Swift", description: "Coordinates analysis and persistence", evidence: ev("PracticeView.swift", 13), confidence: "confirmed" },
      { id: "watch-ui", parentId: "watch", type: "Component", name: "Watch Presentation", technology: "SwiftUI", description: "Starts a measurement", evidence: ev("TempoCoachWatchApp.swift", 8), confidence: "confirmed" },
      { id: "motion", parentId: "watch", type: "Component", name: "Motion Adapter", technology: "Core Motion", description: "Samples device motion", evidence: ev("MotionSampler.swift", 5), confidence: "confirmed" },
    ],
    relationships: [
      { id: "uses-system", from: "user", to: "system", description: "Practises rhythm", evidence: ev("PracticeView.swift", 8), confidence: "confirmed" },
      { id: "selects-files", from: "system", to: "files", description: "Reads selected audio", evidence: ev("PracticeView.swift", 5), confidence: "confirmed" },
      { id: "uses-phone", from: "user", to: "phone", description: "Controls practice", evidence: ev("PracticeView.swift", 8), confidence: "confirmed" },
      { id: "reads-files", from: "phone", to: "files", description: "Reads audio", technology: "Security-scoped URL", evidence: ev("PracticeView.swift", 5), confidence: "confirmed" },
      { id: "syncs-watch", from: "phone", to: "watch", description: "Sends practice state", technology: "WCSession", evidence: ev("SessionBridge.swift", 10), confidence: "confirmed" },
      { id: "saves", from: "phone", to: "store", description: "Persists sessions", technology: "SwiftData", evidence: ev("RhythmStore.swift", 25), confidence: "confirmed" },
      { id: "user-presentation", from: "user", to: "presentation", description: "Starts practice", evidence: ev("PracticeView.swift", 8), confidence: "confirmed" },
      { id: "presentation-coordinator", from: "presentation", to: "coordinator", description: "Starts a session", evidence: ev("PracticeView.swift", 13), confidence: "confirmed" },
      { id: "watch-ui-motion", from: "watch-ui", to: "motion", description: "Starts sampling", evidence: ev("TempoCoachWatchApp.swift", 11), confidence: "confirmed" },
    ],
  };
}

function geometryFor(view, elementId) {
  return view.nodes.find((node) => node.elementId === elementId);
}

test("aligns L1 semantic nodes on one baseline with generous gaps", () => {
  const laidOut = layoutC4Model(normalizeC4Model(makeFixtureModel(), {}).model);
  const view = laidOut.views.find(({ level }) => level === 1);
  const nodes = view.elementIds.map((id) => geometryFor(view, id));

  assert.equal(new Set(nodes.map((node) => node.y + node.h)).size, 1);
  for (let first = 0; first < nodes.length; first += 1) {
    for (let second = first + 1; second < nodes.length; second += 1) {
      assert.equal(rectanglesOverlap(nodes[first], nodes[second], 260), false);
    }
  }
  assert.ok(view.worldSize.width >= 1800);
  assert.ok(view.worldSize.height >= 1000);
});

test("keeps L2 Containers and L3 Components inside their single scope boundaries", () => {
  const laidOut = layoutC4Model(normalizeC4Model(makeFixtureModel(), {}).model);
  for (const view of laidOut.views.filter(({ level }) => level >= 2)) {
    assert.ok(view.worldSize.width >= (view.level === 2 ? 2200 : 2400));
    assert.ok(view.worldSize.height >= (view.level === 2 ? 1300 : 1500));
    const boundary = view.boundaries.find(({ scopeId }) => scopeId === view.scopeId);
    const memberType = view.level === 2 ? "Container" : "Component";
    const memberIds = laidOut.elements.filter(({ type, parentId }) => type === memberType && parentId === view.scopeId).map(({ id }) => id);
    for (const elementId of memberIds) {
      const node = geometryFor(view, elementId);
      assert.ok(node.x >= boundary.x && node.y >= boundary.y + boundary.titleBand);
      assert.ok(node.x + node.w <= boundary.x + boundary.w);
      assert.ok(node.y + node.h <= boundary.y + boundary.h);
    }
  }
});

test("grows node geometry for longer readable copy instead of shrinking text", () => {
  const short = measureNode({ visualRole: "component", name: "Flow", description: "Coordinates practice", technology: "Swift" }, "en");
  const long = measureNode({ visualRole: "component", name: "Practice Session Flow Coordinator", description: "Coordinates practice, analysis, paired-device messages, persistence, and result presentation without truncating responsibility text.", technology: "Swift · WatchConnectivity · SwiftData" }, "en");

  assert.ok(long.w >= short.w);
  assert.ok(long.h > short.h);
  assert.ok(short.w >= 380);
  assert.ok(short.h >= 280);
});

test("reserves label-width gutters and roomy vertical rhythm in scoped views", () => {
  const laidOut = layoutC4Model(normalizeC4Model(makeFixtureModel(), {}).model);

  for (const view of laidOut.views.filter(({ level }) => level >= 2)) {
    const boundary = view.boundaries[0];
    const memberType = view.level === 2 ? "Container" : "Component";
    const members = view.nodes
      .filter(({ elementId }) => laidOut.elements.some(({ id, type, parentId }) => id === elementId && type === memberType && parentId === view.scopeId))
      .sort((first, second) => first.y - second.y || first.x - second.x);
    assert.ok(members.every((node) => node.x - boundary.x >= 96));
    assert.ok(members.every((node) => boundary.x + boundary.w - (node.x + node.w) >= 96));
    for (let first = 0; first < members.length; first += 1) {
      for (let second = first + 1; second < members.length; second += 1) {
        const a = members[first];
        const b = members[second];
        const verticallyOverlapping = a.y < b.y + b.h && b.y < a.y + a.h;
        if (verticallyOverlapping) {
          const horizontalGap = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
          assert.ok(horizontalGap >= 260);
        }
      }
    }
  }
});

test("emits complete deterministic geometry for every visible relationship", () => {
  const model = layoutC4Model(normalizeC4Model(makeFixtureModel(), {}).model);

  for (const view of model.views) {
    assert.equal(view.relationshipLayouts.length, view.relationshipIds.length);
    for (const layout of view.relationshipLayouts) {
      assert.equal(layout.geometryVersion, 2);
      assert.ok(layout.vertices.length >= 2);
      assert.ok(layout.vertices.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
      assert.ok(["left", "right", "top", "bottom"].includes(layout.sourcePort));
      assert.ok(["left", "right", "top", "bottom"].includes(layout.targetPort));
      assert.ok([layout.label.x, layout.label.y, layout.label.width, layout.label.height].every(Number.isFinite));
      assert.ok(layout.label.width > 0 && layout.label.height > 0);
    }
  }
});

test("produces identical relationship geometry across repeated layout runs", () => {
  const normalized = normalizeC4Model(makeFixtureModel(), {}).model;
  const first = layoutC4Model(normalized);
  const second = layoutC4Model(normalized);

  assert.deepEqual(
    first.views.map(({ relationshipLayouts }) => relationshipLayouts),
    second.views.map(({ relationshipLayouts }) => relationshipLayouts),
  );
});

test("separates parallel relationship rails by the configured distance", () => {
  const source = { elementId: "source", x: 0, y: 0, w: 100, h: 100 };
  const target = { elementId: "target", x: 400, y: 0, w: 100, h: 100 };
  const relationship = { id: "parallel", from: "source", to: "target" };
  const configuration = { direction: "LeftRight", relationshipSeparation: 36 };
  const route = (laneIndex) => routeRelationship({ relationship, source, target, nodes: [source, target], laneIndex, configuration });
  const longestHorizontalY = ({ vertices }) => vertices.slice(1)
    .map((point, index) => ({ point, previous: vertices[index] }))
    .filter(({ point, previous }) => point.y === previous.y)
    .sort((first, second) => Math.abs(second.point.x - second.previous.x) - Math.abs(first.point.x - first.previous.x))[0].point.y;

  assert.equal(longestHorizontalY(route(1)) - longestHorizontalY(route(0)), configuration.relationshipSeparation);
});

test("places center-based relationship label rectangles clear of nodes and labels", () => {
  const model = layoutC4Model(normalizeC4Model(makeFixtureModel(), {}).model);

  for (const view of model.views) {
    const layoutsById = new Map(view.relationshipLayouts.map((layout) => [layout.relationshipId, layout]));
    const labelRectangles = view.relationshipIds.map((relationshipId) => {
      const layout = layoutsById.get(relationshipId);
      assert.ok(layout?.label, `Missing label geometry for ${relationshipId}`);
      return {
        relationshipId,
        x: layout.label.x - layout.label.width / 2,
        y: layout.label.y - layout.label.height / 2,
        w: layout.label.width,
        h: layout.label.height,
      };
    });

    for (const label of labelRectangles) {
      const relationship = model.relationships.find(({ id }) => id === label.relationshipId);
      for (const node of view.nodes.filter(({ elementId }) => ![relationship.from, relationship.to].includes(elementId))) {
        assert.equal(rectanglesOverlap(label, node, LAYOUT_TOKENS.labelNodeClearance), false);
      }
    }

    for (let first = 0; first < labelRectangles.length; first += 1) {
      for (let second = first + 1; second < labelRectangles.length; second += 1) {
        assert.equal(
          rectanglesOverlap(labelRectangles[first], labelRectangles[second], LAYOUT_TOKENS.labelLabelClearance),
          false,
        );
      }
    }
  }
});

test("writes laid-out model JSON through the CLI", async () => {
  const directory = await fs.mkdtemp("/private/tmp/creating-c4-layout-");
  const input = path.join(directory, "model.json");
  const output = path.join(directory, "layout.json");
  await fs.writeFile(input, JSON.stringify(normalizeC4Model(makeFixtureModel(), {}).model));

  assert.equal(await runLayoutCli([input, output]), 0);
  const model = JSON.parse(await fs.readFile(output, "utf8"));
  assert.ok(model.views.every(({ worldSize, nodes }) => worldSize.width > 0 && worldSize.height > 0 && nodes.length > 0));
});
