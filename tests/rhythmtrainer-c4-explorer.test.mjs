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

function explorerRuntime(extraContext = {}) {
  const rawSource = scriptBody("explorer-logic", "text/javascript");
  assert.ok(rawSource, "explorer logic script must exist");
  const source = extraContext.document
    ? rawSource.replace('if (typeof document !== "undefined") boot();', "")
    : rawSource;
  const context = { window: {}, console, ...extraContext };
  vm.runInNewContext(source, context);
  const api = context.window.RhythmC4Explorer;
  return { api, model: api.prepareArchitectureModel(architectureModel()) };
}

test("creates the standalone RhythmTrainer C4 artifact", () => {
  assert.ok(html.length > 0, "rhythmtrainer-c4-explorer.html must exist");
  assert.match(html, /<title>엇박 · C4 Architecture Explorer<\/title>/);
});

test("keeps the generated semantic-container style reference in the project", () => {
  const assetPath = fileURLToPath(new URL("../assets/c4-node-shape-style-reference.png", import.meta.url));
  assert.ok(fs.existsSync(assetPath), "generated Person, Document, and Data Store reference must be preserved");
  const asset = fs.readFileSync(assetPath);
  assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "style reference remains a PNG");
  assert.ok(asset.byteLength > 100_000, "style reference keeps enough detail for vector interpretation");
});

