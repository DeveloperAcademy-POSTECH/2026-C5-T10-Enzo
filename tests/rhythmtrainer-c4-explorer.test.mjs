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
  for (const [id, description, technology, from, to] of [
    ["iphone-package-outbound", "Song + BeatGrid 패키지를 전송합니다", "WCSession · transferUserInfo", "phone-connectivity", "watch-app-external"],
    ["iphone-clock-request", "시계 오프셋 측정을 요청합니다", "WCSession · sendMessage", "phone-connectivity", "watch-app-external"],
    ["iphone-realtime-outbound", "시작·이탈 상태를 전송합니다", "WCSession · sendMessage", "phone-connectivity", "watch-app-external"],
    ["iphone-session-result", "SessionResult를 전송합니다", "WCSession · transferUserInfo", "watch-app-external", "phone-connectivity"]
  ]) {
    const relationship = byId.get(id);
    assert.equal(relationship.from, from);
    assert.equal(relationship.to, to);
    assert.equal(relationship.description, description);
    assert.equal(relationship.technology, technology);
  }
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

test("renders accessible semantic SVG silhouettes", () => {
  const { api, model } = explorerRuntime();
  const person = model.views.context.nodes.find((node) => node.visualRole === "person");
  const system = model.views.context.nodes.find((node) => node.visualRole === "softwareSystem");
  const store = model.views.context.nodes.find((node) => node.visualRole === "dataStore");
  const app = model.views.containers.nodes.find((node) => node.visualRole === "application");
  const mobileApp = model.views.containers.nodes.find((node) => node.visualRole === "mobileApplication");
  const component = model.views["iphone-components"].nodes.find((node) => node.visualRole === "component");

  assert.match(api.buildShapeGeometry(person), /semantic-person-head/);
  assert.match(api.buildShapeGeometry(system), /semantic-file-fold/);
  assert.match(api.buildShapeGeometry(store), /semantic-store-top/);
  assert.match(api.buildShapeGeometry(app), /semantic-app-chrome/);
  assert.match(api.buildShapeGeometry(mobileApp), /semantic-device-cue/);
  assert.match(api.buildShapeGeometry(component), /semantic-component-cue/);

  const markup = api.buildSvgNodeMarkup(person, true);
  assert.match(markup, /^<g/);
  assert.match(markup, /role="button"/);
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /\[Person\]/);
});

test("renders explicit C4 boundaries around member elements", () => {
  const { api, model } = explorerRuntime();
  const boundary = model.views.containers.boundaries[0];
  const markup = api.buildBoundaryMarkup(boundary);
  assert.match(markup, /class="c4-boundary/);
  assert.match(markup, /엇박 리듬 훈련 시스템/);
  assert.match(markup, /\[Software System\]/);
});

test("keeps every C4 boundary around its declared members", () => {
  const { model } = explorerRuntime();
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const boundary of view.boundaries) {
      for (const memberId of boundary.members) {
        const node = nodes.get(memberId);
        assert.ok(node.x >= boundary.x, `${view.id}:${boundary.id} contains ${memberId} on the left`);
        assert.ok(node.y >= boundary.y, `${view.id}:${boundary.id} contains ${memberId} on the top`);
        assert.ok(node.x + node.w <= boundary.x + boundary.w, `${view.id}:${boundary.id} contains ${memberId} on the right`);
        assert.ok(node.y + node.h <= boundary.y + boundary.h, `${view.id}:${boundary.id} contains ${memberId} on the bottom`);
      }
    }
  }

  const boundary = model.views.containers.boundaries[0];
  const members = boundary.members.map((id) => model.views.containers.nodes.find((node) => node.id === id));
  assert.ok(members.every((node) => node.x >= boundary.x + 24 && node.y >= boundary.y + 24));
  assert.ok(members.every((node) => node.x + node.w <= boundary.x + boundary.w - 24 && node.y + node.h <= boundary.y + boundary.h - 24));
});

test("keeps generated Person silhouettes inside each current node height", () => {
  const { api, model } = explorerRuntime();
  const people = Object.values(model.views).flatMap((view) => view.nodes.filter((node) => node.visualRole === "person"));

  for (const person of people) {
    const geometry = api.getPersonGeometry(person);
    assert.ok(geometry.head.cy - geometry.head.r >= 0, `${person.id} head starts within the node`);
    assert.ok(geometry.head.cy + geometry.head.r <= person.h, `${person.id} head ends within the node`);
    assert.ok(geometry.body.top >= 0, `${person.id} body starts within the node`);
    assert.ok(geometry.body.joinY <= person.h - 2, `${person.id} body join stays above the bottom edge`);
    assert.equal(geometry.body.bottom, person.h - 2, `${person.id} body ends at the local bottom edge`);
  }
});

