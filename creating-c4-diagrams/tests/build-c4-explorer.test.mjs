import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  buildExplorer,
  runBuildCli,
} from "../scripts/build-c4-explorer.mjs";
import {
  validateC4Output,
} from "../scripts/validate-c4-output.mjs";
import { measureRelationshipLabel } from "../scripts/layout-c4-model.mjs";

const shellPath = path.resolve(import.meta.dirname, "../assets/c4-explorer-shell.html");

function readShell() {
  return fs.existsSync(shellPath) ? fs.readFileSync(shellPath, "utf8") : "";
}

function scriptBody(html, id, type = "text/javascript") {
  const pattern = new RegExp(`<script[^>]*id=["']${id}["'][^>]*type=["']${type}["'][^>]*>([\\s\\S]*?)<\\/script>`);
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function explorerRuntime() {
  const source = scriptBody(readShell(), "explorer-logic");
  assert.ok(source, "explorer runtime script must exist");
  const context = { window: {}, console };
  vm.runInNewContext(source, context);
  return context.window.C4Explorer;
}

function canonicalFixture() {
  const evidence = [{ file: "Fixture.swift", line: 1, reason: "Test evidence" }];
  const layoutConfiguration = { direction: "LeftRight", rankSeparation: 176, nodeSeparation: 280, relationshipSeparation: 36 };
  return {
    version: "1.0.0",
    project: { name: "Atlas", description: "Maps work", language: "en" },
    elements: [
      { id: "user", type: "Person", name: "Planner", description: "Plans work", visualRole: "person", tags: ["Element", "Person", "person"], implementationStatus: "active", evidence, confidence: "confirmed" },
      { id: "system", type: "Software System", name: "Atlas", description: "Maps work", visualRole: "software-system", tags: ["Element", "Software System", "software-system"], implementationStatus: "active", evidence, confidence: "confirmed" },
      { id: "phone", parentId: "system", type: "Container", name: "Desktop App", description: "Presents maps", technology: "SwiftUI", visualRole: "application-container", tags: ["Element", "Container", "application-container"], implementationStatus: "active", evidence, confidence: "confirmed" },
      { id: "store", parentId: "system", type: "Container", name: "Map Store", description: "Stores maps", technology: "SwiftData", visualRole: "data-store", tags: ["Element", "Container", "data-store"], implementationStatus: "active", evidence, confidence: "confirmed" },
      {
        id: "flow", parentId: "phone", type: "Component", name: "Map Flow", description: "Coordinates mapping", technology: "Swift", visualRole: "component",
        responsibilities: ["Coordinates mapping", "Publishes progress"],
        inputs: [{ name: "Selected work", evidence }],
        outputs: [{ name: "Updated map", evidence }],
        implementationStatus: "gap", tags: ["Element", "Component", "component"],
        evidenceSummary: "Three source signals",
        evidence, confidence: "confirmed",
      },
    ],
    relationships: [
      { id: "uses-system", from: "user", to: "system", description: "Plans work", evidence, confidence: "confirmed" },
      { id: "uses-phone", from: "user", to: "phone", description: "Edits a map", evidence, confidence: "confirmed" },
      {
        id: "saves", from: "phone", to: "store", description: "Saves maps", technology: "SwiftData", purpose: "Persists the map", payload: "Map document",
        senderEvidence: evidence,
        receiverEvidence: [{ file: "Store.swift", line: 4, reason: "Save receiver" }],
        evidence, confidence: "confirmed",
      },
      { id: "uses-flow", from: "user", to: "flow", description: "Controls mapping", evidence, confidence: "confirmed" },
    ],
    views: [
      {
        id: "atlas-context", level: 1, scopeId: "system", title: "Atlas — System Context", description: "Context", elementIds: ["user", "system"], relationshipIds: ["uses-system"],
        layoutConfiguration, worldSize: { width: 1000, height: 700 }, boundaries: [],
        nodes: [{ elementId: "user", x: 80, y: 160, w: 300, h: 360 }, { elementId: "system", x: 560, y: 200, w: 340, h: 320 }],
        relationshipLayouts: [{ relationshipId: "uses-system", sourcePort: "right", targetPort: "left", laneHint: 0 }], legend: ["person", "software-system"],
      },
      {
        id: "atlas-containers", level: 2, scopeId: "system", title: "Atlas — Containers", description: "Containers", elementIds: ["user", "phone", "store"], relationshipIds: ["uses-phone", "saves"],
        layoutConfiguration, worldSize: { width: 1500, height: 900 }, boundaries: [{ id: "system-boundary", scopeId: "system", x: 480, y: 80, w: 920, h: 700, titleBand: 64 }],
        nodes: [{ elementId: "user", x: 80, y: 260, w: 300, h: 360 }, { elementId: "phone", x: 560, y: 220, w: 340, h: 300 }, { elementId: "store", x: 980, y: 230, w: 340, h: 280 }],
        relationshipLayouts: [{ relationshipId: "uses-phone", sourcePort: "right", targetPort: "left", laneHint: 0 }, { relationshipId: "saves", sourcePort: "right", targetPort: "left", laneHint: 1 }], legend: ["person", "application-container", "data-store"],
      },
      {
        id: "phone-components", level: 3, scopeId: "phone", title: "Desktop App — Components", description: "Components", elementIds: ["user", "flow"], relationshipIds: ["uses-flow"],
        layoutConfiguration, worldSize: { width: 1100, height: 760 }, boundaries: [{ id: "phone-boundary", scopeId: "phone", x: 480, y: 80, w: 520, h: 580, titleBand: 64 }],
        nodes: [{ elementId: "user", x: 80, y: 190, w: 300, h: 360 }, { elementId: "flow", x: 580, y: 220, w: 320, h: 230 }],
        relationshipLayouts: [{ relationshipId: "uses-flow", sourcePort: "right", targetPort: "left", laneHint: 0 }], legend: ["person", "component"],
      },
    ],
  };
}

test("keeps one project-neutral offline explorer shell", () => {
  const shell = readShell();
  assert.ok(shell.length > 0);
  assert.equal((shell.match(/__C4_MODEL_JSON__/g) ?? []).length, 1);
  assert.doesNotMatch(shell, /RhythmTrainer|TempoCoach|엇박/);
  assert.match(shell, /id="diagram-viewport"/);
  assert.match(shell, /id="left-panel-close"/);
  assert.match(shell, /data-action="fit-view"/);
  assert.match(shell, /data-tool="hand"/);
  assert.match(shell, /data-relationship-mode="focus"/);
  assert.doesNotMatch(shell, /\bfetch\s*\(|https?:\/\//);
});

test("generated long-label bounds contain the renderer's wrapped text", () => {
  const api = explorerRuntime();
  const relationship = {
    description: "Transfers an unusually long evidence-backed command description without letting any rendered text escape its generated relationship label rectangle",
    technology: "A deliberately long protocol and transport technology identifier that wraps across several lines",
    geometryVersion: 2,
    vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
  };
  relationship.label = { x: 0, y: 0, ...measureRelationshipLabel(relationship, 3, "en") };
  const rendered = api.getRelationshipLabelLayout(relationship);
  const widest = Math.max(
    ...rendered.descriptionLines.map((line) => api.estimateSvgTextWidth(line, 12)),
    ...rendered.technologyLines.map((line) => api.estimateSvgTextWidth(line, 10)),
  );
  const requiredHeight = rendered.descriptionLines.length * 16
    + rendered.technologyLines.length * 13
    + (rendered.technologyLines.length ? 3 : 0)
    + 14;

  assert.equal(rendered.width, relationship.label.width);
  assert.equal(rendered.height, relationship.label.height);
  assert.ok(widest + 30 <= rendered.width);
  assert.ok(requiredHeight <= rendered.height);
});

test("adapts a canonical model into dynamic views and drilldown navigation", () => {
  const api = explorerRuntime();
  const model = api.prepareArchitectureModel(canonicalFixture());
  const initial = api.createWorkspaceState();

  assert.equal(api.validateModel(model).valid, true);
  assert.equal(initial.currentView, "atlas-context");
  assert.equal(api.getParentViewId("atlas-containers"), "atlas-context");
  assert.equal(api.getParentViewId("phone-components"), "atlas-containers");
  assert.equal(model.views["atlas-context"].nodes.find(({ id }) => id === "system").drilldown, "atlas-containers");
  assert.equal(model.views["atlas-containers"].nodes.find(({ id }) => id === "phone").drilldown, "phone-components");
  assert.equal(api.openDrilldown(model, initial, "system").currentView, "atlas-containers");
  assert.match(api.buildViewsMarkup(model, initial), /Atlas — System Context/);
});

test("never assigns an L4 drilldown to supporting containers shown in an L3 view", () => {
  const api = explorerRuntime();
  const fixture = canonicalFixture();
  const componentView = fixture.views.find(({ level }) => level === 3);
  componentView.elementIds.push("phone");
  componentView.nodes.push({ elementId: "phone", x: 960, y: 220, w: 340, h: 300 });

  const model = api.prepareArchitectureModel(fixture);
  const supportingContainer = model.views[componentView.id].nodes.find(({ id }) => id === "phone");

  assert.equal(supportingContainer.drilldown, undefined);
  assert.equal(api.validateModel(model).valid, true);
});

test("maps rich canonical fields into nodes, relationships, and the inspector", () => {
  const api = explorerRuntime();
  const model = api.prepareArchitectureModel(canonicalFixture());
  const node = model.views["phone-components"].nodes.find(({ id }) => id === "flow");
  const relationship = model.views["atlas-containers"].relationships.find(({ id }) => id === "saves");
  const state = { ...api.createWorkspaceState(), currentView: "phone-components", selectedNode: "flow" };
  const inspector = api.buildInspectorMarkup(model, state);
  const relationshipInspector = api.buildInspectorMarkup(model, {
    ...api.createWorkspaceState(),
    currentView: "atlas-containers",
    selectedNode: "store",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(node.inputs)), ["Selected work"]);
  assert.deepEqual(JSON.parse(JSON.stringify(node.outputs)), ["Updated map"]);
  assert.deepEqual(JSON.parse(JSON.stringify(node.responsibilities)), ["Coordinates mapping", "Publishes progress"]);
  assert.equal(node.status, "gap");
  assert.equal(relationship.payload, "Map document");
  assert.ok(relationship.senderEvidence.length);
  assert.ok(relationship.receiverEvidence.length);
  assert.match(inspector, /책임/);
  assert.match(inspector, /입력/);
  assert.match(inspector, /출력/);
  assert.match(inspector, /Selected work/);
  assert.match(inspector, /Updated map/);
  assert.match(inspector, /Three source signals/);
  assert.match(relationshipInspector, /inspector-relationship-technology/);
  assert.match(relationshipInspector, /inspector-relationship-description/);
  assert.ok(relationshipInspector.indexOf("SwiftData") < relationshipInspector.indexOf("Saves maps"));
});

test("keeps node typography readable and opens dense views at a pannable reading scale", () => {
  const api = explorerRuntime();
  const textLayout = api.getSvgTextLayout({
    id: "long-component",
    type: "Component",
    visualRole: "component",
    name: "오디오 입출력과 재생",
    technology: "Swift · AVFoundation · Security-scoped URL",
    description: "선택 음원을 PCM으로 변환하고 기준 시각에 맞춰 안정적으로 재생합니다.",
    w: 420,
    h: 300,
  });

  assert.ok(textLayout.name.fontSize >= 15);
  assert.ok(textLayout.meta.fontSize >= 10);
  assert.ok(textLayout.description.fontSize >= 12);
  assert.ok(textLayout.description.lastBaseline <= textLayout.bounds.bottom);

  const readable = api.initialViewportForLevel({ width: 3400, height: 2200 }, { width: 1200, height: 800 }, 3, 72);
  assert.ok(readable.scale >= 0.78);
  assert.ok(readable.x > -3400 && readable.y > -2200);
});

test("uses a wide, restrained inspector surface for readable desktop hierarchy", () => {
  const shell = readShell();
  assert.match(shell, /--sidebar-right:\s*28rem/);
  assert.match(shell, /\.inspector-description\s*\{[^}]*font-size:\s*\.9rem[^}]*line-height:\s*1\.6/s);
  assert.match(shell, /\.inspector-relationship-technology\s*\{/);
  assert.match(shell, /\.inspector-relationship-description\s*\{/);
});

test("keeps dense bidirectional relationship labels on unique collision-free tracks", () => {
  const api = explorerRuntime();
  const fixture = canonicalFixture();
  const evidence = [{ file: "SessionBridge.swift", line: 1, reason: "Paired message" }];
  fixture.elements.push({
    id: "watch", parentId: "system", type: "Container", name: "Watch App", description: "Runs paired practice", technology: "SwiftUI · watchOS", visualRole: "application-container", evidence, confidence: "confirmed",
  });
  const pairedRelationships = [
    ["package", "phone", "watch", "Sends Song + BeatGrid", "WCSession · transferUserInfo"],
    ["clock", "phone", "watch", "Requests a clock offset", "WCSession · sendMessage"],
    ["finish", "phone", "watch", "Sends a finish signal", "WCSession · sendMessage"],
    ["start", "watch", "phone", "Sends a start signal", "WCSession · sendMessage"],
    ["drift", "watch", "phone", "Sends drift state", "WCSession · sendMessage"],
    ["result", "watch", "phone", "Sends the practice result", "WCSession · transferUserInfo"],
  ].map(([id, from, to, description, technology]) => ({ id, from, to, description, technology, evidence, confidence: "confirmed" }));
  fixture.relationships.push(...pairedRelationships);
  const containerView = fixture.views.find(({ id }) => id === "atlas-containers");
  containerView.elementIds = ["user", "phone", "watch", "store"];
  containerView.relationshipIds.push(...pairedRelationships.map(({ id }) => id));
  containerView.worldSize = { width: 2400, height: 1200 };
  containerView.boundaries = [{ id: "system-boundary", scopeId: "system", x: 480, y: 80, w: 1820, h: 980, titleBand: 64 }];
  containerView.nodes = [
    { elementId: "user", x: 40, y: 380, w: 360, h: 440 },
    { elementId: "phone", x: 560, y: 360, w: 400, h: 360 },
    { elementId: "watch", x: 1240, y: 360, w: 400, h: 360 },
    { elementId: "store", x: 1920, y: 370, w: 400, h: 340 },
  ];
  containerView.relationshipLayouts.push(...pairedRelationships.map(({ id }, laneHint) => ({ relationshipId: id, sourcePort: "right", targetPort: "left", laneHint: laneHint + 2 })));

  const model = api.prepareArchitectureModel(fixture);
  const view = model.views["atlas-containers"];
  const pairedIds = new Set(pairedRelationships.map(({ id }) => id));
  const items = api.getRelationshipRenderItems(view, { relationshipMode: "focus", selectedNode: "phone" })
    .filter(({ labelVisible, relationship }) => labelVisible && pairedIds.has(relationship.id));
  const nodeRects = view.nodes.map((node) => ({ left: node.x, right: node.x + node.w, top: node.y, bottom: node.y + node.h }));
  const labelRects = items.map((item) => {
    const { width, height } = api.getRelationshipLabelLayout(item.relationship);
    return {
      id: item.relationship.id,
      left: item.labelPoint.x - width / 2,
      right: item.labelPoint.x + width / 2,
      top: item.labelPoint.y - height / 2,
      bottom: item.labelPoint.y + height / 2,
    };
  });
  const separated = (first, second, clearance = 20) => first.right + clearance <= second.left || second.right + clearance <= first.left
    || first.bottom + clearance <= second.top || second.bottom + clearance <= first.top;

  assert.equal(new Set(items.map(({ points }) => JSON.stringify(points))).size, items.length, "every relationship uses a unique route");
  for (const label of labelRects) for (const node of nodeRects) assert.equal(separated(label, node), true, `${label.id} stays clear of nodes`);
  for (let first = 0; first < labelRects.length; first += 1) for (let second = first + 1; second < labelRects.length; second += 1) {
    assert.equal(separated(labelRects[first], labelRects[second]), true, `${labelRects[first].id} stays clear of ${labelRects[second].id}`);
  }
});

test("routes a labeled relationship far enough around an intervening node", () => {
  const api = explorerRuntime();
  const view = {
    level: 2,
    nodes: [
      { id: "phone", x: 856, y: 506, w: 400, h: 360 },
      { id: "watch", x: 1536, y: 506, w: 400, h: 360 },
      { id: "store", x: 2216, y: 516, w: 400, h: 340 },
    ],
    relationships: [
      {
        id: "blocker",
        from: "watch",
        to: "phone",
        description: "박자 이탈 상태를 전송합니다.",
        technology: "WCSession · sendMessage",
        sourceAnchor: { x: 1536, y: 711.2 },
        targetAnchor: { x: 1256, y: 711.2 },
        waypoints: [{ x: 1512, y: 728 }, { x: 1280, y: 728 }],
      },
      {
        id: "route-0",
        from: "phone",
        to: "store",
        description: "연습 결과와 진행 상태를 저장합니다.",
        technology: "SwiftData ModelContext",
        sourceAnchor: { x: 1256, y: 805 },
        targetAnchor: { x: 2216, y: 805 },
        waypoints: [{ x: 1280, y: 728 }, { x: 2192, y: 728 }],
      },
    ],
  };
  const item = api.getRelationshipRenderItems(view, { relationshipMode: "focus", selectedNode: "phone" })
    .find(({ relationship }) => relationship.id === "route-0");
  const { width, height } = api.getRelationshipLabelLayout(item.relationship);
  const label = { left: item.labelPoint.x - width / 2, right: item.labelPoint.x + width / 2, top: item.labelPoint.y - height / 2, bottom: item.labelPoint.y + height / 2 };
  const watch = view.nodes.find(({ id }) => id === "watch");
  const watchRect = { left: watch.x, right: watch.x + watch.w, top: watch.y, bottom: watch.y + watch.h };
  const separated = label.right + 20 <= watchRect.left || watchRect.right + 20 <= label.left
    || label.bottom + 20 <= watchRect.top || watchRect.bottom + 20 <= label.top;

  assert.equal(separated, true, "the label clears the intervening Watch node by 20px");
});

test("preserves progressive relationships, panel position, and Space-only temporary Hand behavior", () => {
  const api = explorerRuntime();
  const model = api.prepareArchitectureModel(canonicalFixture());
  const view = model.views["atlas-containers"];
  const idle = api.getRelationshipRenderItems(view, { relationshipMode: "focus", selectedNode: null });
  const selected = api.getRelationshipRenderItems(view, { relationshipMode: "focus", selectedNode: "user" });

  assert.ok(idle.every(({ presentation, labelVisible }) => presentation === "ambient" && !labelVisible));
  assert.equal(selected.find(({ relationship }) => relationship.id === "uses-phone").presentation, "emphasized");
  assert.equal(selected.find(({ relationship }) => relationship.id === "saves").presentation, "muted");
  assert.equal(api.shouldUseTemporaryHand({ code: "Space" }, { tagName: "DIV" }), true);
  assert.equal(api.shouldUseTemporaryHand({ code: "Space" }, { tagName: "INPUT" }), false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(api.preserveViewportScreenPosition({ x: 10, y: 20, scale: 0.8 }, { left: 300, top: 0 }, { left: 0, top: 0 }))),
    { x: 310, y: 20, scale: 0.8 },
  );
  assert.equal(api.fitViewport({ width: 400, height: 300 }, { width: 1600, height: 1000 }, 0).scale, 1);
});

test("renders canonical version 2 relationship geometry without state-dependent movement", () => {
  const api = explorerRuntime();
  const fixture = canonicalFixture();
  const containerView = fixture.views.find(({ id }) => id === "atlas-containers");
  const layout = containerView.relationshipLayouts.find(({ relationshipId }) => relationshipId === "uses-phone");
  Object.assign(layout, {
    geometryVersion: 2,
    sourcePort: "right",
    targetPort: "left",
    vertices: [
      { x: 380, y: 440 },
      { x: 470, y: 440 },
      { x: 470, y: 370 },
      { x: 560, y: 370 },
    ],
    label: { x: 470, y: 310, width: 196, height: 58 },
  });

  const model = api.prepareArchitectureModel(fixture);
  const view = model.views[containerView.id];
  const relationship = view.relationships.find(({ id }) => id === "uses-phone");
  assert.equal(relationship.geometryVersion, 2);
  assert.equal(relationship.sourcePort, "right");
  assert.equal(relationship.targetPort, "left");
  assert.deepEqual(JSON.parse(JSON.stringify(relationship.vertices)), layout.vertices);
  assert.deepEqual(JSON.parse(JSON.stringify(relationship.label)), layout.label);

  const serializeGeometry = (state) => {
    const item = api.getRelationshipRenderItems(view, state)
      .find(({ relationship: candidate }) => candidate.id === relationship.id);
    const labelLayout = api.getRelationshipLabelLayout(item.relationship);
    return JSON.stringify({
      vertices: item.points,
      label: {
        x: item.labelPoint.x,
        y: item.labelPoint.y,
        width: labelLayout.width,
        height: labelLayout.height,
      },
    });
  };
  const expected = JSON.stringify({ vertices: layout.vertices, label: layout.label });
  const states = [
    { relationshipMode: "focus", selectedNode: null },
    { relationshipMode: "focus", selectedNode: "user" },
    { relationshipMode: "focus", selectedNode: "phone" },
    { relationshipMode: "all", selectedNode: null },
  ];
  assert.ok(states.every((state) => serializeGeometry(state) === expected));

  const points = api.relationshipPolyline(new Map([
    ["phone", { id: "phone", x: 0, y: 0, w: 20, h: 20 }],
    ["watch", { id: "watch", x: 100, y: 0, w: 20, h: 20 }],
  ]), {
    from: "phone",
    to: "watch",
    geometryVersion: 2,
    vertices: [{ x: 10, y: 20 }, { x: 80, y: 20 }],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(points)), [{ x: 10, y: 20 }, { x: 80, y: 20 }]);
});

test("drills down only through the explicit footer control", () => {
  const api = explorerRuntime();
  api.prepareArchitectureModel(canonicalFixture());

  assert.equal(api.getNodeKeyboardAction("Enter", false, true), "select");
  assert.equal(api.getNodeKeyboardAction("Enter", true, true), null);
  assert.equal(api.getNodeKeyboardAction("O", true, true), null);
  assert.equal(api.isDrilldownActivationKey("Enter"), true);
  assert.equal(api.isDrilldownActivationKey(" "), true);
});

test("embeds hostile model text safely and validates a standalone explorer", async () => {
  const model = canonicalFixture();
  model.elements.find(({ id }) => id === "flow").description = "</script><script>throw 1</script>";
  const outputDirectory = fs.mkdtempSync("/private/tmp/creating-c4-build-");
  const paths = await buildExplorer({ model, analysisMarkdown: "# Evidence\n", outputDirectory });
  const html = fs.readFileSync(paths.html, "utf8");
  const workspaceDsl = fs.readFileSync(paths.workspaceDsl, "utf8");
  const report = await validateC4Output({ model, html, workspaceDsl });

  assert.doesNotMatch(html, /<script>throw 1<\/script>/);
  assert.match(html, /\\u003c\/script\\u003e/);
  assert.match(workspaceDsl, /^workspace "Atlas" "Maps work" \{/);
  assert.deepEqual(report.errors, []);
  assert.equal(report.checks.offline, true);
  assert.equal(report.checks.level4Absent, true);
});

test("reports L4 and external runtime mutations as validation errors", async () => {
  const model = canonicalFixture();
  model.views.push({ id: "code", level: 4, scopeId: "flow", elementIds: [], relationshipIds: [], nodes: [], boundaries: [], worldSize: { width: 1, height: 1 } });
  const html = readShell().replace("__C4_MODEL_JSON__", JSON.stringify(model)).replace("</head>", '<script src="https://example.com/runtime.js"></script></head>');
  const report = await validateC4Output({ model, html });

  assert.equal(report.checks.level4Absent, false);
  assert.equal(report.checks.offline, false);
  assert.ok(report.errors.some(({ code }) => code === "view-level-4-forbidden"));
  assert.ok(report.errors.some(({ code }) => code === "external-runtime-forbidden"));
});

test("build CLI writes all five contracted artifacts", async () => {
  const directory = fs.mkdtempSync("/private/tmp/creating-c4-build-cli-");
  const input = path.join(directory, "model-input.json");
  const analysis = path.join(directory, "analysis-input.md");
  const output = path.join(directory, "output");
  fs.writeFileSync(input, JSON.stringify(canonicalFixture()));
  fs.writeFileSync(analysis, "# Evidence\n");

  assert.equal(await runBuildCli([input, analysis, output], { log() {}, error() {} }), 0);
  assert.deepEqual(fs.readdirSync(output).sort(), ["atlas-c4-explorer.html", "c4-analysis.md", "c4-model.json", "validation-report.json", "workspace.dsl"]);
});

test("build CLI leaves five final artifacts and logs workspace DSL when validation fails", async () => {
  const directory = fs.mkdtempSync("/private/tmp/creating-c4-build-cli-error-");
  const input = path.join(directory, "model-input.json");
  const analysis = path.join(directory, "analysis-input.md");
  const output = path.join(directory, "output");
  const model = canonicalFixture();
  model.views.push({ id: "forbidden-code", level: 4, scopeId: "flow", elementIds: [], relationshipIds: [], nodes: [], boundaries: [], worldSize: { width: 1, height: 1 } });
  fs.writeFileSync(input, JSON.stringify(model));
  fs.writeFileSync(analysis, "# Evidence\n");
  const messages = [];

  assert.equal(await runBuildCli([input, analysis, output], { log: (message) => messages.push(message), error() {} }), 1);
  assert.deepEqual(fs.readdirSync(output).sort(), ["atlas-c4-explorer.html", "c4-analysis.md", "c4-model.json", "validation-report.json", "workspace.dsl"]);
  assert.equal(fs.readdirSync(output).some((name) => name.endsWith(".tmp")), false);
  const logged = JSON.parse(messages.at(-1));
  assert.equal(logged.workspaceDsl, path.join(output, "workspace.dsl"));
  assert.equal(logged.validation, path.join(output, "validation-report.json"));
  assert.ok(JSON.parse(fs.readFileSync(logged.validation, "utf8")).errors.some(({ code }) => code === "view-level-4-forbidden"));
});

test("rejects explorer shells with zero or multiple model placeholders", async () => {
  const directory = fs.mkdtempSync("/private/tmp/creating-c4-shell-mutation-");
  const noPlaceholder = path.join(directory, "no-placeholder.html");
  const twoPlaceholders = path.join(directory, "two-placeholders.html");
  fs.writeFileSync(noPlaceholder, readShell().replace("__C4_MODEL_JSON__", "{}"));
  fs.writeFileSync(twoPlaceholders, readShell().replace("__C4_MODEL_JSON__", "__C4_MODEL_JSON____C4_MODEL_JSON__"));

  await assert.rejects(
    buildExplorer({ model: canonicalFixture(), analysisMarkdown: "", outputDirectory: path.join(directory, "zero"), shellPath: noPlaceholder }),
    /exactly one model placeholder; found 0/,
  );
  await assert.rejects(
    buildExplorer({ model: canonicalFixture(), analysisMarkdown: "", outputDirectory: path.join(directory, "two"), shellPath: twoPlaceholders }),
    /exactly one model placeholder; found 2/,
  );
});

test("sanitizes project names and keeps every generated artifact inside the output directory", async () => {
  const directory = fs.mkdtempSync("/private/tmp/creating-c4-output-boundary-");
  const output = path.join(directory, "output");
  const model = canonicalFixture();
  model.project.name = "../../Outside Atlas";
  const paths = await buildExplorer({ model, analysisMarkdown: "# Analysis\n", outputDirectory: output });
  const outputPrefix = `${path.resolve(output)}${path.sep}`;

  assert.ok(Object.values(paths).every((artifact) => path.resolve(artifact).startsWith(outputPrefix)));
  assert.equal(paths.workspaceDsl, path.join(output, "workspace.dsl"));
  assert.deepEqual(fs.readdirSync(output).sort(), ["c4-analysis.md", "c4-model.json", "outside-atlas-c4-explorer.html", "workspace.dsl"]);
  assert.equal(fs.existsSync(path.join(directory, "Outside Atlas-c4-explorer.html")), false);
});
