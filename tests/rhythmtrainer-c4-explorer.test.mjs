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

test("keeps every relationship inside its view and every level-three node terminal", () => {
  const model = architectureModel();
  for (const view of Object.values(model.views)) {
    const ids = new Set(view.nodes.map((node) => node.id));
    for (const relationship of view.relationships) {
      assert.ok(ids.has(relationship.from), `${relationship.id} source exists`);
      assert.ok(ids.has(relationship.to), `${relationship.id} target exists`);
      assert.ok(relationship.label.length > 0, `${relationship.id} has a verb label`);
      assert.ok(relationship.technology.length > 0, `${relationship.id} has technology`);
    }
    if (view.level === 3) {
      assert.ok(view.nodes.every((node) => !node.drilldown), `${view.id} has no L4 drill-down`);
    }
  }
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