test("lays out multi-line node text sections without overlapping baselines", () => {
  const { api, model } = explorerRuntime();
  const node = model.views.containers.nodes.find((candidate) => candidate.id === "iphone-app");
  const layout = api.getSvgTextLayout(node);

  assert.ok(layout.name.lines.length > 1, "real iPhone node name wraps");
  assert.ok(layout.meta.lines.length > 1, "real iPhone node technology wraps");
  assert.ok(layout.name.lastBaseline < layout.meta.baseline, "metadata starts after the full name");
  assert.ok(layout.meta.lastBaseline < layout.description.baseline, "description starts after the full metadata");
  assert.ok(layout.description.lastBaseline < layout.affordanceBaseline, "drill-down starts after the full description");
});

test("keeps the workspace offline without a relationship summary fallback", () => {
  const { api } = explorerRuntime();
  assert.equal(typeof api.getLayoutMode, "function", "layout mode resolver must exist");
  assert.equal(api.getLayoutMode(761), "diagram");
  assert.equal(api.getLayoutMode(760), "compact");
  assert.equal(api.getLayoutMode(320), "compact");

  const externalResources = [
    ...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)=["']([^"']+)["']/gi)
  ].map((match) => match[1]).filter((url) => /^https?:\/\//.test(url));
  assert.deepEqual(externalResources, []);
  assert.doesNotMatch(html, /\bfetch\s*\(/);
  assert.doesNotMatch(html, /relationship-summary/);
});

test("renders every relationship as a labelled one-way SVG arrow", () => {
  const { api, model } = explorerRuntime();
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      const markup = api.buildRelationshipMarkup(nodes, relationship);
      assert.match(markup, /class="relationship-path/);
      assert.match(markup, /marker-end="url\(#arrow/);
      assert.match(markup, new RegExp(relationship.description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      if (relationship.technology) {
        assert.match(markup, new RegExp(`\\[${relationship.technology.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`));
      }
    }
  }
  assert.doesNotMatch(html, />R\d+</);
  assert.doesNotMatch(html, /relationship-summary/);
});

test("keeps every opposing relationship pair on distinct paths and label positions", () => {
  const { api, model } = explorerRuntime();
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const forward of view.relationships) {
      for (const reverse of view.relationships.filter((candidate) => candidate.from === forward.to && candidate.to === forward.from)) {
        assert.notDeepEqual(api.relationshipPolyline(nodes, forward), api.relationshipPolyline(nodes, reverse), `${view.id}:${forward.id}/${reverse.id} path differs`);
        assert.notDeepEqual(api.relationshipLabelPoint(api.relationshipPolyline(nodes, forward), forward.labelPosition), api.relationshipLabelPoint(api.relationshipPolyline(nodes, reverse), reverse.labelPosition), `${view.id}:${forward.id}/${reverse.id} label differs`);
      }
    }
  }
});

test("gives every dense component relationship an explicit clear label route", () => {
  const { api, model } = explorerRuntime();
  for (const viewId of ["iphone-components", "watch-components"]) {
    const view = model.views[viewId];
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      assert.ok(relationship.labelPosition, `${viewId}:${relationship.id} has an explicit label position`);
      assert.ok(Array.isArray(relationship.waypoints) && relationship.waypoints.length > 0, `${viewId}:${relationship.id} has an explicit route`);
      const points = api.relationshipPolyline(nodes, relationship);
      assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)), `${viewId}:${relationship.id} keeps finite route points`);
      const label = api.relationshipLabelPoint(points, relationship.labelPosition);
      const { width, height } = api.getRelationshipLabelLayout(relationship);
      for (const node of view.nodes) {
        const clearsNode = label.x + width / 2 <= node.x - 6 || label.x - width / 2 >= node.x + node.w + 6 || label.y + height / 2 <= node.y - 6 || label.y - height / 2 >= node.y + node.h + 6;
        assert.ok(clearsNode, `${viewId}:${relationship.id} label clears ${node.id}`);
      }
    }
  }
});

test("filters non-finite relationship route points before making SVG paths", () => {
  const { api } = explorerRuntime();
  assert.equal(api.relationshipPath([{ x: 0, y: 0 }, { x: Infinity, y: 2 }]), "");
});

test("reserves enough horizontal space for context relationship labels", () => {
  const { model } = explorerRuntime();
  const nodes = [...model.views.context.nodes].sort((a, b) => a.x - b.x);
  const gaps = nodes.slice(1).map((node, index) => node.x - (nodes[index].x + nodes[index].w));

  assert.ok(gaps.every((gap) => gap >= 150), `context gaps must fit 150px labels: ${gaps.join(", ")}`);
});

export { architectureModel, explorerRuntime, html, scriptBody };
