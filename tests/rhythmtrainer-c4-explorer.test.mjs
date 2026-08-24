import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const htmlPath = fileURLToPath(new URL("../rhythmtrainer-c4-explorer.html", import.meta.url));
const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";

function scriptBody(id, type = "application/json") {
  const pattern = new RegExp(`<script[^>]*id=["']${id}["'][^>]*type=["']${type}["'][^>]*>([\\s\\S]*?)<\\/script>`);
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function architectureModel() {
  const body = scriptBody("architecture-model");
  assert.ok(body, "architecture model script must exist");
  return JSON.parse(body);
}

function explorerRuntime() {
  const source = scriptBody("explorer-logic", "text/javascript");
  assert.ok(source, "explorer logic script must exist");
  const context = { window: {}, console };
  vm.runInNewContext(source, context);
  return { api: context.window.RhythmC4Explorer, model: architectureModel() };
}

test("creates the standalone RhythmTrainer C4 artifact", () => {
  assert.ok(html.length > 0, "rhythmtrainer-c4-explorer.html must exist");
  assert.match(html, /<title>엇박 · C4 Architecture Explorer<\/title>/);
});

test("defines the four navigation views at C4 levels 1 through 3", () => {
  const model = architectureModel();
  assert.deepEqual(Object.keys(model.views).sort(), [
    "containers", "context", "iphone-components", "watch-components"
  ]);
  assert.equal(model.views.context.level, 1);
  assert.equal(model.views.containers.level, 2);
  assert.equal(model.views["iphone-components"].level, 3);
  assert.equal(model.views["watch-components"].level, 3);
  assert.equal(model.meta.level4, "omitted");
});

test("models semantic roles, boundaries, and descriptive one-way relationships", () => {
  const model = architectureModel();
  const allowedRoles = new Set(["person", "softwareSystem", "application", "mobileApplication", "dataStore", "component"]);
  for (const view of Object.values(model.views)) {
    assert.ok(view.worldSize.width > 0 && view.worldSize.height > 0, `${view.id} has a world size`);
    assert.ok(Array.isArray(view.boundaries), `${view.id} has boundaries`);
    const ids = new Set(view.nodes.map((node) => node.id));
    for (const node of view.nodes) {
      assert.ok(allowedRoles.has(node.visualRole), `${view.id}:${node.id} has a semantic role`);
      assert.ok(node.description.length > 0, `${view.id}:${node.id} has a responsibility`);
      if (["Container", "Component"].includes(node.type)) assert.ok(node.technology.length > 0, `${view.id}:${node.id} has technology`);
    }
    for (const relationship of view.relationships) {
      assert.ok(ids.has(relationship.from), `${relationship.id} source exists`);
      assert.ok(ids.has(relationship.to), `${relationship.id} target exists`);
      assert.ok(relationship.description.length > 4, `${relationship.id} has a specific description`);
      assert.doesNotMatch(relationship.description, /^교환(?:합니다)?$/);
      assert.equal("label" in relationship, false, `${relationship.id} no longer uses the legacy label field`);
    }
  }
  assert.ok(model.views.containers.nodes.some((node) => node.id === "learner" && node.type === "Person"));
  assert.equal(model.views.context.nodes.find((node) => node.id === "file-store").visualRole, "dataStore");
  assert.equal(model.views["iphone-components"].nodes.find((node) => node.id === "persistence").visualRole, "component");
  assert.equal(model.views.context.nodes.find((node) => node.id === "learner").technology ?? "", "");
  for (const view of Object.values(model.views)) if (view.level === 3) assert.ok(view.nodes.every((node) => !node.drilldown));
});

test("keeps iPhone/watch communication directional and file input wired", () => {
  const model = architectureModel();
  const phone = model.views["iphone-components"];
  const byId = new Map(phone.relationships.map((relationship) => [relationship.id, relationship]));
  assert.doesNotMatch(byId.get("iphone-flow-connectivity").description, /받고|콜백/);
  assert.equal(byId.get("iphone-connectivity-watch"), undefined);
  assert.deepEqual(byId.get("iphone-package-outbound"), { id: "iphone-package-outbound", from: "phone-connectivity", to: "watch-app-external", description: "Song + BeatGrid 패키지를 전송합니다", technology: "WCSession · transferUserInfo", status: "active" });
  assert.deepEqual(byId.get("iphone-clock-request"), { id: "iphone-clock-request", from: "phone-connectivity", to: "watch-app-external", description: "시계 오프셋 측정을 요청합니다", technology: "WCSession · sendMessage", status: "active" });
  assert.deepEqual(byId.get("iphone-realtime-outbound"), { id: "iphone-realtime-outbound", from: "phone-connectivity", to: "watch-app-external", description: "시작·이탈 상태를 전송합니다", technology: "WCSession · sendMessage", status: "active" });
  assert.deepEqual(byId.get("iphone-session-result"), { id: "iphone-session-result", from: "watch-app-external", to: "phone-connectivity", description: "SessionResult를 전송합니다", technology: "WCSession · transferUserInfo", status: "active" });
  assert.equal(byId.get("iphone-connectivity-callback")?.from, "phone-connectivity");
  assert.equal(byId.get("iphone-connectivity-callback")?.to, "app-flow");
  const fileToAudio = phone.relationships.find(({ from, to }) => from === "file-store" && to === "audio-io");
  assert.ok(fileToAudio, "file-store supplies audio I/O");
  assert.match(fileToAudio.description, /음원|URL/);
  assert.ok(fileToAudio.technology.length > 0);
});

test("keeps external iPhone node outside the Watch level-three boundary", () => {
  const view = architectureModel().views["watch-components"];
  const boundary = view.boundaries.find(({ id }) => id === "watch-boundary");
  const external = view.nodes.find(({ id }) => id === "iphone-app-external");
  assert.ok(external.x >= boundary.x + boundary.w || external.x + external.w <= boundary.x || external.y >= boundary.y + boundary.h || external.y + external.h <= boundary.y);
  assert.equal(boundary.members.includes(external.id), false);
});

test("exports navigation helpers and rejects dangling relationships", () => {
  const { api, model } = explorerRuntime();
  assert.equal(api.validateModel(model).valid, true);
  assert.deepEqual(Array.from(api.getBreadcrumbs("watch-components")), [
    "context", "containers", "watch-components"
  ]);
  const broken = structuredClone(model);
  broken.views.context.relationships[0].to = "missing-node";
  assert.equal(api.validateModel(broken).valid, false);
  const badDescription = structuredClone(model);
  delete badDescription.views.context.nodes[0].description;
  assert.equal(api.validateModel(badDescription).valid, false);
  const badRole = structuredClone(model);
  badRole.views.context.nodes[0].visualRole = "unknown";
  assert.equal(api.validateModel(badRole).valid, false);
});

test("starts as a diagram-first workspace and reduces panel state independently", () => {
  const { api, model } = explorerRuntime();
  const initial = api.createWorkspaceState();
  assert.deepEqual(JSON.parse(JSON.stringify(initial)), {
    currentView: "context",
    selectedNode: null,
    leftPanelOpen: true,
    rightPanelOpen: false,
    leftTab: "views",
    inspectorTab: "overview",
    tool: "select",
    viewports: {}
  });

  const noLeft = api.reduceWorkspace(model, initial, { type: "toggle-left-panel" });
  assert.equal(noLeft.leftPanelOpen, false);
  assert.equal(noLeft.rightPanelOpen, false);

  const selected = api.reduceWorkspace(model, noLeft, { type: "select-node", nodeId: "learner" });
  assert.equal(selected.selectedNode, "learner");
  assert.equal(selected.rightPanelOpen, true);
  assert.equal(selected.leftPanelOpen, false);
});

test("declares full-viewport workspace chrome instead of document sections", () => {
  assert.match(html, /id="left-panel"/);
  assert.match(html, /id="diagram-viewport"/);
  assert.match(html, /id="diagram-svg"/);
  assert.match(html, /id="right-inspector"/);
  assert.match(html, /id="canvas-tools"/);
  assert.match(html, /id="fallback-summary"/);
  assert.doesNotMatch(html, /id="relationship-summary"/);
  assert.doesNotMatch(html, /class="provenance"/);
});

test("keeps persistent panel controls in the top toolbar", () => {
  const toolbar = html.match(/<header id="top-toolbar"[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.match(toolbar, /id="toolbar-left-panel-toggle"/);
  assert.match(toolbar, /id="toolbar-right-panel-toggle"/);
  assert.match(toolbar, /aria-label="왼쪽 탐색 패널"/);
  assert.match(toolbar, /aria-label="선택한 요소 패널"/);
  assert.doesNotMatch(toolbar, /id="left-panel"/);
  assert.doesNotMatch(toolbar, /id="right-inspector"/);
});

test("reopens each workspace panel independently after closing it", () => {
  const { api, model } = explorerRuntime();
  const initial = api.createWorkspaceState();

  const leftClosed = api.reduceWorkspace(model, initial, { type: "toggle-left-panel" });
  const leftReopened = api.reduceWorkspace(model, leftClosed, { type: "toggle-left-panel" });
  assert.equal(leftClosed.leftPanelOpen, false);
  assert.equal(leftReopened.leftPanelOpen, true);
  assert.equal(leftReopened.rightPanelOpen, false);

  const rightOpened = api.reduceWorkspace(model, leftReopened, { type: "toggle-right-panel" });
  const rightClosed = api.reduceWorkspace(model, rightOpened, { type: "toggle-right-panel" });
  const rightReopened = api.reduceWorkspace(model, rightClosed, { type: "toggle-right-panel" });
  assert.equal(rightOpened.rightPanelOpen, true);
  assert.equal(rightClosed.rightPanelOpen, false);
  assert.equal(rightReopened.rightPanelOpen, true);
  assert.equal(rightReopened.leftPanelOpen, true);
});

test("drills from context to both component views and stops at level three", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.createNavigationState, "function", "navigation state factory must exist");
  assert.equal(typeof api.reduceNavigation, "function", "navigation reducer must exist");

  let state = api.createNavigationState();
  state = api.reduceNavigation(model, state, { type: "activate-node", nodeId: "rhythm-system" });
  assert.equal(state.currentView, "containers");
  state = api.reduceNavigation(model, state, { type: "activate-node", nodeId: "iphone-app" });
  assert.equal(state.currentView, "iphone-components");
  state = api.reduceNavigation(model, state, { type: "activate-node", nodeId: "beatthis-engine" });
  assert.equal(state.currentView, "iphone-components");
  assert.equal(state.selectedNode, "beatthis-engine");
  state = api.reduceNavigation(model, state, { type: "up" });
  assert.equal(state.currentView, "containers");
  state = api.reduceNavigation(model, state, { type: "activate-node", nodeId: "watch-app" });
  assert.equal(state.currentView, "watch-components");
});

test("renders semantic node controls and source-backed evidence", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.buildNodeMarkup, "function", "node markup builder must exist");
  assert.equal(typeof api.buildEvidenceMarkup, "function", "evidence markup builder must exist");

  const beatThis = api.getNodeById(model, "iphone-components", "beatthis-engine");
  const nodeMarkup = api.buildNodeMarkup(beatThis, true);
  assert.match(nodeMarkup, /^<button/);
  assert.match(nodeMarkup, /aria-pressed="true"/);
  assert.match(nodeMarkup, /BeatThis Native Engine/);
  const evidenceMarkup = api.buildEvidenceMarkup(beatThis);
  assert.match(evidenceMarkup, /BeatThisBridge\.mm/);
  assert.match(evidenceMarkup, /beat_this_api\.cpp/);
});