test("ships the complete offline diagram-first C4 contract", () => {
  const { api, model } = explorerRuntime();
  assert.equal(api.validateModel(model).valid, true);
  assert.equal(model.meta.level4, "omitted");
  assert.deepEqual(Object.keys(model.views).sort(), [
    "containers", "context", "iphone-components", "watch-components"
  ]);
  assert.doesNotMatch(html, /relationship-summary|relationship-index|>R\d+</);
  assert.doesNotMatch(html, /\bfetch\s*\(/);

  const externalResources = [
    ...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)=["']([^"']+)["']/gi)
  ].map((match) => match[1]).filter((url) => /^https?:\/\//.test(url));
  assert.deepEqual(externalResources, []);
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
    ["iphone-realtime-inbound", "시작·이탈 상태를 전송합니다", "WCSession · sendMessage", "watch-app-external", "phone-connectivity"],
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

test("connects every supporting Person to the elements they directly use", () => {
  const model = architectureModel();
  const expected = {
    containers: [["learner", "iphone-app"], ["learner", "watch-app"]],
    "iphone-components": [["learner", "iphone-ui"]],
    "watch-components": [["learner", "watch-ui"], ["learner", "motion-capture"]]
  };
  for (const [viewId, pairs] of Object.entries(expected)) {
    const view = model.views[viewId];
    for (const [from, to] of pairs) {
      const relationship = view.relationships.find((candidate) => candidate.from === from && candidate.to === to);
      assert.ok(relationship, `${viewId} connects ${from} to ${to}`);
      assert.ok(relationship.description.length > 4, `${viewId}:${from}->${to} explains the interaction`);
      assert.ok(relationship.technology.length > 0, `${viewId}:${from}->${to} names the interaction technology`);
    }
  }
});

test("keeps System Context free of implementation technologies and low-level APIs", () => {
  const context = architectureModel().views.context;
  for (const node of context.nodes) {
    assert.equal(node.technology ?? "", "", `${node.id} stays technology-free at L1`);
  }
  for (const relationship of context.relationships) {
    assert.equal(relationship.technology ?? "", "", `${relationship.id} stays goal-level at L1`);
    assert.doesNotMatch(`${relationship.description} ${relationship.technology ?? ""}`, /AVFoundation|Security-scoped|URL|SwiftUI|watchOS|iOS/i);
  }
});

test("keeps external iPhone node outside the Watch level-three boundary", () => {
  const view = architectureModel().views["watch-components"];
  const boundary = view.boundaries.find(({ id }) => id === "watch-boundary");
  const external = view.nodes.find(({ id }) => id === "iphone-app-external");
  assert.ok(external.x >= boundary.x + boundary.w || external.x + external.w <= boundary.x || external.y >= boundary.y + boundary.h || external.y + external.h <= boundary.y);
  assert.equal(boundary.members.includes(external.id), false);
});

test("exports navigation helpers and reports dangling relationships as recoverable", () => {
  const { api, model } = explorerRuntime();
  assert.equal(api.validateModel(model).valid, true);
  assert.deepEqual(Array.from(api.getBreadcrumbs("watch-components")), [
    "context", "containers", "watch-components"
  ]);
  const broken = structuredClone(model);
  broken.views.context.relationships[0].to = "missing-node";
  const dangling = api.validateModel(broken);
  assert.equal(dangling.valid, true);
  assert.match(dangling.errors.join("\n"), /missing-target/);
  const badDescription = structuredClone(model);
  delete badDescription.views.context.nodes[0].description;
  assert.equal(api.validateModel(badDescription).valid, false);
  const badRole = structuredClone(model);
  badRole.views.context.nodes[0].visualRole = "unknown";
  assert.equal(api.validateModel(badRole).valid, false);
});

test("builds one direct Inspector overview for every node even when optional lists are absent", () => {
  const { api, model } = explorerRuntime();
  for (const [viewId, view] of Object.entries(model.views)) {
    for (const node of view.nodes) {
      const markup = api.buildInspectorMarkup(model, {
        ...api.createWorkspaceState(), currentView: viewId, selectedNode: node.id
      });
      assert.match(markup, /class="inspector-overview"/, `${viewId}:${node.id} shows its overview`);
      assert.doesNotMatch(markup, /role="tab"|data-inspector-tab|inspector-tabpanel/, `${viewId}:${node.id} has no dead tab controls`);
    }
  }
});

test("keeps the readable fallback visible until successful initialization", () => {
  const fallback = html.match(/<section id="fallback-summary"[^>]*>/)?.[0] ?? "";
  assert.ok(fallback);
  assert.doesNotMatch(fallback, /\shidden(?:\s|>)/);
  assert.match(html, /try\s*\{[\s\S]*JSON\.parse/);
  assert.match(html, /fallback\.hidden\s*=\s*true/);
  assert.match(html, /catch\s*\(/);
  assert.match(html, /\.fallback-summary\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*overflow:\s*auto/s);
});

test("announces view and selection changes and defines persistent focus targets", () => {
  const { api, model } = explorerRuntime();
  assert.equal(api.workspaceAnnouncement(model, { currentView: "context" }, { type: "view", viewId: "containers" }), "Container Diagram 보기로 이동했습니다.");
  assert.equal(api.workspaceAnnouncement(model, { currentView: "context" }, { type: "select-node", nodeId: "learner" }), "리듬을 연습하는 사용자 요소를 선택했습니다.");
  assert.match(html, /workspace-announcer/);
  assert.match(html, /restoreWorkspaceFocus/);
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
    tool: "select",
    relationshipMode: "focus",
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
  assert.match(toolbar, /aria-label="왼쪽 패널 닫기"/);
  assert.match(toolbar, /aria-label="인스펙터 열기"/);
  assert.doesNotMatch(toolbar, /id="left-panel"/);
  assert.doesNotMatch(toolbar, /id="right-inspector"/);
  assert.equal([...toolbar.matchAll(/data-panel-toggle=/g)].length, 2, "each panel keeps one persistent toolbar affordance");
  assert.doesNotMatch(html, /id="left-panel-toggle"|id="right-panel-toggle"/);
});

test("gives the open left panel a local close control while reserving the toolbar control for reopening", () => {
  const leftPanel = html.match(/<aside id="left-panel"[\s\S]*?<\/aside>/)?.[0] ?? "";
  const heading = leftPanel.match(/<div class="panel-heading">[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(heading, /id="left-panel-close"/);
  assert.match(heading, /data-panel-toggle="left"/);
  assert.match(heading, /aria-controls="left-panel"/);
  assert.match(heading, /aria-label="왼쪽 패널 닫기"/);
  assert.match(html, /\.workspace-shell\[data-left-open="true"\]\s+#toolbar-left-panel-toggle\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(html, /\.workspace-shell\[data-left-open="false"\]\s+#toolbar-left-panel-toggle\s*\{[^}]*visibility:\s*visible/s);
  assert.match(html, /querySelectorAll\("\[data-panel-toggle\]"\)/);
});

test("moves focus between the local close control and the persistent reopen control", () => {
  const focused = [];
  const controls = new Map([
    ["left-panel-close", { focus: () => focused.push("local-close") }],
    ["toolbar-left-panel-toggle", { focus: () => focused.push("toolbar-reopen") }]
  ]);
  const document = {
    getElementById: (id) => controls.get(id) ?? null,
    querySelector: () => null
  };
  const window = { requestAnimationFrame: (callback) => callback() };
  const { api } = explorerRuntime({ document, window, CSS: { escape: (value) => value } });

  api.restoreWorkspaceFocus({ type: "toggle-left-panel" }, { leftPanelOpen: false });
  api.restoreWorkspaceFocus({ type: "toggle-left-panel" }, { leftPanelOpen: true });

  assert.deepEqual(focused, ["local-close", "toolbar-reopen"]);
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

test("gives Person, Document, and Data Store nodes one roomy vector-card grammar", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.getSemanticCardGeometry, "function");
  const semanticNodes = Object.values(model.views).flatMap((view) => view.nodes.filter((node) =>
    ["person", "softwareSystem", "dataStore"].includes(node.visualRole)
  ));

  for (const node of semanticNodes) {
    const geometry = api.getSemanticCardGeometry(node);
    assert.ok(geometry.content.width >= node.w * 0.72, `${node.id} keeps at least 72% width for copy`);
    assert.ok(geometry.content.height >= node.h * 0.55, `${node.id} keeps at least 55% height for copy`);
    assert.ok(geometry.content.x >= 18, `${node.id} keeps a calm inner inset`);
    assert.ok(geometry.content.x + geometry.content.width <= node.w - 18, `${node.id} keeps a matching trailing inset`);
    const markup = api.buildShapeGeometry(node);
    assert.match(markup, /class="node-content-surface"/, `${node.id} renders a dedicated text card`);
    assert.doesNotMatch(markup, /<image\b/, `${node.id} remains a true SVG vector`);
  }
});

test("aligns the System Context arrows on one shared horizontal connection lane", () => {
  const { api, model } = explorerRuntime();
  const view = model.views.context;
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const laneYs = [];

  for (const relationship of view.relationships) {
    assert.equal(relationship.connectionLane?.axis, "horizontal", `${relationship.id} declares horizontal alignment`);
    const points = api.relationshipPolyline(nodes, relationship);
    assert.equal(points[0].y, points.at(-1).y, `${relationship.id} enters and leaves containers at one height`);
    assert.ok(points.every((point) => point.y === points[0].y), `${relationship.id} stays on a clean horizontal line`);
    laneYs.push(points[0].y);
  }
  assert.equal(new Set(laneYs).size, 1, "all System Context arrows share the same baseline");
});

test("aligns every L1 semantic container on one bottom baseline", () => {
  const { model } = explorerRuntime();
  const bottoms = model.views.context.nodes.map((node) => node.y + node.h);
  assert.ok(bottoms.every((bottom) => Math.abs(bottom - bottoms[0]) < 0.01), `L1 bottoms share one baseline: ${bottoms.join(", ")}`);
});

test("lays out multi-line node text sections without overlapping baselines", () => {
  const { api, model } = explorerRuntime();
  const node = model.views.containers.nodes.find((candidate) => candidate.id === "iphone-app");
  const layout = api.getSvgTextLayout(node);

  assert.ok(layout.name.lines.length > 0, "real iPhone node keeps its name");
  assert.ok(layout.meta.lines.length > 0, "real iPhone node keeps its technology");
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

test("the reusable shell returns cloned version 2 vertices without browser rerouting", () => {
  const shellPath = fileURLToPath(new URL("../creating-c4-diagrams/assets/c4-explorer-shell.html", import.meta.url));
  const shell = fs.readFileSync(shellPath, "utf8");
  const source = shell.match(/<script[^>]*id=["']explorer-logic["'][^>]*type=["']text\/javascript["'][^>]*>([\s\S]*?)<\/script>/)?.[1]?.trim() ?? "";
  assert.ok(source, "reusable explorer logic must exist");
  const context = { window: {}, console };
  vm.runInNewContext(source, context);

  const vertices = [{ x: 10, y: 20 }, { x: 80, y: 20 }];
  const points = context.window.C4Explorer.relationshipPolyline(new Map([
    ["phone", { id: "phone", x: 0, y: 0, w: 20, h: 20 }],
    ["watch", { id: "watch", x: 100, y: 0, w: 20, h: 20 }],
  ]), {
    from: "phone",
    to: "watch",
    geometryVersion: 2,
    vertices,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(points)), vertices);
  assert.notEqual(points, vertices);
  assert.notEqual(points[0], vertices[0]);
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

test("gives every dense component relationship a compact generated route", () => {
  const { api, model } = explorerRuntime();
  for (const viewId of ["iphone-components", "watch-components"]) {
    const view = model.views[viewId];
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const items = new Map(api.getRelationshipRenderItems(view, { ...api.createWorkspaceState(), currentView: viewId, relationshipMode: "all" })
      .map((item) => [item.relationship.id, item]));
    for (const relationship of view.relationships) {
      assert.ok(["horizontal", "vertical"].includes(relationship.routeLane?.axis), `${viewId}:${relationship.id} declares a consistent route axis`);
      assert.equal(relationship.waypoints, undefined, `${viewId}:${relationship.id} no longer uses a distant manual detour`);
      const points = api.relationshipPolyline(nodes, relationship);
      assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)), `${viewId}:${relationship.id} keeps finite route points`);
      assert.ok(points.every((point) => point.x >= 0 && point.x <= view.worldSize.width && point.y >= 0 && point.y <= view.worldSize.height), `${viewId}:${relationship.id} stays inside its compact canvas`);
      const label = items.get(relationship.id).labelPoint;
      const { width, height } = api.getRelationshipLabelLayout(relationship);
      for (const node of view.nodes) {
        const clearsNode = label.x + width / 2 <= node.x - 20 || label.x - width / 2 >= node.x + node.w + 20 || label.y + height / 2 <= node.y - 20 || label.y - height / 2 >= node.y + node.h + 20;
        assert.ok(clearsNode, `${viewId}:${relationship.id} label clears ${node.id}`);
      }
    }
  }
});

test("keeps dense component relationship label surfaces at least 12 units apart", () => {
  const { api, model } = explorerRuntime();
  const minimumGap = 12;
  for (const viewId of ["iphone-components", "watch-components"]) {
    const view = model.views[viewId];
    const labels = api.getRelationshipRenderItems(view, { ...api.createWorkspaceState(), currentView: viewId, relationshipMode: "all" }).map((item) => {
      const { width, height } = api.getRelationshipLabelLayout(item.relationship);
      return { id: item.relationship.id, left: item.labelPoint.x - width / 2, right: item.labelPoint.x + width / 2, top: item.labelPoint.y - height / 2, bottom: item.labelPoint.y + height / 2 };
    });
    for (let index = 0; index < labels.length; index += 1) {
      for (const other of labels.slice(index + 1)) {
        const label = labels[index];
        const separated = label.right + minimumGap <= other.left || other.right + minimumGap <= label.left || label.bottom + minimumGap <= other.top || other.bottom + minimumGap <= label.top;
        assert.ok(separated, `${viewId}:${label.id}/${other.id} preserves ${minimumGap}px label clearance`);
      }
    }
  }
});

test("progressively reveals dense L3 relationships around the selected container", () => {
  const { api, model } = explorerRuntime();
  const view = model.views["iphone-components"];
  const idleState = { ...api.createWorkspaceState(), currentView: view.id };

  assert.equal(idleState.relationshipMode, "focus", "dense diagrams begin as a quiet relationship map");
  const idleItems = api.getRelationshipRenderItems(view, idleState);
  assert.equal(idleItems.length, view.relationships.length);
  assert.ok(idleItems.every((item) => item.presentation === "ambient" && item.labelVisible === false));

  const selectedState = api.reduceWorkspace(model, idleState, { type: "select-node", nodeId: "app-flow" });
  const selectedItems = api.getRelationshipRenderItems(view, selectedState);
  const directlyConnected = new Set(view.relationships
    .filter((relationship) => [relationship.from, relationship.to].includes("app-flow"))
    .map((relationship) => relationship.id));

  for (const item of selectedItems) {
    if (directlyConnected.has(item.relationship.id)) {
      assert.equal(item.presentation, "emphasized", `${item.relationship.id} becomes the foreground`);
      assert.equal(item.labelVisible, true, `${item.relationship.id} reveals its inline label`);
    } else {
      assert.equal(item.presentation, "muted", `${item.relationship.id} recedes behind the selection`);
      assert.equal(item.labelVisible, false, `${item.relationship.id} keeps its label out of the way`);
    }
  }

  const allState = api.reduceWorkspace(model, selectedState, { type: "set-relationship-mode", mode: "all" });
  assert.equal(allState.relationshipMode, "all");
  assert.ok(api.getRelationshipRenderItems(view, allState)
    .every((item) => item.presentation === "emphasized" && item.labelVisible === true));

  const controls = api.buildLayersMarkup(view, allState);
  assert.match(controls, /data-relationship-mode="focus"/);
  assert.match(controls, /data-relationship-mode="all"[^>]*aria-pressed="true"/);
});

test("progressively reveals L2 container relationships around the selected element", () => {
  const { api, model } = explorerRuntime();
  const view = model.views.containers;
  const idleState = { ...api.createWorkspaceState(), currentView: view.id };

  const idleItems = api.getRelationshipRenderItems(view, idleState);
  assert.ok(idleItems.every((item) => item.presentation === "ambient" && item.labelVisible === false));

  const selectedState = api.reduceWorkspace(model, idleState, { type: "select-node", nodeId: "iphone-app" });
  const directlyConnected = new Set(view.relationships
    .filter((relationship) => [relationship.from, relationship.to].includes("iphone-app"))
    .map((relationship) => relationship.id));
  for (const item of api.getRelationshipRenderItems(view, selectedState)) {
    assert.equal(item.presentation, directlyConnected.has(item.relationship.id) ? "emphasized" : "muted");
    assert.equal(item.labelVisible, directlyConnected.has(item.relationship.id));
  }

  const controls = api.buildLayersMarkup(view, selectedState);
  assert.match(controls, /data-relationship-mode="focus"[^>]*aria-pressed="true"/);
  assert.match(controls, /data-relationship-mode="all"/);

  const clearedState = api.reduceWorkspace(model, selectedState, { type: "clear-selection" });
  assert.ok(api.getRelationshipRenderItems(view, clearedState)
    .every((item) => item.presentation === "ambient" && item.labelVisible === false));
});

test("aligns the L2 interaction row and separates container relationships into compact lanes", () => {
  const { api, model } = explorerRuntime();
  const view = model.views.containers;
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const primaryCenters = ["learner", "iphone-app", "watch-app"].map((id) => {
    const node = nodes.get(id);
    return node.y + node.h / 2;
  });
  assert.ok(primaryCenters.every((center) => Math.abs(center - primaryCenters[0]) < 0.01), "primary L2 elements share one visual centerline");

  const fileStore = nodes.get("file-store");
  const phone = nodes.get("iphone-app");
  assert.equal(fileStore.x + fileStore.w / 2, phone.x + phone.w / 2, "the supporting storage row aligns with its iPhone consumer");

  const phoneWatchPaths = [];
  for (const relationship of view.relationships) {
    assert.ok(["horizontal", "vertical"].includes(relationship.routeLane?.axis), `${relationship.id} declares a route axis`);
    assert.equal(relationship.waypoints, undefined, `${relationship.id} removes its distant manual detour`);
    const points = api.relationshipPolyline(nodes, relationship);
    assert.ok(points.length >= 2, `${relationship.id} produces a route`);
    assert.ok(points.every((point) => point.x >= 0 && point.x <= view.worldSize.width && point.y >= 0 && point.y <= view.worldSize.height), `${relationship.id} stays inside the L2 canvas`);
    if (new Set([relationship.from, relationship.to]).size === 2
      && [relationship.from, relationship.to].every((id) => ["iphone-app", "watch-app"].includes(id))) {
      assert.equal(points[0].y, points.at(-1).y, `${relationship.id} uses matched horizontal ports`);
      phoneWatchPaths.push(JSON.stringify(points));
    }
  }
  assert.equal(new Set(phoneWatchPaths).size, phoneWatchPaths.length, "parallel iPhone/Watch relationships remain visually distinct");
});

test("renders relationship hierarchy as quiet structure and explicit foreground", () => {
  const { api, model } = explorerRuntime();
  const view = model.views["iphone-components"];
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const relationship = view.relationships.find(({ id }) => id === "iphone-flow-audio");

  const ambient = api.buildRelationshipMarkup(nodes, relationship, {
    presentation: "ambient",
    labelVisible: false
  });
  assert.match(ambient, /class="relationship is-ambient/);
  assert.match(ambient, /class="relationship-label"[^>]*aria-hidden="true"/);

  const emphasized = api.buildRelationshipMarkup(nodes, relationship, {
    presentation: "emphasized",
    labelVisible: true
  });
  assert.match(emphasized, /class="relationship is-emphasized/);
  assert.match(emphasized, /class="relationship-label"[^>]*aria-hidden="false"/);
});

test("keeps every emitted node text line inside its role-specific text bounds", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.getNodeTextBounds, "function");
  assert.equal(typeof api.estimateSvgTextWidth, "function");

  for (const view of Object.values(model.views)) {
    for (const node of view.nodes) {
      const bounds = api.getNodeTextBounds(node);
      const layout = api.getSvgTextLayout(node);
      for (const section of ["name", "meta", "description"]) {
        const fontSize = layout[section].fontSize;
        for (const line of layout[section].lines) {
          assert.ok(api.estimateSvgTextWidth(line, fontSize) <= bounds.width, `${view.id}:${node.id}:${section} stays within its text width`);
        }
        assert.ok(layout[section].baseline >= bounds.top, `${view.id}:${node.id}:${section} starts inside the text region`);
        assert.ok(layout[section].lastBaseline <= bounds.bottom, `${view.id}:${node.id}:${section} ends inside the text region`);
      }
      if (layout.name.lines.length > 1) assert.ok(layout.name.lines.at(-1).length >= 3, `${view.id}:${node.id} has no orphan title line`);
    }
  }
});

test("reserves generous role-specific safe areas for every node text block", () => {
  const { api, model } = explorerRuntime();
  const minimumHorizontalPadding = 28;

  for (const view of Object.values(model.views)) {
    for (const node of view.nodes) {
      const bounds = api.getNodeTextBounds(node);
      assert.ok(bounds.x >= minimumHorizontalPadding, `${view.id}:${node.id} keeps a generous leading inset`);
      assert.ok(node.w - (bounds.x + bounds.width) >= minimumHorizontalPadding, `${view.id}:${node.id} keeps a generous trailing inset`);

      if (node.visualRole === "person") {
        const person = api.getPersonGeometry(node);
        assert.ok(bounds.top >= person.body.joinY + 18, `${view.id}:${node.id} starts copy below the curved shoulders`);
        assert.ok(bounds.x >= person.body.sideInset + 18, `${view.id}:${node.id} keeps copy inside the torso sides`);
      }
      if (node.visualRole === "dataStore") {
        assert.ok(bounds.top >= 64, `${view.id}:${node.id} starts copy below the datastore rim`);
        assert.ok(bounds.bottom <= node.h - 30, `${view.id}:${node.id} keeps copy above the datastore base`);
      }
      if (["application", "mobileApplication"].includes(node.visualRole)) {
        assert.ok(bounds.top >= 62, `${view.id}:${node.id} starts copy below the application chrome`);
      }
    }
  }
});

test("wraps node copy with a conservative font-metric safety margin", () => {
  const { api, model } = explorerRuntime();
  for (const view of Object.values(model.views)) {
    for (const node of view.nodes) {
      const layout = api.getSvgTextLayout(node);
      for (const section of ["name", "meta", "description"]) {
        for (const line of layout[section].lines) {
          assert.ok(
            api.estimateSvgTextWidth(line, layout[section].fontSize) <= layout.bounds.width * 0.9,
            `${view.id}:${node.id}:${section} keeps 10% horizontal breathing room`
          );
        }
      }
    }
  }
});

test("clips every node text group to its calculated safe rectangle", () => {
  const { api, model } = explorerRuntime();
  for (const view of Object.values(model.views)) {
    for (const node of view.nodes) {
      const markup = api.buildSvgNodeMarkup(node, false);
      assert.match(markup, /<clipPath id="node-text-clip-[^"]+">/);
      assert.match(markup, /class="node-copy" clip-path="url\(#node-text-clip-[^)]+\)"/);
    }
  }
});

test("keeps nodes and boundary titles on a spacious C4 layout grid", () => {
  const { api, model } = explorerRuntime();
  const minimumNodeGap = { context: 280, containers: 180, "iphone-components": 110, "watch-components": 110 };

  for (const view of Object.values(model.views)) {
    for (const node of view.nodes) {
      assert.ok(node.x >= 96 && node.y >= 96, `${view.id}:${node.id} keeps outer canvas margin`);
      assert.ok(node.x + node.w <= view.worldSize.width - 96, `${view.id}:${node.id} keeps right canvas margin`);
      assert.ok(node.y + node.h <= view.worldSize.height - 96, `${view.id}:${node.id} keeps bottom canvas margin`);
    }

    for (let index = 0; index < view.nodes.length; index += 1) {
      const node = view.nodes[index];
      for (const other of view.nodes.slice(index + 1)) {
        const horizontalGap = Math.max(other.x - (node.x + node.w), node.x - (other.x + other.w));
        const verticalGap = Math.max(other.y - (node.y + node.h), node.y - (other.y + other.h));
        assert.ok(
          Math.max(horizontalGap, verticalGap) >= minimumNodeGap[view.id],
          `${view.id}:${node.id}/${other.id} keeps ${minimumNodeGap[view.id]}px separation`
        );
      }
    }

    const byId = new Map(view.nodes.map((node) => [node.id, node]));
    for (const boundary of view.boundaries) {
      const title = api.getBoundaryLabelBounds(boundary);
      for (const memberId of boundary.members) {
        const member = byId.get(memberId);
        assert.ok(member.y - title.bottom >= 40, `${view.id}:${boundary.id} title has a 40px content lane before ${memberId}`);
      }
    }
  }
});

test("balances L3 canvases around aligned component rows and consistent arrow ports", () => {
  const { api, model } = explorerRuntime();
  const rows = {
    "iphone-components": [
      ["learner", "iphone-ui", "app-flow", "audio-io", "beat-adapter"],
      ["file-store", "result-scoring", "phone-connectivity", "beatthis-engine", "persistence", "watch-app-external"]
    ],
    "watch-components": [
      ["iphone-app-external", "watch-connectivity", "watch-ui", "background-runtime"],
      ["learner", "motion-capture", "swing-detector", "rhythm-judge", "beat-matcher"]
    ]
  };

  for (const [viewId, alignedRows] of Object.entries(rows)) {
    const view = model.views[viewId];
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const ids of alignedRows) {
      const centers = ids.map((id) => {
        const node = nodes.get(id);
        return node.y + node.h / 2;
      });
      assert.ok(centers.every((center) => Math.abs(center - centers[0]) < 0.01), `${viewId}:${ids.join(",")} shares one visual centerline`);
    }

    const extents = [...view.nodes, ...view.boundaries].reduce((bounds, item) => ({
      left: Math.min(bounds.left, item.x),
      top: Math.min(bounds.top, item.y),
      right: Math.max(bounds.right, item.x + (item.w ?? 0)),
      bottom: Math.max(bounds.bottom, item.y + (item.h ?? 0))
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const margins = [extents.left, extents.top, view.worldSize.width - extents.right, view.worldSize.height - extents.bottom];
    assert.ok(Math.max(...margins) <= 140, `${viewId} avoids a large empty canvas edge: ${margins.join(",")}`);
    assert.ok(Math.max(...margins) - Math.min(...margins) <= 40, `${viewId} balances outer whitespace: ${margins.join(",")}`);

    for (const relationship of view.relationships) {
      const source = nodes.get(relationship.from);
      const target = nodes.get(relationship.to);
      const points = api.relationshipPolyline(nodes, relationship);
      if (Math.abs((source.y + source.h / 2) - (target.y + target.h / 2)) < 0.01) {
        assert.equal(points[0].y, points.at(-1).y, `${viewId}:${relationship.id} keeps a shared horizontal port lane`);
      }
      if (Math.abs((source.x + source.w / 2) - (target.x + target.w / 2)) < 0.01) {
        assert.equal(points[0].x, points.at(-1).x, `${viewId}:${relationship.id} keeps a shared vertical port lane`);
      }
    }
  }
});

test("places selected relationship labels near their container without collisions", () => {
  const { api, model } = explorerRuntime();
  for (const [viewId, nodeId] of [["containers", "iphone-app"], ["iphone-components", "app-flow"], ["watch-components", "watch-ui"]]) {
    const view = model.views[viewId];
    const state = { ...api.createWorkspaceState(), currentView: viewId, selectedNode: nodeId };
    const node = view.nodes.find(({ id }) => id === nodeId);
    const visible = api.getRelationshipRenderItems(view, state).filter((item) => item.labelVisible);
    const labelRects = [];

    for (const item of visible) {
      const layout = api.getRelationshipLabelLayout(item.relationship);
      const rect = {
        left: item.labelPoint.x - layout.width / 2,
        right: item.labelPoint.x + layout.width / 2,
        top: item.labelPoint.y - layout.height / 2,
        bottom: item.labelPoint.y + layout.height / 2
      };
      const dx = Math.max(node.x - item.labelPoint.x, 0, item.labelPoint.x - (node.x + node.w));
      const dy = Math.max(node.y - item.labelPoint.y, 0, item.labelPoint.y - (node.y + node.h));
      assert.ok(Math.hypot(dx, dy) <= 520, `${viewId}:${item.relationship.id} label stays near ${nodeId}`);
      for (const other of labelRects) {
        const separated = rect.right + 20 <= other.left || other.right + 20 <= rect.left || rect.bottom + 20 <= other.top || other.bottom + 20 <= rect.top;
        assert.ok(separated, `${viewId}:${item.relationship.id} label does not collide with another focused label`);
      }
      labelRects.push(rect);
    }
  }
});

test("keeps every relationship label clear of nodes and neighboring labels", () => {
  const { api, model } = explorerRuntime();

  const failures = [];
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const state = { ...api.createWorkspaceState(), currentView: view.id, relationshipMode: "all" };
    const renderItems = view.level >= 2
      ? api.getRelationshipRenderItems(view, state)
      : view.relationships.map((relationship) => ({ relationship, labelPoint: api.relationshipLabelPoint(api.relationshipPolyline(nodes, relationship), relationship.labelPosition) }));
    const nodeClearance = view.level >= 2 ? 20 : 32;
    const labelClearance = view.level >= 2 ? 20 : 40;
    const labels = renderItems.map((item) => {
      const { width, height } = api.getRelationshipLabelLayout(item.relationship);
      return {
        id: item.relationship.id,
        left: item.labelPoint.x - width / 2,
        right: item.labelPoint.x + width / 2,
        top: item.labelPoint.y - height / 2,
        bottom: item.labelPoint.y + height / 2
      };
    });

    for (const label of labels) {
      for (const node of view.nodes) {
        const separated = label.right + nodeClearance <= node.x
          || node.x + node.w + nodeClearance <= label.left
          || label.bottom + nodeClearance <= node.y
          || node.y + node.h + nodeClearance <= label.top;
        if (!separated) failures.push(`${view.id}:${label.id}↔${node.id}`);
      }
    }

    for (let index = 0; index < labels.length; index += 1) {
      for (const other of labels.slice(index + 1)) {
        const label = labels[index];
        const separated = label.right + labelClearance <= other.left
          || other.right + labelClearance <= label.left
          || label.bottom + labelClearance <= other.top
          || other.bottom + labelClearance <= label.top;
        if (!separated) failures.push(`${view.id}:${label.id}↔${other.id}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("sizes inline relationship labels from wrapped technology as well as description", () => {
  const { api, model } = explorerRuntime();
  const allRelationships = Object.values(model.views).flatMap((view) => view.relationships);
  const securityScoped = allRelationships.find((relationship) => relationship.technology === "Security-scoped URL");
  assert.ok(securityScoped, "the long Security-scoped technology label is modeled");

  for (const relationship of allRelationships) {
    const layout = api.getRelationshipLabelLayout(relationship);
    assert.ok(layout.descriptionLines.length > 0, `${relationship.id} keeps description text`);
    if (relationship.technology) {
      assert.ok(layout.technologyLines.length > 0, `${relationship.id} keeps technology text`);
      assert.ok(layout.technologyLines.every((line) => api.estimateSvgTextWidth(line, 10) <= layout.width - 30), `${relationship.id} wraps technology within its label`);
    }
    assert.ok(layout.height >= layout.descriptionLines.length * 16 + layout.technologyLines.length * 13 + 14, `${relationship.id} reserves label height for both text sections`);
  }
  const owningView = Object.values(model.views).find((view) => view.relationships.includes(securityScoped));
  const owningNodes = new Map(owningView.nodes.map((node) => [node.id, node]));
  assert.match(api.buildRelationshipMarkup(owningNodes, securityScoped), /relationship-technology/);
});

test("places relationship technology above its description", () => {
  const { api, model } = explorerRuntime();
  const view = model.views.containers;
  const relationship = view.relationships.find(({ id }) => id === "container-learner-to-phone");
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  assert.ok(relationship, "the learner-to-iPhone relationship is modeled");

  const markup = api.buildRelationshipMarkup(nodes, relationship);
  const technologyIndex = markup.indexOf('class="relationship-technology"');
  const descriptionIndex = markup.indexOf('class="relationship-description"');

  assert.ok(technologyIndex >= 0, "the relationship includes its technology");
  assert.ok(descriptionIndex >= 0, "the relationship includes its description");
  assert.ok(technologyIndex < descriptionIndex, "technology is rendered before the description");
  assert.match(markup, /\[iPhone UI\]/);
  assert.match(markup, /곡을 선택하고 연습 흐름을 조작합니다/);
});

test("reserves every C4 boundary title band above its member nodes", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.getBoundaryLabelBounds, "function");
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const boundary of view.boundaries) {
      const label = api.getBoundaryLabelBounds(boundary);
      for (const memberId of boundary.members) {
        const node = nodes.get(memberId);
        const intersects = label.left < node.x + node.w && label.right > node.x && label.top < node.y + node.h && label.bottom > node.y;
        assert.equal(intersects, false, `${view.id}:${boundary.id} title band clears ${memberId}`);
      }
    }
  }
});

test("routes every relationship around unrelated node rectangles", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.relationshipTraversesUnrelatedNode, "function");
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      assert.equal(api.relationshipTraversesUnrelatedNode(nodes, relationship, 6).length, 0, `${view.id}:${relationship.id} avoids unrelated nodes`);
    }
  }
});

test("defines resilient toolbar geometry for an open Inspector", () => {
  assert.match(html, /\.top-toolbar\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto auto/s);
  assert.match(html, /\.top-toolbar\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(html, /\.back-button\s*\{[^}]*min-width:\s*2\.5rem/s);
});

test("anchors every final relationship on its current source and target boundaries", () => {
  const { api, model } = explorerRuntime();
  const onBoundary = (point, node) => {
    const withinX = point.x >= node.x && point.x <= node.x + node.w;
    const withinY = point.y >= node.y && point.y <= node.y + node.h;
    return (withinX && (point.y === node.y || point.y === node.y + node.h)) || (withinY && (point.x === node.x || point.x === node.x + node.w));
  };
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      const points = api.relationshipPolyline(nodes, relationship);
      assert.ok(onBoundary(points[0], nodes.get(relationship.from)), `${view.id}:${relationship.id} begins on source boundary`);
      assert.ok(onBoundary(points.at(-1), nodes.get(relationship.to)), `${view.id}:${relationship.id} ends on target boundary`);
    }
  }
});

test("keeps each relationship label center on its final rendered route", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.pointToPolylineDistance, "function");
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      const points = api.relationshipPolyline(nodes, relationship);
      const label = api.relationshipLabelPoint(points, relationship.labelPosition);
      assert.ok(api.pointToPolylineDistance(label, points) <= 1, `${view.id}:${relationship.id} label is on its final route`);
    }
  }
});

test("treats reversed geometry as the same lane and separates every opposing pair", () => {
  const { api, model } = explorerRuntime();
  const canonicalSegments = (points) => points.slice(1).map((point, index) => {
    const a = points[index]; const b = point;
    return [a, b].map(({ x, y }) => `${x},${y}`).sort().join("|");
  }).sort().join(";");
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const forward of view.relationships) for (const reverse of view.relationships.filter((candidate) => candidate.from === forward.to && candidate.to === forward.from)) {
      assert.notEqual(canonicalSegments(api.relationshipPolyline(nodes, forward)), canonicalSegments(api.relationshipPolyline(nodes, reverse)), `${view.id}:${forward.id}/${reverse.id} uses a distinct lane`);
    }
  }
});

test("handles collinear segment overlap without treating disjoint collinear segments as intersections", () => {
  const { api } = explorerRuntime();
  assert.equal(api.segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }), false);
  assert.equal(api.segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 8, y: 0 }, { x: 20, y: 0 }), true);
});

test("keeps label hints out of the mandatory relationship route", () => {
  const { api, model } = explorerRuntime();
  let relationshipCount = 0;
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      relationshipCount += 1;
      const route = api.relationshipPolyline(nodes, relationship);
      const movedLabel = api.relationshipPolyline(nodes, {
        ...relationship,
        labelPosition: { x: -10000, y: 10000 }
      });
      assert.deepEqual(JSON.parse(JSON.stringify(movedLabel)), JSON.parse(JSON.stringify(route)), `${view.id}:${relationship.id} routes independently of its label hint`);
    }
  }
  assert.equal(relationshipCount, Object.values(model.views).reduce((sum, view) => sum + view.relationships.length, 0));
});

test("keeps all final relationships free of positive collinear self-overlap", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.positiveCollinearOverlapLength, "function");
  let relationshipCount = 0;
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      relationshipCount += 1;
      const points = api.relationshipPolyline(nodes, relationship);
      const segments = points.slice(1).map((end, index) => ({ start: points[index], end }));
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        assert.ok(segment.start.x === segment.end.x || segment.start.y === segment.end.y, `${view.id}:${relationship.id} segment ${index + 1} stays orthogonal`);
        for (const other of segments.slice(index + 1)) {
          assert.equal(api.positiveCollinearOverlapLength(segment.start, segment.end, other.start, other.end), 0, `${view.id}:${relationship.id} has no positive-length retrace`);
        }
      }
    }
  }
  assert.equal(relationshipCount, Object.values(model.views).reduce((sum, view) => sum + view.relationships.length, 0));
});

test("keeps all final relationships free of proper orthogonal self-intersections", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.orthogonalProperIntersection, "function");

  assert.deepEqual(JSON.parse(JSON.stringify(api.orthogonalProperIntersection(
    { x: 0, y: 5 }, { x: 10, y: 5 },
    { x: 4, y: 0 }, { x: 4, y: 10 }
  ))), { x: 4, y: 5 }, "detects a horizontal × vertical interior crossing");
  assert.equal(api.orthogonalProperIntersection(
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 0 }, { x: 10, y: 10 }
  ), null, "allows an adjacent shared endpoint");
  assert.equal(api.orthogonalProperIntersection(
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 2, y: 0 }, { x: 8, y: 0 }
  ), null, "leaves collinear overlap to its dedicated invariant");

  const formerWatchUiJudge = [
    { x: 700, y: 245 }, { x: 700, y: 255.246 },
    { x: 1405.08, y: 255.246 }, { x: 1405.08, y: 450 },
    { x: 1594.92, y: 450 }, { x: 1594.92, y: 254.754 },
    { x: 525.246, y: 254.754 }, { x: 525.246, y: 265 },
    { x: 700, y: 265 }
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(api.orthogonalProperIntersection(
    formerWatchUiJudge[0], formerWatchUiJudge[1],
    formerWatchUiJudge[5], formerWatchUiJudge[6]
  ))), { x: 700, y: 254.754 }, "detects the concrete pre-fix watch-ui-judge crossing");

  const failures = [];
  let relationshipCount = 0;
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      relationshipCount += 1;
      const points = api.relationshipPolyline(nodes, relationship);
      const segments = points.slice(1).map((end, index) => ({ start: points[index], end }));
      for (let index = 0; index < segments.length; index += 1) {
        for (let other = index + 2; other < segments.length; other += 1) {
          const intersection = api.orthogonalProperIntersection(
            segments[index].start, segments[index].end,
            segments[other].start, segments[other].end
          );
          if (intersection) failures.push(`${view.id}:${relationship.id}:${index + 1}×${other + 1}@${intersection.x},${intersection.y}`);
        }
      }
    }
  }
  assert.equal(relationshipCount, Object.values(model.views).reduce((sum, view) => sum + view.relationships.length, 0));
  assert.deepEqual(failures, []);
});

test("separates all 14 opposing relationship pairs without a shared positive-length lane", () => {
  const { api, model } = explorerRuntime();
  let opposingPairCount = 0;
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (let index = 0; index < view.relationships.length; index += 1) {
      const relationship = view.relationships[index];
      const first = api.relationshipPolyline(nodes, relationship);
      const firstSegments = first.slice(1).map((end, segmentIndex) => ({ start: first[segmentIndex], end }));
      for (const reverse of view.relationships.slice(index + 1).filter((candidate) => candidate.from === relationship.to && candidate.to === relationship.from)) {
        opposingPairCount += 1;
        const second = api.relationshipPolyline(nodes, reverse);
        const secondSegments = second.slice(1).map((end, segmentIndex) => ({ start: second[segmentIndex], end }));
        for (const forwardSegment of firstSegments) for (const reverseSegment of secondSegments) {
          assert.equal(api.positiveCollinearOverlapLength(forwardSegment.start, forwardSegment.end, reverseSegment.start, reverseSegment.end), 0, `${view.id}:${relationship.id}/${reverse.id} shares no positive-length lane`);
        }
      }
    }
  }
  const expectedOpposingPairs = Object.values(model.views).reduce((sum, view) => sum + view.relationships.reduce((count, relationship, index) =>
    count + view.relationships.slice(index + 1).filter((candidate) => candidate.from === relationship.to && candidate.to === relationship.from).length, 0), 0);
  assert.equal(opposingPairCount, expectedOpposingPairs);
});

test("analytically keeps all relationship segments out of endpoint interiors", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.segmentTraversesNodeInterior, "function");
  let relationshipCount = 0;
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      relationshipCount += 1;
      const points = api.relationshipPolyline(nodes, relationship);
      const endpoints = [nodes.get(relationship.from), nodes.get(relationship.to)];
      assert.notDeepEqual(JSON.parse(JSON.stringify(points[0])), JSON.parse(JSON.stringify(points.at(-1))), `${view.id}:${relationship.id} has distinct endpoint coordinates`);
      for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1]; const end = points[index];
        assert.equal(endpoints.some((node) => api.segmentTraversesNodeInterior(start, end, node)), false, `${view.id}:${relationship.id} segment ${index} stays out of endpoint interiors`);
      }
    }
  }
  assert.equal(relationshipCount, Object.values(model.views).reduce((sum, view) => sum + view.relationships.length, 0));
});

test("keeps each final relationship free of retraced canonical segments and collapsed endpoints", () => {
  const { api, model } = explorerRuntime();
  const key = (a, b) => [a, b].map((point) => `${point.x},${point.y}`).sort().join("|");
  for (const view of Object.values(model.views)) {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    for (const relationship of view.relationships) {
      const points = api.relationshipPolyline(nodes, relationship);
      assert.notDeepEqual(JSON.parse(JSON.stringify(points[0])), JSON.parse(JSON.stringify(points.at(-1))), `${view.id}:${relationship.id} has distinct endpoint coordinates`);
      const segments = points.slice(1).map((point, index) => key(points[index], point));
      assert.equal(new Set(segments).size, segments.length, `${view.id}:${relationship.id} has no retraced segment`);
    }
  }
});

test("filters non-finite relationship route points before making SVG paths", () => {
  const { api } = explorerRuntime();
  assert.equal(api.relationshipPath([{ x: 0, y: 0 }, { x: Infinity, y: 2 }]), "");
});

test("clamps, pans, zooms around the pointer, and fits the SVG world", () => {
  const { api } = explorerRuntime();
  assert.equal(api.clampScale(0.1), 0.2);
  assert.equal(api.clampScale(3), 2);
  assert.deepEqual(JSON.parse(JSON.stringify(api.panViewport({ x: 10, y: 20, scale: 1 }, 5, -4))), {
    x: 15, y: 16, scale: 1
  });

  const zoomed = api.zoomViewportAt({ x: 0, y: 0, scale: 1 }, { x: 100, y: 50 }, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(zoomed)), { x: -100, y: -50, scale: 2 });

  const fitted = api.fitViewport({ width: 1800, height: 1000 }, { width: 1000, height: 700 }, 50);
  assert.ok(fitted.scale >= 0.25 && fitted.scale <= 2);
  assert.ok(Number.isFinite(fitted.x) && Number.isFinite(fitted.y));

  const constrained = api.constrainViewport(
    { x: -9999, y: 9999, scale: 1 },
    { width: 1800, height: 1000 },
    { width: 1000, height: 700 },
    160
  );
  assert.deepEqual(JSON.parse(JSON.stringify(constrained)), { x: -960, y: 160, scale: 1 });

  const overScaled = api.constrainViewport(
    { x: -9999, y: 9999, scale: 3 },
    { width: 1800, height: 1000 },
    { width: 1000, height: 700 },
    160
  );
  assert.deepEqual(JSON.parse(JSON.stringify(overScaled)), { x: -2760, y: 160, scale: 2 });
});

test("reserves Space exclusively for temporary Hand outside editable fields", () => {
  const { api } = explorerRuntime();
  const focusedNode = {
    tagName: "g",
    closest: (selector) => selector.includes("[data-node-id]") ? {} : null
  };
  const canvas = { tagName: "DIV", closest: () => null };
  const button = { tagName: "BUTTON", closest: (selector) => selector.includes("button") ? {} : null };

  assert.equal(api.shouldUseTemporaryHand({ code: "Space" }, focusedNode), true);
  assert.equal(api.shouldUseTemporaryHand({ code: "Space" }, canvas), true);
  assert.equal(api.shouldUseTemporaryHand({ code: "Space" }, button), true);
  assert.equal(api.shouldUseTemporaryHand({ code: "Space" }, { tagName: "INPUT", closest: () => null }), false);
  assert.equal(api.shouldUseTemporaryHand({ code: "Space" }, { tagName: "DIV", isContentEditable: true, closest: () => null }), false);

  assert.equal(api.shouldSuppressCanvasActivation(true, false), true, "holding Space blocks element activation");
  assert.equal(api.shouldSuppressCanvasActivation(false, true), true, "the click produced by a completed pan is discarded");
  assert.equal(api.shouldSuppressCanvasActivation(false, false), false);
});

test("keeps canvas toolbar controls operable while Hand is active", () => {
  const { api } = explorerRuntime();
  const canvas = { closest: () => null };
  const canvasTool = { closest: (selector) => selector === "#canvas-tools" ? {} : null };

  assert.equal(typeof api.shouldStartCanvasPan, "function");
  assert.equal(api.shouldStartCanvasPan(canvasTool, "hand", false, 0), false, "toolbar input never starts a pan");
  assert.equal(api.shouldStartCanvasPan(canvas, "hand", false, 0), true, "Hand pans the canvas");
  assert.equal(api.shouldStartCanvasPan(canvas, "select", true, 0), true, "Space temporarily pans the canvas");
  assert.equal(api.shouldStartCanvasPan(canvas, "select", false, 1), true, "the middle button pans the canvas");
  assert.equal(api.shouldStartCanvasPan(canvas, "select", false, 0), false, "Select keeps primary canvas clicks available");
});

test("returns progressive disclosure to its quiet map from an empty canvas click", () => {
  const { api } = explorerRuntime();
  const canvas = { closest: () => null };
  const node = { closest: (selector) => selector.includes("[data-node-id]") ? {} : null };
  const control = { closest: (selector) => selector.includes("button") ? {} : null };

  assert.equal(api.shouldClearSelectionOnCanvasTap(canvas, "select", 0), true);
  assert.equal(api.shouldClearSelectionOnCanvasTap(node, "select", 0), false);
  assert.equal(api.shouldClearSelectionOnCanvasTap(control, "select", 0), false);
  assert.equal(api.shouldClearSelectionOnCanvasTap(canvas, "hand", 0), false);
  assert.equal(api.shouldClearSelectionOnCanvasTap(canvas, "select", 1), false);
});

test("names every C4 canvas toolbar control for assistive technology", () => {
  const toolbar = html.match(/<div id="canvas-tools"[\s\S]*?<\/div>/)?.[0] ?? "";
  for (const label of ["선택 도구", "이동 도구", "축소", "화면에 맞추기", "확대", "현재 확대 비율"]) {
    assert.match(toolbar, new RegExp(`aria-label="${label}"`));
  }
});

test("reserves enough horizontal space for context relationship labels", () => {
  const { model } = explorerRuntime();
  const nodes = [...model.views.context.nodes].sort((a, b) => a.x - b.x);
  const gaps = nodes.slice(1).map((node, index) => node.x - (nodes[index].x + nodes[index].w));

  assert.ok(gaps.every((gap) => gap >= 150), `context gaps must fit 150px labels: ${gaps.join(", ")}`);
});

test("fits the initial System Context as a spacious overview", () => {
  const { api, model } = explorerRuntime();
  const viewport = api.fitViewport(model.views.context.worldSize, { width: 1160, height: 900 }, 72);

  assert.ok(viewport.scale >= 0.45, `System Context must remain readable while preserving generous lanes (got ${viewport.scale})`);
});

test("fits the Container Diagram as a spacious overview", () => {
  const { api, model } = explorerRuntime();
  const viewport = api.fitViewport(model.views.containers.worldSize, { width: 1160, height: 900 }, 72);

  assert.ok(viewport.scale >= 0.3, `Container Diagram must preserve readable overview scale with expanded lanes (got ${viewport.scale})`);
});

test("synchronizes SVG coordinates to the expanded canvas after panel motion", () => {
  const attributes = new Map();
  const svg = { setAttribute(name, value) { attributes.set(name, value); } };
  const viewport = { getBoundingClientRect: () => ({ width: 1440, height: 900 }) };
  const { api } = explorerRuntime({
    document: {
      getElementById(id) {
        if (id === "diagram-svg") return svg;
        if (id === "diagram-viewport") return viewport;
        return null;
      }
    }
  });

  assert.equal(typeof api.syncSvgCoordinateSystem, "function");
  api.syncSvgCoordinateSystem();
  assert.equal(attributes.get("viewBox"), "0 0 1440 900");
});

test("preserves diagram screen coordinates while either side panel changes the canvas frame", () => {
  const { api } = explorerRuntime();
  const viewport = { x: 180, y: 96, scale: 0.8 };

  const leftOpened = api.preserveViewportScreenPosition(
    viewport,
    { left: 0, top: 0, width: 1440, height: 900 },
    { left: 336, top: 0, width: 1104, height: 900 }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(leftOpened)), { x: -156, y: 96, scale: 0.8 });
  assert.equal(0 + viewport.x, 336 + leftOpened.x, "opening the left panel keeps the diagram at the same screen x");

  const rightOpened = api.preserveViewportScreenPosition(
    viewport,
    { left: 0, top: 0, width: 1440, height: 900 },
    { left: 0, top: 0, width: 1040, height: 900 }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(rightOpened)), viewport, "right-side width changes do not recenter the diagram");
});

test("anchors the dotted canvas grid to the stable workspace coordinate system", () => {
  assert.match(html, /\.workspace-shell\s*\{[^}]*background-image:\s*radial-gradient/s);
  assert.doesNotMatch(html, /\.canvas-region\s*\{[^}]*background-image:\s*radial-gradient/s);
});

test("renders Views and Layers as synchronized read-only navigation", () => {
  const { api, model } = explorerRuntime();
  const state = api.createWorkspaceState();
  const views = api.buildViewsMarkup(model, state);
  assert.match(views, /System Context/);
  assert.match(views, /Container Diagram/);
  assert.match(views, /iPhone Components/);
  assert.match(views, /Watch Components/);
  assert.doesNotMatch(views, /L4/);

  const layers = api.buildLayersMarkup(model.views.context, state);
  assert.match(layers, /리듬을 연습하는 사용자/);
  assert.match(layers, /엇박 리듬 훈련 시스템/);
  assert.match(layers, /관계/);
  assert.doesNotMatch(layers, /Relationship visibility|Boundaries|Elements|Relationships/);
});

test("opens the Inspector on selection and drills only on an explicit open action", () => {
  const { api, model } = explorerRuntime();
  let state = api.createWorkspaceState();
  state = api.reduceWorkspace(model, state, { type: "select-node", nodeId: "rhythm-system" });
  assert.equal(state.currentView, "context");
  assert.equal(state.rightPanelOpen, true);
  const overview = api.buildInspectorMarkup(model, state);
  assert.match(overview, /L2 열기/);
  assert.match(overview, /README\.md/);

  state = api.openDrilldown(model, state, "rhythm-system");
  assert.equal(state.currentView, "containers");
  assert.equal(state.selectedNode, null);
  assert.equal(state.rightPanelOpen, false);

  const terminal = api.openDrilldown(model, { ...state, currentView: "iphone-components" }, "beatthis-engine");
  assert.equal(terminal.currentView, "iphone-components");
});

test("shows direct Inspector guidance before any node is selected", () => {
  const { api, model } = explorerRuntime();
  const state = { ...api.createWorkspaceState(), rightPanelOpen: true };
  const markup = api.buildInspectorMarkup(model, state);

  assert.match(markup, /요소를 선택해 책임과 구현 상태를 확인하세요/);
  assert.doesNotMatch(markup, /role="tab"|data-inspector-tab|inspector-tabpanel/);
});

test("links Views and Layers to unique accessible tab panels without Inspector tabs", () => {
  const { api, model } = explorerRuntime();
  const state = api.createWorkspaceState();
  const left = api.buildLeftPanelMarkup(model, state);
  const inspector = api.buildInspectorMarkup(model, state);
  const ids = [...`${left}${inspector}`.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "each rendered tab and tabpanel id is unique");

  for (const tab of ["views", "layers"]) {
    assert.match(left, new RegExp(`id="left-tab-${tab}"[^>]*role="tab"[^>]*aria-controls="left-tabpanel-${tab}"[^>]*aria-selected="${tab === "views"}"[^>]*tabindex="${tab === "views" ? "0" : "-1"}"`));
    assert.match(left, new RegExp(`id="left-tabpanel-${tab}"[^>]*role="tabpanel"[^>]*aria-labelledby="left-tab-${tab}"`));
  }
  const leftViewsPanel = left.match(/<div id="left-tabpanel-views"[^>]*>/)?.[0] ?? "";
  const leftLayersPanel = left.match(/<div id="left-tabpanel-layers"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(leftViewsPanel, /hidden/);
  assert.match(leftLayersPanel, /hidden/);
  assert.doesNotMatch(inspector, /role="tab"|role="tabpanel"|data-inspector-tab/);
});

test("calculates wrapped keyboard navigation for the left tablist", () => {
  const { api } = explorerRuntime();

  assert.equal(api.getNextTabIndex(2, 0, "ArrowLeft"), 1, "left tabs wrap from first to last");
  assert.equal(api.getNextTabIndex(2, 1, "ArrowRight"), 0, "left tabs wrap from last to first");
  assert.equal(api.getNextTabIndex(2, 1, "Home"), 0);
  assert.equal(api.getNextTabIndex(2, 0, "End"), 1);
  assert.equal(api.getNextTabIndex(2, 1, "Enter"), null, "unhandled keys retain native behavior");
});

test("declares desktop workspace accessibility and user preference fallbacks", () => {
  assert.match(html, /aria-label="왼쪽 패널 열기|aria-label="왼쪽 패널 닫기/);
  assert.match(html, /aria-label="인스펙터 열기|aria-label="인스펙터 닫기/);
  assert.match(html, /aria-label="캔버스 도구"/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(html, /@media \(prefers-contrast: more\)/);
  assert.match(html, /:focus-visible/);
  assert.match(html, /@media \(max-width: 1599px\)/);
  assert.match(html, /@media \(max-width: 799px\)/);
});

test("reserves readable desktop widths for both architecture side panels", () => {
  assert.match(html, /--sidebar-left:\s*21rem/);
  assert.match(html, /--sidebar-right:\s*25rem/);
  assert.match(html, /@media \(max-width: 1599px\)[\s\S]*?\.side-panel\s*\{[^}]*width:\s*min\(25rem,\s*92vw\)/);
});

test("keeps one overlay panel open at compact desktop widths", () => {
  const { api } = explorerRuntime();
  const state = { ...api.createWorkspaceState(), leftPanelOpen: true, rightPanelOpen: true };
  const compact = api.normalizePanelsForWidth(state, 1440, "right");
  assert.equal(compact.leftPanelOpen, false);
  assert.equal(compact.rightPanelOpen, true);
  const desktop = api.normalizePanelsForWidth(state, 1700, "right");
  assert.equal(desktop.leftPanelOpen, true);
  assert.equal(desktop.rightPanelOpen, true);
});

test("compacts short Person card copy inside its semantic silhouette", () => {
  const { api, model } = explorerRuntime();
  const people = Object.values(model.views).flatMap((view) => view.nodes.filter((node) => node.visualRole === "person"));
  for (const person of people) {
    const layout = api.getSvgTextLayout(person);
    const occupiedBaselines = [layout.name.lastBaseline, layout.meta.lastBaseline, layout.description.lastBaseline]
      .filter(Number.isFinite);
    assert.ok(Math.max(...occupiedBaselines) <= person.h - 12, `${person.id} metadata stays inside the Person card`);
    assert.ok(layout.name.baseline >= 12, `${person.id} keeps readable name inset`);
  }
});

test("removes closed C4 panels from keyboard navigation and restores them before reopening", () => {
  const { api } = explorerRuntime();
  const attributes = new Map();
  const panel = {
    inert: false,
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; }
  };

  api.setPanelAccessibility(panel, false);
  assert.equal(panel.inert, true);
  assert.equal(panel.getAttribute("inert"), "");
  assert.equal(panel.getAttribute("aria-hidden"), "true");

  api.setPanelAccessibility(panel, true);
  assert.equal(panel.inert, false);
  assert.equal(panel.getAttribute("inert"), null);
  assert.equal(panel.getAttribute("aria-hidden"), null);
});

test("animates desktop C4 panels through their own edges while reclaiming canvas width", () => {
  assert.match(html, /\.workspace-shell\s*\{[^}]*transition:\s*grid-template-columns/s);
  assert.match(html, /\.workspace-shell\[data-left-open="false"\]\s+\.left-panel\s*\{[^}]*transform:\s*translateX\(-100%\)[^}]*opacity:\s*0/s);
  assert.match(html, /\.workspace-shell\[data-right-open="false"\]\s+\.right-inspector\s*\{[^}]*transform:\s*translateX\(100%\)[^}]*opacity:\s*0/s);
  assert.match(html, /\.workspace-shell\[data-left-open="true"\]\s+\.left-panel\s*\{[^}]*transform:\s*translateX\(0\);\s*opacity:\s*1/s);
  assert.match(html, /\.workspace-shell\[data-right-open="true"\]\s+\.right-inspector\s*\{[^}]*transform:\s*translateX\(0\);\s*opacity:\s*1/s);
});

test("moves the left panel reopen control to the canvas left edge", () => {
  assert.match(html, /\.workspace-shell\[data-left-open="false"\]\s+#toolbar-left-panel-toggle\s*\{[^}]*position:\s*absolute[^}]*left:\s*\.625rem/s);
  assert.match(html, /\.workspace-shell\[data-left-open="false"\]\s+\.top-toolbar\s*\{[^}]*left:\s*0[^}]*padding-left:\s*3\.625rem/s);
});

test("keeps mobile side-sheet panel controls at a 44px touch target", () => {
  const mobileRules = html.match(/@media \(max-width: 799px\) \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  assert.match(mobileRules, /\.toolbar-action,\s*\.canvas-tool\s*\{[^}]*min-width:\s*2\.75rem;[^}]*min-height:\s*2\.75rem/s);
});

test("stacks compact canvas chrome so the toolbar and legend cannot overlap", () => {
  const compactRules = html.match(/@media \(max-width: 799px\) \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  assert.match(compactRules, /\.canvas-tools\s*\{[^}]*max-width:\s*calc\(100vw - 1\.5rem\)[^}]*flex-wrap:\s*wrap/s);
  assert.match(compactRules, /\.canvas-legend\s*\{[^}]*bottom:\s*4\.5rem[^}]*max-width:\s*calc\(100vw - 1\.5rem\)/s);
});

test("uses a balanced 3 by 2 toolbar and hides the legend at 320px", () => {
  const narrowRules = html.match(/@media \(max-width: 360px\) \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  assert.match(narrowRules, /\.top-toolbar\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\) auto/s);
  assert.match(narrowRules, /\.breadcrumb\s*\{[^}]*display:\s*none/s);
  assert.match(narrowRules, /\.toolbar-context\s*\{[^}]*display:\s*block/s);
  assert.match(narrowRules, /\.canvas-tools\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(3,\s*2\.75rem\)/s);
  assert.match(narrowRules, /\.canvas-legend\s*\{[^}]*display:\s*none/s);
});

test("strengthens C4 geometry and labels in increased contrast mode", () => {
  const contrastRules = html.match(/@media \(prefers-contrast: more\) \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  for (const selector of [".relationship-path", ".arrow-marker", ".relationship-label-surface", ".c4-boundary rect", ".diagram-node .node-surface"]) {
    assert.match(contrastRules, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("gives only drillable C4 containers an obvious one-click level footer", () => {
  const { api, model } = explorerRuntime();
  const drillable = model.views.context.nodes.find(({ id }) => id === "rhythm-system");
  const levelThree = model.views.containers.nodes.find(({ id }) => id === "iphone-app");
  const staticNode = model.views.containers.nodes.find(({ id }) => id === "file-store");

  const drillableMarkup = api.buildSvgNodeMarkup(drillable, false);
  assert.match(drillableMarkup, /class="diagram-node[^\"]*is-drilldown/);
  assert.match(drillableMarkup, /data-drilldown-level="2"/);
  assert.match(drillableMarkup, /aria-label="[^"]*L2 컨테이너 열기 가능"/);
  assert.match(drillableMarkup, /class="node-open node-open-footer"[^>]*role="button"[^>]*tabindex="0"[^>]*aria-label="L2 컨테이너 열기"/);
  assert.match(drillableMarkup, />L2 컨테이너 열기<\/text>/);
  const [, footerWidth, footerHeight] = drillableMarkup.match(/class="node-open-surface"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/) ?? [];
  assert.ok(Number(footerWidth) >= drillable.w * 0.6, "the footer reads as a full action region instead of a small badge");
  assert.ok(Number(footerHeight) >= 30, "the footer has a comfortably visible hit target");
  assert.equal(api.isDrilldownActivationKey("Enter"), true);
  assert.equal(api.isDrilldownActivationKey(" "), true);
  assert.equal(api.isDrilldownActivationKey("Escape"), false);

  const levelThreeMarkup = api.buildSvgNodeMarkup(levelThree, false);
  assert.match(levelThreeMarkup, /aria-label="L3 컴포넌트 열기"/);
  assert.match(levelThreeMarkup, />L3 컴포넌트 열기<\/text>/);

  const staticMarkup = api.buildSvgNodeMarkup(staticNode, false);
  assert.doesNotMatch(staticMarkup, /is-drilldown|data-drilldown-level|node-open-surface|열기 가능/);
});

test("pins every drilldown footer to the same content-relative position", () => {
  const { api, model } = explorerRuntime();
  assert.equal(typeof api.getDrilldownFooterGeometry, "function");

  const semanticRoles = new Set(["person", "softwareSystem", "dataStore"]);
  const drillableNodes = Object.values(model.views)
    .flatMap((view) => view.nodes)
    .filter((node) => node.drilldown);

  assert.ok(drillableNodes.length > 1, "the invariant covers more than one drilldown node");
  for (const node of drillableNodes) {
    const layout = api.getSvgTextLayout(node);
    const footer = api.getDrilldownFooterGeometry(node, layout);
    const scale = node.textScale ?? 1;
    const host = semanticRoles.has(node.visualRole)
      ? api.getSemanticCardGeometry(node).content
      : { x: 0, y: 0, width: node.w, height: node.h };

    assert.equal(footer.x, layout.bounds.x, `${node.id}: align to the text column`);
    assert.equal(footer.width, layout.bounds.width, `${node.id}: match the text column width`);
    assert.ok(Math.abs(host.y + host.height - footer.y - footer.height - 16 * scale) < 0.001,
      `${node.id}: keep the shared 16px content-bottom inset`);
    assert.ok(footer.y >= host.y, `${node.id}: stay inside the content area`);
    assert.ok(footer.y + footer.height <= host.y + host.height,
      `${node.id}: never protrude below the content area`);
  }
});

test("keeps the refined side panels while restoring the prior canvas presentation", () => {
  const { api, model } = explorerRuntime();
  const views = api.buildViewsMarkup(model, api.createWorkspaceState());
  assert.match(views, /class="view-row"/);
  assert.match(views, /class="view-level"[^>]*>L1</);

  const selectedState = { ...api.createWorkspaceState(), selectedNode: "learner" };
  assert.deepEqual(JSON.parse(JSON.stringify(api.getInspectorHeader(model, selectedState))), {
    eyebrow: "선택한 요소",
    title: "리듬을 연습하는 사용자"
  });
  const inspector = api.buildInspectorMarkup(model, selectedState);
  assert.match(inspector, /리듬을 연습하는 사용자/);
  assert.doesNotMatch(inspector, /role="tab"|data-inspector-tab|inspector-tabpanel/);

  const node = model.views.containers.nodes.find(({ id }) => id === "iphone-app");
  const nodeMarkup = api.buildSvgNodeMarkup(node, false);
  assert.match(nodeMarkup, new RegExp(node.name));
  assert.match(nodeMarkup, new RegExp(node.description.split(" ")[0]));
  assert.match(nodeMarkup, /class="node-copy"/);

  const stylesheet = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  assert.doesNotMatch(stylesheet, /data-node-detail="shape"/);
  assert.doesNotMatch(stylesheet, /data-semantic-zoom="map"/);
  assert.doesNotMatch(stylesheet, /@media \(prefers-color-scheme: dark\)/);

  const view = model.views["iphone-components"];
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const relationship = view.relationships.find(({ id }) => id === "iphone-flow-audio");
  const markup = api.buildRelationshipMarkup(nodes, relationship, {
    presentation: "emphasized",
    labelVisible: true
  });
  assert.match(markup, /class="relationship-label"[^>]*aria-hidden="false"/);
  assert.doesNotMatch(markup, /label-focused|label-overview|label-context|label-hidden/);
});

test("keeps primary chrome integrated and reserves floating material for canvas tools", () => {
  const styleSource = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
  const desktopStyles = styleSource.split("@media (max-width: 1599px)")[0];
  const lastDeclarations = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [...desktopStyles.matchAll(new RegExp(`^\\s*${escaped}\\s*\\{([^}]*)\\}`, "gm"))].at(-1)?.[1] ?? "";
  };

  assert.match(lastDeclarations(".top-toolbar"), /inset:\s*0 0 auto/);
  assert.match(lastDeclarations(".top-toolbar"), /border-radius:\s*0/);
  assert.match(lastDeclarations(".top-toolbar"), /box-shadow:\s*none/);
  assert.match(lastDeclarations(".toolbar-action"), /background:\s*transparent/);
  assert.match(lastDeclarations(".canvas-tools"), /box-shadow:\s*var\(--elevation-floating\)/);
  assert.match(lastDeclarations(".canvas-legend"), /background:\s*transparent/);
  assert.match(lastDeclarations(".canvas-legend"), /backdrop-filter:\s*none/);
});

test("keeps selected utility controls visually stronger than hover feedback", () => {
  const styleSource = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const hoverIndex = styleSource.lastIndexOf(".back-button:not(:disabled):hover, .toolbar-action:hover, .canvas-tool:hover");
  const selectedIndex = styleSource.lastIndexOf('.toolbar-action[aria-expanded="true"], .canvas-tool[aria-pressed="true"]');

  assert.ok(hoverIndex >= 0, "utility controls provide hover feedback");
  assert.ok(selectedIndex > hoverIndex, "selected state wins the CSS cascade when the pointer also hovers");
});

test("keeps persistent chrome text at WCAG AA contrast", () => {
  const root = html.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const token = (name) => root.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  const luminance = (hex) => {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const contrast = (foreground, background) => {
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  assert.ok(contrast(token("ink"), token("surface-panel")) >= 4.5, "primary panel text passes AA");
  assert.ok(contrast(token("muted"), token("surface-panel")) >= 4.5, "secondary panel text passes AA");
  assert.ok(contrast(token("blue-deep"), token("blue-soft")) >= 4.5, "active utility text passes AA");
});

test("groups inspector information into flat utility sections", () => {
  const { api, model } = explorerRuntime();
  const state = { ...api.createWorkspaceState(), selectedNode: "rhythm-system" };
  const markup = api.buildInspectorMarkup(model, state);

  assert.match(markup, /class="inspector-section inspector-summary"/);
  assert.match(markup, /class="inspector-meta"/);
  assert.match(markup, /class="inspector-section inspector-state"/);
  assert.match(markup, /class="inspector-section inspector-evidence"/);
  assert.match(markup, /class="inspector-drilldown"/);
});

test("renders drilldown controls as integrated container footer rows", () => {
  const { api, model } = explorerRuntime();
  const node = model.views.context.nodes.find(({ id }) => id === "rhythm-system");
  const markup = api.buildSvgNodeMarkup(node, false);

  assert.match(markup, /class="node-open node-open-footer"[^>]*data-variant="integrated"/);
  assert.match(markup, /class="node-open-divider"/);
  assert.match(markup, /class="node-open-surface"/);
});

export { architectureModel, explorerRuntime, html, scriptBody };