test("adapts relationship output for compact layouts without external dependencies", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.getLayoutMode, "function", "layout mode resolver must exist");
  assert.equal(typeof api.buildRelationshipSummary, "function", "relationship summary builder must exist");
  assert.equal(api.getLayoutMode(761), "diagram");
  assert.equal(api.getLayoutMode(760), "compact");
  assert.equal(api.getLayoutMode(320), "compact");

  const gap = model.views["iphone-components"].relationships.find((relationship) => relationship.status === "gap");
  const summary = api.buildRelationshipSummary(gap, "Practice Flow Coordinator", "Persistence Repository");
  assert.match(summary, /Practice Flow Coordinator → Persistence Repository/);
  assert.match(summary, /저장·캐시 연결이 구현 흐름에 없습니다/);
  assert.match(summary, /SwiftData injection absent/);
  assert.match(summary, /구현됨 · 미배선/);

  const externalResources = [
    ...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)=["']([^"']+)["']/gi)
  ].map((match) => match[1]).filter((url) => /^https?:\/\//.test(url));
  assert.deepEqual(externalResources, []);
  assert.doesNotMatch(html, /\bfetch\s*\(/);
});

test("uses full labels only for sparse views and numbered labels for dense views", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.getRelationshipLabelMode, "function", "relationship label mode resolver must exist");
  assert.equal(api.getRelationshipLabelMode(model.views.context), "full");
  assert.equal(api.getRelationshipLabelMode(model.views.containers), "indexed");
  assert.equal(api.getRelationshipLabelMode(model.views["iphone-components"]), "indexed");

  const gap = model.views["iphone-components"].relationships.find((relationship) => relationship.status === "gap");
  const summary = api.buildRelationshipSummary(gap, "Practice Flow Coordinator", "Persistence Repository", 7);
  assert.match(summary, /R7 · Practice Flow Coordinator → Persistence Repository/);
});

test("reserves enough horizontal space for context relationship labels", () => {
  const { model } = explorerRuntime();
  const nodes = [...model.views.context.nodes].sort((a, b) => a.x - b.x);
  const gaps = nodes.slice(1).map((node, index) => node.x - (nodes[index].x + nodes[index].w));

  assert.ok(gaps.every((gap) => gap >= 150), `context gaps must fit 150px labels: ${gaps.join(", ")}`);
});

export { architectureModel, explorerRuntime, html, scriptBody };
