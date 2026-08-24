# Diagram-first C4 Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the document-style RhythmTrainer C4 Explorer with an offline, SVG-first, diagram-centered workspace that uses semantic node silhouettes, inline directional relationship labels, collapsible sidebars, and Figma-like pan/zoom interaction.

**Architecture:** Keep the analyzed C4 data, renderer, and interaction code inside the existing standalone HTML artifact, but separate their responsibilities through pure functions and explicit workspace state. Render boundaries, semantic nodes, relationships, and labels in one SVG world group; keep the Views/Layers sidebar, Inspector, and floating controls as accessible HTML chrome around the canvas.

**Tech Stack:** Standalone HTML5, CSS, vanilla JavaScript, inline SVG, Node.js built-in `node:test`, Playwright browser verification; no external runtime dependencies or network resources.

**Spec:** `docs/superpowers/specs/2026-08-24-diagram-first-c4-workspace-design.md`

## Global Constraints

- Keep the deliverable at `rhythmtrainer-c4-explorer.html` and runnable without a build step.
- Do not load external scripts, stylesheets, fonts, icons, images, or data.
- Preserve the four views: `context`, `containers`, `iphone-components`, and `watch-components`.
- Keep C4 Level 4 omitted; no node may drill down beyond Level 3.
- Do not invent a server, cloud service, database, or other runtime element not supported by the analyzed source.
- Use one-way arrows with directionally correct descriptions; split request and response into separate relationships.
- Put relationship descriptions and applicable technology/protocol directly on arrows; remove R-number labels and the separate relationship summary.
- Keep C4 abstraction type (`type`) separate from semantic silhouette (`visualRole`).
- Initial UI state is L1 fit-to-view, left panel open, right Inspector closed, Select tool active, and no selection.
- Support zoom from 25% through 200%, pointer-centered zoom, two-axis pan, Space-drag, Fit view, and keyboard zoom controls.
- Preserve source evidence and analyzed commit `bff9f2a6b38fe50e5f4f65c91ef95da402bd928f` in the Inspector.
- Respect `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast`.
- Export every function named in a task's `Interfaces` block through `window.RhythmC4Explorer` so the Node VM tests exercise production code.
- Use test-driven implementation and commit after every task.

## File Structure

- Modify `rhythmtrainer-c4-explorer.html`: owns the offline artifact, architecture model, accessible workspace chrome, SVG renderer, state reducers, interaction controllers, and responsive styling.
- Modify `tests/rhythmtrainer-c4-explorer.test.mjs`: owns model, state, renderer, viewport, accessibility, and offline-contract tests by evaluating the exported runtime in a Node VM.
- Create browser screenshots only under `output/playwright/`: visual evidence remains untracked and must not be added to commits.

The artifact remains one HTML file because offline portability is a product requirement. Within the script, use named pure functions and grouped state so the file has internal module boundaries even though it is physically bundled.

---

### Task 1: Strengthen the C4 Model and Relationship Semantics

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-149`
- Modify: `rhythmtrainer-c4-explorer.html:403-758`

**Interfaces:**
- Consumes: the existing JSON object returned by `architectureModel()`.
- Produces: `View.worldSize`, `View.boundaries`, `Node.visualRole`, `Relationship.description`, optional `Relationship.technology`, optional `Relationship.waypoints`, optional `Relationship.labelPosition`, and `validateModel(model): { valid: boolean, errors: string[] }`.

- [ ] **Step 1: Replace the old relationship-label test with failing semantic model tests**

Add tests that require the new model vocabulary and supporting elements:

```js
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
      if (["Container", "Component"].includes(node.type)) {
        assert.ok(node.technology.length > 0, `${view.id}:${node.id} has technology`);
      }
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
});
```

Update the existing validation test to corrupt `description` and `visualRole` separately and assert that `validateModel` rejects both.

- [ ] **Step 2: Run the model tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="semantic roles|exports navigation" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because `worldSize`, `boundaries`, `visualRole`, and `description` are not defined.

- [ ] **Step 3: Migrate the architecture model without inventing runtime elements**

Apply these model changes:

```js
// Every view
"worldSize": { "width": 1800, "height": 1000 },
"boundaries": []

// Representative nodes
{ "id": "learner", "type": "Person", "visualRole": "person", ... }
{ "id": "rhythm-system", "type": "Software System", "visualRole": "softwareSystem", ... }
{ "id": "file-store", "type": "External Software System", "visualRole": "dataStore", ... }
{ "id": "iphone-app", "type": "Container", "visualRole": "application", ... }
{ "id": "watch-app", "type": "Container", "visualRole": "mobileApplication", ... }
{ "id": "persistence", "type": "Component", "visualRole": "component", "status": "gap", ... }
```

Add the existing `learner` as a supporting element to the Container and both Component views. Add `file-store` to the iPhone Component view because it directly supplies Audio I/O. Keep the other app container outside each Level 3 boundary.

Define L2 and L3 boundaries with IDs and explicit member lists:

```js
"boundaries": [{
  "id": "rhythm-boundary",
  "name": "엇박 리듬 훈련 시스템",
  "type": "Software System",
  "members": ["iphone-app", "watch-app"],
  "x": 360, "y": 150, "w": 1040, "h": 700
}]
```

Replace every relationship `label` with `description`. Split compound relationships into directional pairs, including:

```js
{ "id": "iphone-ui-to-flow", "from": "iphone-ui", "to": "app-flow",
  "description": "사용자 명령을 전달합니다", "technology": "SwiftUI actions" }
{ "id": "iphone-flow-to-ui", "from": "app-flow", "to": "iphone-ui",
  "description": "화면 상태와 결과를 제공합니다", "technology": "Combine observation" }
{ "id": "clock-probe", "from": "iphone-app", "to": "watch-app",
  "description": "시계 오프셋 측정을 요청합니다", "technology": "WCSession · sendMessage" }
{ "id": "clock-response", "from": "watch-app", "to": "iphone-app",
  "description": "Watch 기준 시각을 응답합니다", "technology": "WCSession · replyHandler" }
```

Leave L1 relationship technology absent when the protocol would add low-level noise. Use `waypoints` and `labelPosition` only on dense L2/L3 relationships that need deterministic separation.

- [ ] **Step 4: Extend `validateModel` for the new schema**

Implement validation with explicit error keys:

```js
const ALLOWED_VISUAL_ROLES = new Set([
  "person", "softwareSystem", "application", "mobileApplication", "dataStore", "component"
]);

function validateModel(model) {
  const errors = [];
  for (const [viewId, view] of Object.entries(model.views ?? {})) {
    if (!(view.worldSize?.width > 0 && view.worldSize?.height > 0)) errors.push(`${viewId}:invalid-world-size`);
    const ids = new Set((view.nodes ?? []).map((node) => node.id));
    for (const node of view.nodes ?? []) {
      if (!ALLOWED_VISUAL_ROLES.has(node.visualRole)) errors.push(`${viewId}:${node.id}:invalid-visual-role`);
      if (!node.description) errors.push(`${viewId}:${node.id}:missing-description`);
      if (["Container", "Component"].includes(node.type) && !node.technology) {
        errors.push(`${viewId}:${node.id}:missing-technology`);
      }
    }
    for (const relationship of view.relationships ?? []) {
      if (!ids.has(relationship.from)) errors.push(`${viewId}:${relationship.id}:missing-source`);
      if (!ids.has(relationship.to)) errors.push(`${viewId}:${relationship.id}:missing-target`);
      if (!relationship.description) errors.push(`${viewId}:${relationship.id}:missing-description`);
      if (view.level >= 2 && !relationship.technology) errors.push(`${viewId}:${relationship.id}:missing-technology`);
    }
    for (const boundary of view.boundaries ?? []) {
      for (const member of boundary.members ?? []) {
        if (!ids.has(member)) errors.push(`${viewId}:${boundary.id}:missing-member:${member}`);
      }
    }
    if (view.level === 3 && (view.nodes ?? []).some((node) => node.drilldown)) errors.push(`${viewId}:level-4-drilldown`);
  }
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 5: Run the complete Node test file and commit**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS for the migrated model tests; renderer tests that intentionally target later tasks may not be added yet.

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "refactor: strengthen C4 workspace model"
```

---

### Task 2: Introduce Explicit Workspace State and the Diagram-first Shell

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-180`
- Modify: `rhythmtrainer-c4-explorer.html:1-402,760-1068`

**Interfaces:**
- Consumes: the model and `getParentViewId(viewId)` from Task 1.
- Produces: `createWorkspaceState(): WorkspaceState`, `reduceWorkspace(model, state, action): WorkspaceState`, and stable DOM IDs `left-panel`, `diagram-viewport`, `diagram-svg`, `right-inspector`, `top-toolbar`, `canvas-tools`.

- [ ] **Step 1: Write failing state and shell-contract tests**

Add:

```js
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
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="diagram-first workspace|full-viewport workspace" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because the workspace reducer and shell IDs do not exist.

- [ ] **Step 3: Replace document markup with workspace chrome**

Use this structural skeleton:

```html
<main id="workspace" class="workspace-shell">
  <aside id="left-panel" class="side-panel left-panel" aria-label="아키텍처 탐색"></aside>
  <section class="canvas-region" aria-label="C4 다이어그램 작업공간">
    <header id="top-toolbar" class="top-toolbar"></header>
    <div id="diagram-viewport" class="diagram-viewport" tabindex="0">
      <svg id="diagram-svg" class="diagram-svg" role="group" aria-label="C4 다이어그램">
        <g id="diagram-world"></g>
      </svg>
      <div id="canvas-tools" class="canvas-tools" role="toolbar" aria-label="캔버스 도구"></div>
    </div>
  </section>
  <aside id="right-inspector" class="side-panel right-inspector" aria-label="선택한 요소 정보"></aside>
  <div id="workspace-announcer" class="sr-only" aria-live="polite"></div>
</main>
<section id="fallback-summary" class="fallback-summary">
  <h1>엇박 리듬 훈련 시스템 · System Context</h1>
  <p>리듬을 연습하는 사용자가 iPhone과 Apple Watch를 사용해 음원을 분석하고 박자를 연습하는 온디바이스 소프트웨어 시스템입니다.</p>
</section>
```

Remove the hero header, document intro, separate relationship summary, and footer. Move provenance content into model metadata so Task 6 can render it in the Inspector.

- [ ] **Step 4: Implement immutable workspace state reduction**

Use this state shape and action behavior:

```js
function createWorkspaceState() {
  return {
    currentView: "context",
    selectedNode: null,
    leftPanelOpen: true,
    rightPanelOpen: false,
    leftTab: "views",
    inspectorTab: "overview",
    tool: "select",
    viewports: {}
  };
}

function reduceWorkspace(model, state, action) {
  const next = { ...state };
  if (action.type === "toggle-left-panel") next.leftPanelOpen = !state.leftPanelOpen;
  if (action.type === "toggle-right-panel") next.rightPanelOpen = !state.rightPanelOpen;
  if (action.type === "select-node" && getNodeById(model, state.currentView, action.nodeId)) {
    next.selectedNode = action.nodeId;
    next.rightPanelOpen = true;
  }
  if (action.type === "clear-selection") {
    next.selectedNode = null;
    next.rightPanelOpen = false;
  }
  if (action.type === "set-left-tab" && ["views", "layers"].includes(action.tab)) next.leftTab = action.tab;
  if (action.type === "set-inspector-tab" && ["overview", "flow", "evidence", "model"].includes(action.tab)) next.inspectorTab = action.tab;
  if (action.type === "set-tool" && ["select", "hand"].includes(action.tool)) next.tool = action.tool;
  return next;
}
```

Retain compatibility wrappers only if an existing test or event handler still needs them during this task; remove the wrappers once Task 6 migrates all navigation.

- [ ] **Step 5: Add base workspace CSS, run tests, and commit**

Set `html`, `body`, and `.workspace-shell` to `width: 100%; height: 100%; overflow: hidden`. Use CSS grid columns based on panel-open data attributes and give `.canvas-region` `min-width: 0; min-height: 0`:

```css
html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
.workspace-shell {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: var(--left-column, 17.5rem) minmax(0, 1fr) var(--right-column, 0rem);
  background: var(--canvas-background);
}
.workspace-shell[data-left-open="false"] { --left-column: 0rem; }
.workspace-shell[data-right-open="true"] { --right-column: 21rem; }
.canvas-region { position: relative; min-width: 0; min-height: 0; overflow: hidden; }
.diagram-viewport { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
.diagram-svg { width: 100%; height: 100%; display: block; }
```

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS.

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: add diagram-first workspace shell"
```

---

### Task 3: Render Semantic SVG Nodes and C4 Boundaries

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-230`
- Modify: `rhythmtrainer-c4-explorer.html:1-1068`

**Interfaces:**
- Consumes: `Node.visualRole`, node position fields, `View.boundaries`, and workspace selection from Tasks 1-2.
- Produces: `buildShapeGeometry(node): string`, `wrapSvgText(value, maxChars): string[]`, `buildSvgNodeMarkup(node, selected): string`, `buildBoundaryMarkup(boundary): string`, and `renderSvgWorld(view, state): string`.

- [ ] **Step 1: Write failing renderer tests for distinct silhouettes**

Replace the old HTML-button renderer test with:

```js
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
```

- [ ] **Step 2: Run renderer tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="semantic SVG|C4 boundaries" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because the SVG renderer functions do not exist.

- [ ] **Step 3: Implement `buildShapeGeometry` with role-specific SVG primitives**

Return geometry within each node's local `0..w`, `0..h` coordinate space:

```js
function buildShapeGeometry(node) {
  const w = node.w;
  const h = node.h;
  const common = `<rect class="node-surface" x="1" y="1" width="${w - 2}" height="${h - 2}" rx="20"/>`;
  if (node.visualRole === "person") {
    return `<circle class="semantic-person-head" cx="${w / 2}" cy="34" r="26"/>
      <path class="node-surface semantic-person-body" d="M 26 118 Q 26 66 72 66 H ${w - 72} Q ${w - 26} 66 ${w - 26} 118 V ${h - 2} H 26 Z"/>`;
  }
  if (node.visualRole === "softwareSystem") {
    return `<path class="node-surface" d="M 1 1 H ${w - 30} L ${w - 1} 30 V ${h - 1} H 1 Z"/>
      <path class="semantic-file-fold" d="M ${w - 30} 1 V 30 H ${w - 1}"/>`;
  }
  if (node.visualRole === "dataStore") {
    return `<path class="node-surface" d="M 1 24 C 1 2 ${w - 1} 2 ${w - 1} 24 V ${h - 24} C ${w - 1} ${h - 2} 1 ${h - 2} 1 ${h - 24} Z"/>
      <ellipse class="semantic-store-top" cx="${w / 2}" cy="24" rx="${w / 2 - 1}" ry="22"/>
      <path class="semantic-store-bottom" d="M 1 ${h - 24} C 1 ${h - 2} ${w - 1} ${h - 2} ${w - 1} ${h - 24}"/>`;
  }
  if (node.visualRole === "application") {
    return `${common}<path class="semantic-app-chrome" d="M 1 38 H ${w - 1}"/>
      <circle cx="20" cy="20" r="4"/><circle cx="34" cy="20" r="4"/><circle cx="48" cy="20" r="4"/>`;
  }
  if (node.visualRole === "mobileApplication") {
    return `${common}<path class="semantic-app-chrome" d="M 1 38 H ${w - 1}"/>
      <rect class="semantic-device-cue" x="${w - 46}" y="10" width="26" height="18" rx="6"/>`;
  }
  return `${common}<path class="semantic-component-cue" d="M 18 1 V 14 H 34 V 1"/>`;
}
```

Use CSS classes rather than inline colors so internal, external, gap, selected, high-contrast, and print styles can share geometry.

- [ ] **Step 4: Implement accessible node and boundary markup**

Implement wrapped node text and boundary markup directly:

```js
function wrapSvgText(value, maxChars = 28) {
  const chars = Array.from(String(value));
  const lines = [];
  for (let index = 0; index < chars.length; index += maxChars) {
    lines.push(chars.slice(index, index + maxChars).join("").trim());
  }
  return lines.filter(Boolean);
}

function svgTextLines(lines, x, startY, className, lineHeight = 21) {
  return `<text class="${className}" x="${x}" y="${startY}">${lines.map((line, index) =>
    `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeHTML(line)}</tspan>`
  ).join("")}</text>`;
}

function buildBoundaryMarkup(boundary) {
  return `<g class="c4-boundary" data-boundary-id="${escapeHTML(boundary.id)}">
    <rect x="${boundary.x}" y="${boundary.y}" width="${boundary.w}" height="${boundary.h}" rx="28"/>
    <text x="${boundary.x + 24}" y="${boundary.y + 34}">${escapeHTML(boundary.name)}</text>
    <text class="boundary-type" x="${boundary.x + 24}" y="${boundary.y + 56}">[${escapeHTML(boundary.type)}]</text>
  </g>`;
}

function buildSvgNodeMarkup(node, selected) {
  const meta = node.technology ? `[${node.type}: ${node.technology}]` : `[${node.type}]`;
  const textY = node.visualRole === "person" ? 118 : 58;
  const descriptionY = textY + 52;
  const drilldown = node.drilldown
    ? `<g class="node-open" data-open-node-id="${escapeHTML(node.id)}"><text x="24" y="${node.h - 22}">Open L${node.type === "Software System" ? 2 : 3} →</text></g>`
    : "";
  const status = node.status === "gap"
    ? `<text class="node-status" x="24" y="${node.h - 22}">구현됨 · 미배선</text>`
    : "";
  return `<g class="diagram-node status-${escapeHTML(node.status)} role-${escapeHTML(node.visualRole)}"
      transform="translate(${node.x} ${node.y})" data-node-id="${escapeHTML(node.id)}"
      role="button" tabindex="0" aria-pressed="${selected ? "true" : "false"}">
    <title>${escapeHTML(`${node.name}, ${node.type}, ${node.description}`)}</title>
    ${buildShapeGeometry(node)}
    ${svgTextLines(wrapSvgText(node.name, 22), 24, textY, "node-name", 24)}
    ${svgTextLines(wrapSvgText(meta, 30), 24, textY + 28, "node-meta", 18)}
    ${svgTextLines(wrapSvgText(node.description, 30).slice(0, 3), 24, descriptionY, "node-description", 20)}
    ${drilldown}${status}
  </g>`;
}
```

`buildSvgNodeMarkup` must additionally:

- transform the group to `node.x,node.y`
- include `data-node-id`, `role="button"`, `tabindex="0"`, and `aria-pressed`
- include the `<title>` with name, type, responsibility shown above
- render name, `[type: technology]` when applicable, and description with the explicit wrapped `<tspan>` lines shown above
- show the drill-down affordance only for nodes with a valid `drilldown`
- add status text for `gap`

Render boundaries before relationships and nodes:

```js
function renderSvgWorld(view, state) {
  return [
    `<g class="boundary-layer">${view.boundaries.map(buildBoundaryMarkup).join("")}</g>`,
    `<g class="relationship-layer"></g>`,
    `<g class="node-layer">${view.nodes.map((node) => buildSvgNodeMarkup(node, node.id === state.selectedNode)).join("")}</g>`
  ].join("");
}
```

- [ ] **Step 5: Run tests, inspect L1/L2 in browser, and commit**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS.

Open the artifact through a local HTTP server and confirm L1 visibly uses person, folded-file system, and storage silhouettes; confirm L2 has a dashed Software System boundary.

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: render semantic C4 SVG nodes"
```

---

### Task 4: Put Full Relationship Descriptions on Every Arrow

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-280`
- Modify: `rhythmtrainer-c4-explorer.html:1-1068`

**Interfaces:**
- Consumes: `Relationship.description`, `technology`, anchors, waypoints, and label position from Task 1; SVG world output from Task 3.
- Produces: `anchorFor(node, other, override): Point`, `relationshipPolyline(nodes, relationship): Point[]`, `relationshipPath(points): string`, `relationshipLabelPoint(points, override): Point`, and `buildRelationshipMarkup(nodes, relationship): string`.

- [ ] **Step 1: Write failing relationship rendering tests**

Remove tests for `getRelationshipLabelMode` and `buildRelationshipSummary`. Add:

```js
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

test("keeps opposite directions on separate routed paths", () => {
  const { api, model } = explorerRuntime();
  const view = model.views.containers;
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const forward = view.relationships.find((rel) => rel.id === "clock-probe");
  const reverse = view.relationships.find((rel) => rel.id === "clock-response");
  assert.notEqual(api.buildRelationshipMarkup(nodes, forward), api.buildRelationshipMarkup(nodes, reverse));
});
```

- [ ] **Step 2: Run relationship tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="labelled one-way|opposite directions" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because `buildRelationshipMarkup` does not exist and R-number behavior remains.

- [ ] **Step 3: Implement routed relationship geometry**

Use explicit waypoints when present; otherwise derive side anchors from the dominant center delta:

```js
function anchorFor(node, other, override) {
  if (override && Number.isFinite(override.x) && Number.isFinite(override.y)) return override;
  const center = { x: node.x + node.w / 2, y: node.y + node.h / 2 };
  const otherCenter = { x: other.x + other.w / 2, y: other.y + other.h / 2 };
  const dx = otherCenter.x - center.x;
  const dy = otherCenter.y - center.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx >= 0 ? node.x + node.w : node.x, y: center.y };
  }
  return { x: center.x, y: dy >= 0 ? node.y + node.h : node.y };
}

function relationshipPolyline(nodes, relationship) {
  const from = nodes.get(relationship.from);
  const to = nodes.get(relationship.to);
  if (!from || !to) return [];
  const start = anchorFor(from, to, relationship.sourceAnchor);
  const end = anchorFor(to, from, relationship.targetAnchor);
  return [start, ...(relationship.waypoints ?? []), end];
}

function relationshipPath(points) {
  if (points.length < 2) return "";
  return points.reduce((path, point, index) => `${path}${index ? " L" : "M"} ${point.x} ${point.y}`, "");
}

function relationshipLabelPoint(points, override) {
  if (override && Number.isFinite(override.x) && Number.isFinite(override.y)) return override;
  let longest = { length: -1, start: points[0], end: points[1] };
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length > longest.length) longest = { length, start, end };
  }
  return { x: (longest.start.x + longest.end.x) / 2, y: (longest.start.y + longest.end.y) / 2 };
}
```

When no manual `labelPosition` exists, place the label at the midpoint of the longest segment so there is enough whitespace for text.

- [ ] **Step 4: Render description and technology in an inline SVG label**

Use a group with a quiet backing surface:

```js
const ARROW_MARKERS = `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 Z"/>
</marker>
<marker id="arrow-gap" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 Z"/>
</marker>`;

function buildRelationshipMarkup(nodes, relationship) {
  const points = relationshipPolyline(nodes, relationship);
  if (points.length < 2) return "";
  const label = relationshipLabelPoint(points, relationship.labelPosition);
  const statusClass = relationship.status === "gap" ? " status-gap" : "";
  const descriptionLines = wrapSvgText(relationship.description, 30);
  const descriptionText = `<text class="relationship-description" x="0" y="-4" text-anchor="middle">${descriptionLines.map((line, index) =>
    `<tspan x="0" dy="${index ? 16 : 0}">${escapeHTML(line)}</tspan>`
  ).join("")}</text>`;
  const technology = relationship.technology
    ? `<text class="relationship-technology" x="0" y="${descriptionLines.length * 16 + 3}" text-anchor="middle">[${escapeHTML(relationship.technology)}]</text>`
    : "";
  const labelHeight = descriptionLines.length * 16 + (relationship.technology ? 24 : 10);
  return `<g class="relationship${statusClass}" data-relationship-id="${escapeHTML(relationship.id)}">
    <path class="relationship-path${statusClass}" d="${relationshipPath(points)}" marker-end="url(#arrow${relationship.status === "gap" ? "-gap" : ""})"/>
    <g class="relationship-label" transform="translate(${label.x} ${label.y})">
      <rect class="relationship-label-surface" x="-120" y="-22" width="240" height="${labelHeight}" rx="8"/>
      ${descriptionText}${technology}
    </g>
  </g>`;
}
```

The description uses deterministic tspans rather than allowing clipping.

Remove `getRelationshipLabelMode`, `buildRelationshipSummary`, `renderRelationshipSummary`, numbered `foreignObject` labels, and their CSS.

- [ ] **Step 5: Run tests, verify all four views visually, and commit**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS.

Inspect all four Views at fit-to-view. Adjust only `waypoints`, `labelPosition`, or node coordinates in the model when labels overlap; do not reintroduce R numbers or a summary list.

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: label C4 relationships inline"
```

---

### Task 5: Add Figma-like Pan, Zoom, and Viewport Controls

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-340`
- Modify: `rhythmtrainer-c4-explorer.html:1-1068`

**Interfaces:**
- Consumes: `View.worldSize`, `diagram-viewport`, `diagram-world`, and workspace tool state.
- Produces: `clampScale(scale): number`, `panViewport(viewport, dx, dy): Viewport`, `zoomViewportAt(viewport, point, nextScale): Viewport`, `fitViewport(worldSize, frameSize, padding): Viewport`, `constrainViewport(viewport, worldSize, frameSize, margin): Viewport`, `localPoint(event, element): Point`, `currentViewport(): Viewport`, `setViewport(viewport): void`, `applyViewportTransform(viewport): void`, `ensureViewportForCurrentView(): void`, `bindToolbarActions(): void`, and `bindViewportInteractions(): void`.

- [ ] **Step 1: Write failing pure viewport math tests**

Add:

```js
test("clamps, pans, zooms around the pointer, and fits the SVG world", () => {
  const { api } = explorerRuntime();
  assert.equal(api.clampScale(0.1), 0.25);
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
});
```

- [ ] **Step 2: Run the viewport test and verify it fails**

Run:

```bash
node --test --test-name-pattern="clamps, pans" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because the viewport helpers are undefined.

- [ ] **Step 3: Implement pure viewport math**

```js
function clampScale(scale) {
  return Math.min(2, Math.max(0.25, scale));
}

function panViewport(viewport, dx, dy) {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

function zoomViewportAt(viewport, point, nextScale) {
  const scale = clampScale(nextScale);
  const ratio = scale / viewport.scale;
  return {
    x: point.x - (point.x - viewport.x) * ratio,
    y: point.y - (point.y - viewport.y) * ratio,
    scale
  };
}

function fitViewport(worldSize, frameSize, padding = 72) {
  const usableWidth = Math.max(1, frameSize.width - padding * 2);
  const usableHeight = Math.max(1, frameSize.height - padding * 2);
  const scale = clampScale(Math.min(usableWidth / worldSize.width, usableHeight / worldSize.height));
  return {
    x: (frameSize.width - worldSize.width * scale) / 2,
    y: (frameSize.height - worldSize.height * scale) / 2,
    scale
  };
}

function constrainViewport(viewport, worldSize, frameSize, margin = 160) {
  const minX = Math.min(margin, frameSize.width - worldSize.width * viewport.scale - margin);
  const minY = Math.min(margin, frameSize.height - worldSize.height * viewport.scale - margin);
  return {
    x: Math.min(margin, Math.max(minX, viewport.x)),
    y: Math.min(margin, Math.max(minY, viewport.y)),
    scale: clampScale(viewport.scale)
  };
}
```

- [ ] **Step 4: Bind pointer, wheel, pinch-equivalent, controls, and shortcuts**

Create the state bridge and bind interactions with these exact behaviors:

```js
function localPoint(event, element) {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function currentViewport() {
  return workspaceState.viewports[workspaceState.currentView] ?? { x: 0, y: 0, scale: 1 };
}

function applyViewportTransform(viewportState) {
  document.getElementById("diagram-world")
    .setAttribute("transform", `translate(${viewportState.x} ${viewportState.y}) scale(${viewportState.scale})`);
}

function setViewport(viewportState) {
  const frame = document.getElementById("diagram-viewport").getBoundingClientRect();
  const worldSize = architectureModel.views[workspaceState.currentView].worldSize;
  const finite = [viewportState.x, viewportState.y, viewportState.scale].every(Number.isFinite);
  const safeViewport = constrainViewport(
    finite ? viewportState : fitViewport(worldSize, { width: frame.width, height: frame.height }, 72),
    worldSize,
    { width: frame.width, height: frame.height },
    160
  );
  workspaceState = {
    ...workspaceState,
    viewports: { ...workspaceState.viewports, [workspaceState.currentView]: safeViewport }
  };
  applyViewportTransform(safeViewport);
  document.getElementById("zoom-value").textContent = `${Math.round(safeViewport.scale * 100)}%`;
}

function ensureViewportForCurrentView() {
  const saved = workspaceState.viewports[workspaceState.currentView];
  if (saved) {
    applyViewportTransform(saved);
    return;
  }
  const frame = document.getElementById("diagram-viewport").getBoundingClientRect();
  const worldSize = architectureModel.views[workspaceState.currentView].worldSize;
  setViewport(fitViewport(worldSize, { width: frame.width, height: frame.height }, 72));
}

function zoomBy(factor) {
  const frame = document.getElementById("diagram-viewport").getBoundingClientRect();
  const center = { x: frame.width / 2, y: frame.height / 2 };
  const viewportState = currentViewport();
  setViewport(zoomViewportAt(viewportState, center, viewportState.scale * factor));
}

function bindToolbarActions() {
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "toggle-left-panel") updateWorkspace({ type: action }, "left");
    if (action === "toggle-right-panel") updateWorkspace({ type: action }, "right");
    if (action === "fit-view") {
      const viewports = { ...workspaceState.viewports };
      delete viewports[workspaceState.currentView];
      workspaceState = { ...workspaceState, viewports };
      ensureViewportForCurrentView();
    }
    if (action === "zoom-in") zoomBy(1.15);
    if (action === "zoom-out") zoomBy(1 / 1.15);
  }));
}

function bindViewportInteractions() {
  const viewport = document.getElementById("diagram-viewport");
  let drag = null;
  let spaceHeld = false;

  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const point = localPoint(event, viewport);
      setViewport(zoomViewportAt(currentViewport(), point, currentViewport().scale * Math.exp(-event.deltaY * 0.002)));
    } else {
      setViewport(panViewport(
        currentViewport(),
        event.shiftKey ? -event.deltaY : -event.deltaX,
        event.shiftKey ? 0 : -event.deltaY
      ));
    }
  }, { passive: false });

  viewport.addEventListener("pointerdown", (event) => {
    const canPan = workspaceState.tool === "hand" || spaceHeld || event.button === 1;
    if (!canPan) return;
    event.preventDefault();
    viewport.setPointerCapture(event.pointerId);
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    setViewport(panViewport(currentViewport(), event.clientX - drag.x, event.clientY - drag.y));
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  });
  viewport.addEventListener("pointerup", (event) => {
    if (drag?.pointerId === event.pointerId) drag = null;
  });

  window.addEventListener("keydown", (event) => {
    const editable = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
    if (event.code === "Space" && !editable) spaceHeld = true;
    if ((event.metaKey || event.ctrlKey) && event.code === "Equal") { event.preventDefault(); zoomBy(1.15); }
    if ((event.metaKey || event.ctrlKey) && event.code === "Minus") { event.preventDefault(); zoomBy(1 / 1.15); }
    if ((event.metaKey || event.ctrlKey) && event.code === "Digit0") {
      event.preventDefault();
      const viewports = { ...workspaceState.viewports };
      delete viewports[workspaceState.currentView];
      workspaceState = { ...workspaceState, viewports };
      ensureViewportForCurrentView();
    }
    if (!editable && event.key.toLowerCase() === "v") updateWorkspace({ type: "set-tool", tool: "select" });
    if (!editable && event.key.toLowerCase() === "h") updateWorkspace({ type: "set-tool", tool: "hand" });
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") spaceHeld = false;
  });
}
```

The code uses Pointer Events and `setPointerCapture` for Space-drag, Hand-drag, and middle-button drag. It updates the transform on every pointer move with no debounce and applies `translate(x y) scale(scale)` to `#diagram-world`.

Bind:

- `Meta/Ctrl + Equal`: zoom in by 1.15
- `Meta/Ctrl + Minus`: zoom out by 1/1.15
- `Meta/Ctrl + 0`: fit current View
- `V`: Select tool when focus is not in a text control
- `H`: Hand tool when focus is not in a text control
- Space down/up: temporary Hand tool without losing the selected persistent tool

Render zoom percentage and pressed tool state in `canvas-tools`.

- [ ] **Step 5: Run tests, exercise interactions in browser, and commit**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS.

Browser checks:

- wheel pans vertically
- Shift-wheel pans horizontally
- synthetic two-axis wheel delta pans diagonally
- Space-drag and Hand-drag track 1:1
- pointer-centered zoom does not jump
- Fit restores the full View
- scale never leaves 25%~200%

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: add C4 canvas pan and zoom"
```

---

### Task 6: Build Views/Layers Navigation and the Selection Inspector

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-410`
- Modify: `rhythmtrainer-c4-explorer.html:1-1068`

**Interfaces:**
- Consumes: workspace state, model, node selection, View navigation, and viewport functions from Tasks 1-5.
- Produces: `buildViewsMarkup(model, state): string`, `buildLayersMarkup(view, state): string`, `buildInspectorMarkup(model, state): string`, `switchView(state, viewId): WorkspaceState`, `openDrilldown(model, state, nodeId): WorkspaceState`, `renderTopToolbar(view, state): void`, `renderCanvasTools(state): void`, `bindRenderedControls(): void`, and `renderWorkspace(): void`.

- [ ] **Step 1: Write failing navigation and Inspector tests**

Add:

```js
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
});

test("opens the Inspector on selection and drills only on an explicit open action", () => {
  const { api, model } = explorerRuntime();
  let state = api.createWorkspaceState();
  state = api.reduceWorkspace(model, state, { type: "select-node", nodeId: "rhythm-system" });
  assert.equal(state.currentView, "context");
  assert.equal(state.rightPanelOpen, true);
  assert.match(api.buildInspectorMarkup(model, state), /Open L2/);
  assert.match(api.buildInspectorMarkup(model, state), /README\.md/);

  state = api.openDrilldown(model, state, "rhythm-system");
  assert.equal(state.currentView, "containers");
  assert.equal(state.selectedNode, null);
  assert.equal(state.rightPanelOpen, false);

  const terminal = api.openDrilldown(model, { ...state, currentView: "iphone-components" }, "beatthis-engine");
  assert.equal(terminal.currentView, "iphone-components");
});
```

- [ ] **Step 2: Run navigation tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="Views and Layers|Inspector on selection" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because the panel renderers and explicit drill-down function do not exist.

- [ ] **Step 3: Implement Views/Layers and toolbar navigation**

Implement the two navigation representations with explicit buttons:

```js
function buildViewsMarkup(model, state) {
  const order = ["context", "containers", "iphone-components", "watch-components"];
  return `<nav class="view-list" aria-label="C4 Views">${order.map((viewId) => {
    const view = model.views[viewId];
    return `<button type="button" data-view-id="${viewId}"${state.currentView === viewId ? ' aria-current="page"' : ""}>
      <span>L${view.level}</span><strong>${escapeHTML(VIEW_LABELS[viewId])}</strong><small>${escapeHTML(view.scopeName)}</small>
    </button>`;
  }).join("")}</nav>`;
}

function buildLayersMarkup(view, state) {
  const boundaries = view.boundaries.map((boundary) => `<li><span>${escapeHTML(boundary.name)}</span><small>[${escapeHTML(boundary.type)}]</small></li>`).join("");
  const nodes = view.nodes.map((node) => `<li><button type="button" data-node-id="${escapeHTML(node.id)}"${state.selectedNode === node.id ? ' aria-current="true"' : ""}>${escapeHTML(node.name)}<small>[${escapeHTML(node.type)}]</small></button></li>`).join("");
  const relationships = view.relationships.map((relationship) => `<li>${escapeHTML(relationship.description)}</li>`).join("");
  return `<div class="layer-groups">
    <section><h3>Boundaries</h3><ul>${boundaries}</ul></section>
    <section><h3>Elements</h3><ul>${nodes}</ul></section>
    <section><h3>Relationships</h3><ul>${relationships}</ul></section>
  </div>`;
}
```

The toolbar breadcrumb uses `getBreadcrumbs(currentView)` and includes panel toggles. On direct View navigation:

```js
function switchView(state, viewId) {
  if (!architectureModel.views[viewId]) return state;
  return {
    ...state,
    currentView: viewId,
    selectedNode: null,
    rightPanelOpen: false
  };
}
```

After rendering the new View, restore its saved viewport or call Fit when it has no saved viewport.

- [ ] **Step 4: Implement Inspector tabs and explicit drill-down**

`buildInspectorMarkup` renders four tabs and selects exact content from the model:

```js
const INSPECTOR_TABS = ["overview", "flow", "evidence", "model"];

function buildInspectorMarkup(model, state) {
  const view = model.views[state.currentView];
  const node = state.selectedNode ? getNodeById(model, state.currentView, state.selectedNode) : null;
  const tabs = INSPECTOR_TABS.map((tab) => `<button type="button" data-inspector-tab="${tab}"${state.inspectorTab === tab ? ' aria-selected="true"' : ""}>${tab}</button>`).join("");
  if (!node) return `<div class="inspector-tabs" role="tablist">${tabs}</div><p>요소를 선택해 책임과 근거를 확인하세요.</p>`;
  const incoming = view.relationships.filter((relationship) => relationship.to === node.id);
  const outgoing = view.relationships.filter((relationship) => relationship.from === node.id);
  const contents = {
    overview: `<h2>${escapeHTML(node.name)}</h2><p>[${escapeHTML(node.type)}${node.technology ? `: ${escapeHTML(node.technology)}` : ""}]</p><p>${escapeHTML(node.description)}</p>${node.drilldown ? `<button type="button" data-open-node-id="${escapeHTML(node.id)}">Open L${model.views[node.drilldown].level}</button>` : ""}`,
    flow: `<h2>Flow</h2>${[...incoming, ...outgoing].map((relationship) => `<p>${escapeHTML(relationship.description)}${relationship.technology ? `<small>[${escapeHTML(relationship.technology)}]</small>` : ""}</p>`).join("")}`,
    evidence: `<h2>Evidence</h2>${listMarkup(node.inputs)}${listMarkup(node.outputs)}<div>${node.evidence.map((path) => `<code>${escapeHTML(path)}</code>`).join("")}</div>`,
    model: `<h2>${escapeHTML(view.title)}</h2><p>${escapeHTML(view.scopeName)}</p><code>${escapeHTML(model.meta.analyzedCommit)}</code><code>${escapeHTML(model.meta.sourceRoot)}</code><ul>${validateModel(model).errors.map((error) => `<li>${escapeHTML(error)}</li>`).join("")}</ul>`
  };
  return `<div class="inspector-tabs" role="tablist">${tabs}</div><div role="tabpanel">${contents[state.inspectorTab]}</div>`;
}

function openDrilldown(model, state, nodeId) {
  const node = getNodeById(model, state.currentView, nodeId);
  if (!node?.drilldown || !model.views[node.drilldown]) return state;
  return {
    ...state,
    currentView: node.drilldown,
    selectedNode: null,
    rightPanelOpen: false,
    inspectorTab: "overview"
  };
}

function renderTopToolbar(view, state) {
  const breadcrumbs = getBreadcrumbs(state.currentView).map((viewId) =>
    `<button type="button" data-view-id="${viewId}">${escapeHTML(VIEW_LABELS[viewId])}</button>`
  ).join('<span aria-hidden="true">/</span>');
  document.getElementById("top-toolbar").innerHTML = `
    <button type="button" data-action="toggle-left-panel" aria-label="${state.leftPanelOpen ? "왼쪽 패널 닫기" : "왼쪽 패널 열기"}">Sidebar</button>
    <nav aria-label="현재 C4 위치">${breadcrumbs}</nav>
    <span class="view-scope">L${view.level} · ${escapeHTML(view.scopeName)}</span>
    <button type="button" data-action="toggle-right-panel" aria-label="${state.rightPanelOpen ? "인스펙터 닫기" : "인스펙터 열기"}">Inspector</button>`;
}

function renderCanvasTools(state) {
  const viewportState = state.viewports[state.currentView] ?? { x: 0, y: 0, scale: 1 };
  document.getElementById("canvas-tools").innerHTML = `
    <button type="button" data-tool="select" aria-pressed="${state.tool === "select"}" aria-label="선택 도구">Select</button>
    <button type="button" data-tool="hand" aria-pressed="${state.tool === "hand"}" aria-label="손 도구">Hand</button>
    <button type="button" data-action="fit-view" aria-label="전체 다이어그램 맞춤">Fit</button>
    <button type="button" data-action="zoom-out" aria-label="축소">−</button>
    <output id="zoom-value">${Math.round(viewportState.scale * 100)}%</output>
    <button type="button" data-action="zoom-in" aria-label="확대">+</button>`;
}

function updateWorkspace(action, openedPanel) {
  const reduced = reduceWorkspace(architectureModel, workspaceState, action);
  workspaceState = typeof normalizePanelsForWidth === "function"
    ? normalizePanelsForWidth(reduced, window.innerWidth, openedPanel)
    : reduced;
  renderWorkspace();
}

function bindRenderedControls() {
  document.querySelectorAll("[data-view-id]").forEach((button) => button.addEventListener("click", () => {
    workspaceState = switchView(workspaceState, button.dataset.viewId);
    renderWorkspace();
    ensureViewportForCurrentView();
  }));
  document.querySelectorAll("[data-node-id]").forEach((element) => {
    element.addEventListener("click", () => updateWorkspace({ type: "select-node", nodeId: element.dataset.nodeId }, "right"));
    element.addEventListener("dblclick", () => {
      workspaceState = openDrilldown(architectureModel, workspaceState, element.dataset.nodeId);
      renderWorkspace();
      ensureViewportForCurrentView();
    });
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      workspaceState = openDrilldown(architectureModel, workspaceState, element.dataset.nodeId);
      renderWorkspace();
      ensureViewportForCurrentView();
    });
  });
  document.querySelectorAll("[data-open-node-id]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    workspaceState = openDrilldown(architectureModel, workspaceState, button.dataset.openNodeId);
    renderWorkspace();
    ensureViewportForCurrentView();
  }));
  document.querySelectorAll("[data-left-tab]").forEach((button) => button.addEventListener("click", () => updateWorkspace({ type: "set-left-tab", tab: button.dataset.leftTab })));
  document.querySelectorAll("[data-inspector-tab]").forEach((button) => button.addEventListener("click", () => updateWorkspace({ type: "set-inspector-tab", tab: button.dataset.inspectorTab })));
  document.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => updateWorkspace({ type: "set-tool", tool: button.dataset.tool })));
  bindToolbarActions();
}

function renderWorkspace() {
  const view = architectureModel.views[workspaceState.currentView];
  const workspace = document.getElementById("workspace");
  workspace.dataset.leftOpen = String(workspaceState.leftPanelOpen);
  workspace.dataset.rightOpen = String(workspaceState.rightPanelOpen);
  workspace.dataset.tool = workspaceState.tool;

  document.getElementById("left-panel").innerHTML = `
    <div class="panel-tabs" role="tablist">
      <button type="button" data-left-tab="views" aria-selected="${workspaceState.leftTab === "views"}">Views</button>
      <button type="button" data-left-tab="layers" aria-selected="${workspaceState.leftTab === "layers"}">Layers</button>
    </div>
    ${workspaceState.leftTab === "views" ? buildViewsMarkup(architectureModel, workspaceState) : buildLayersMarkup(view, workspaceState)}`;

  document.getElementById("diagram-world").innerHTML = `
    <defs>${ARROW_MARKERS}</defs>
    <g class="boundary-layer">${view.boundaries.map(buildBoundaryMarkup).join("")}</g>
    <g class="relationship-layer">${view.relationships.map((relationship) => buildRelationshipMarkup(new Map(view.nodes.map((node) => [node.id, node])), relationship)).join("")}</g>
    <g class="node-layer">${view.nodes.map((node) => buildSvgNodeMarkup(
      node.drilldown && !architectureModel.views[node.drilldown] ? { ...node, drilldown: null } : node,
      node.id === workspaceState.selectedNode
    )).join("")}</g>`;

  const inspector = document.getElementById("right-inspector");
  inspector.hidden = !workspaceState.rightPanelOpen;
  inspector.innerHTML = buildInspectorMarkup(architectureModel, workspaceState);
  renderTopToolbar(view, workspaceState);
  renderCanvasTools(workspaceState);
  bindRenderedControls();
  applyViewportTransform(currentViewport());
  document.getElementById("fallback-summary").hidden = true;
}

renderWorkspace();
ensureViewportForCurrentView();
bindViewportInteractions();
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") updateWorkspace({ type: "clear-selection" });
});
```

Tab contents:

- Overview: name, explicit C4 type, technology, responsibility, status, Open L2/L3 button
- Flow: incoming and outgoing relationships for the selected node, with source/target names and technology
- Evidence: inputs, outputs, evidence paths
- Model: View title/scope, analyzed commit, source root, validation errors

Bind single click to selection, double click to `openDrilldown`, Enter on a selected drillable SVG node to `openDrilldown`, and Escape to clear selection and close the Inspector.

- [ ] **Step 5: Run tests, verify selection flow, and commit**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS.

Browser checks:

- single click never changes C4 View
- node selection opens the correct Inspector
- double click, Open button, and Enter drill down
- Views tab jumps directly to each View
- Layers selection focuses the same canvas node
- Escape clears selection

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: add C4 views layers and inspector"
```

---

### Task 7: Apply Mac-like Responsive, Motion, and Accessibility Polish

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-460`
- Modify: `rhythmtrainer-c4-explorer.html:1-1068`

**Interfaces:**
- Consumes: all workspace chrome and interaction states from Tasks 2-6.
- Produces: `normalizePanelsForWidth(state, width, openedPanel): WorkspaceState`, CSS states for desktop, overlay, compact side sheets, reduced preferences, focus visibility, and keyboard-accessible control labels.

- [ ] **Step 1: Write failing static accessibility and preference tests**

Add:

```js
test("declares desktop workspace accessibility and user preference fallbacks", () => {
  assert.match(html, /aria-label="왼쪽 패널 열기|aria-label="왼쪽 패널 닫기/);
  assert.match(html, /aria-label="인스펙터 열기|aria-label="인스펙터 닫기/);
  assert.match(html, /aria-label="캔버스 도구"/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(html, /@media \(prefers-contrast: more\)/);
  assert.match(html, /:focus-visible/);
  assert.match(html, /@media \(max-width: 1199px\)/);
  assert.match(html, /@media \(max-width: 799px\)/);
});

test("keeps one overlay panel open at compact desktop widths", () => {
  const { api } = explorerRuntime();
  const state = { ...api.createWorkspaceState(), leftPanelOpen: true, rightPanelOpen: true };
  const compact = api.normalizePanelsForWidth(state, 1024, "right");
  assert.equal(compact.leftPanelOpen, false);
  assert.equal(compact.rightPanelOpen, true);
  const desktop = api.normalizePanelsForWidth(state, 1440, "right");
  assert.equal(desktop.leftPanelOpen, true);
  assert.equal(desktop.rightPanelOpen, true);
});
```

- [ ] **Step 2: Run the preference test and verify it fails**

Run:

```bash
node --test --test-name-pattern="preference fallbacks" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL until all media queries and labels exist.

- [ ] **Step 3: Finish desktop visual hierarchy and panel behavior**

Use deliberate tokens instead of one-off spacing:

```css
:root {
  --sidebar-left: 17.5rem;
  --sidebar-right: 21rem;
  --chrome-radius: 0.875rem;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  font: 100%/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Make canvas background neutral with a subtle dot grid. Give sidebars structural, slightly heavier material; keep floating toolbars lighter. Avoid hero gradients, large marketing headings, decorative glows, and stacked cards.

Panel transitions must use transform and opacity, remain interruptible, and return through the same edge. Pointer-down feedback should appear immediately on toolbar buttons.

- [ ] **Step 4: Add responsive and accessibility modes**

- At `max-width: 1199px`, render side panels as canvas overlays and close the opposite panel when one opens.
- At `max-width: 799px`, keep the canvas active and present panels as edge sheets; do not replace the diagram with a card list.
- Use a visible focus ring that is not color-only.
- Keep all control hit targets at least 44×44 CSS px in compact mode.
- For reduced motion, replace panel slides and selection transitions with a short opacity change or no transition.
- For reduced transparency, use solid sidebar and toolbar surfaces.
- For increased contrast, use solid surfaces, stronger boundaries, and clearly visible focus outlines.
- Ensure SVG text remains selectable only when appropriate; dragging the canvas must not accidentally select node labels.

Implement the layout and preference rules explicitly:

```css
@media (max-width: 1199px) {
  .workspace-shell { grid-template-columns: minmax(0, 1fr); }
  .side-panel { position: fixed; top: 0; bottom: 0; z-index: 20; width: min(22rem, 88vw); }
  .left-panel { left: 0; transform: translateX(-100%); }
  .right-inspector { right: 0; transform: translateX(100%); }
  .workspace-shell[data-left-open="true"] .left-panel,
  .workspace-shell[data-right-open="true"] .right-inspector { transform: translateX(0); }
}

@media (max-width: 799px) {
  .side-panel { width: min(20rem, calc(100vw - 2rem)); }
  .top-toolbar { inset-inline: 0.75rem; top: 0.75rem; }
  .canvas-tools { bottom: 0.75rem; min-height: 2.75rem; }
  .top-toolbar button, .canvas-tools button { min-width: 2.75rem; min-height: 2.75rem; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition-duration: 0.001ms !important; }
}

@media (prefers-reduced-transparency: reduce) {
  .side-panel, .top-toolbar, .canvas-tools { background: var(--surface-solid); backdrop-filter: none; }
}

@media (prefers-contrast: more) {
  .side-panel, .top-toolbar, .canvas-tools { background: Canvas; border: 2px solid CanvasText; }
  .diagram-node:focus-visible { outline: 4px solid Highlight; outline-offset: 4px; }
}
```

Apply the one-panel rule through state rather than CSS alone:

```js
function normalizePanelsForWidth(state, width, openedPanel) {
  if (width > 1199 || !(state.leftPanelOpen && state.rightPanelOpen)) return state;
  return openedPanel === "left"
    ? { ...state, leftPanelOpen: true, rightPanelOpen: false }
    : { ...state, leftPanelOpen: false, rightPanelOpen: true };
}

function setPanelState(nextState, openedPanel) {
  workspaceState = normalizePanelsForWidth(nextState, window.innerWidth, openedPanel);
  renderWorkspace();
}
```

- [ ] **Step 5: Run tests, test keyboard and preference emulation, and commit**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS.

Verify at 1440×900, 1024×768, and 390×844. Emulate reduced motion, reduced transparency where supported, and increased contrast. Tab through both panels, toolbar, SVG nodes, and Inspector without focus loss.

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "style: polish C4 desktop workspace"
```

---

### Task 8: Complete Integration and Visual Verification

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs:1-500`
- Modify if verification finds a scoped defect: `rhythmtrainer-c4-explorer.html:1-1068`
- Create untracked evidence: `output/playwright/diagram-first-*.png`

**Interfaces:**
- Consumes: the complete offline workspace from Tasks 1-7.
- Produces: a passing regression suite and browser evidence for all four Views and panel states.

- [ ] **Step 1: Add final artifact-contract tests**

Add:

```js
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
```

Keep the existing breadcrumb, Level 4 terminal, source evidence, and dangling relationship regression tests, updating their API names to the workspace reducer where necessary.

- [ ] **Step 2: Run all automated tests**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: all tests PASS with zero failures, skips, or cancellations.

- [ ] **Step 3: Start a local server and capture the visual matrix**

Serve the worktree on port 4173:

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/rhythmtrainer-c4-explorer.html` and capture:

- `diagram-first-context-initial.png`: 1440×900, left open/right closed
- `diagram-first-container-both-panels.png`: 1440×900, both panels open
- `diagram-first-iphone-canvas.png`: 1440×900, both panels closed
- `diagram-first-watch-inspector.png`: 1440×900, selected node and Inspector
- `diagram-first-overlay-1024.png`: 1024×768, one overlay panel
- `diagram-first-compact-390.png`: 390×844, canvas plus side sheet

For every screenshot, inspect node and label clipping, boundary membership, parallel arrow separation, toolbar overlap, and semantic silhouette recognition.

- [ ] **Step 4: Exercise complete interaction and console checks**

In the browser:

1. Verify initial left-open/right-closed L1 fit state.
2. Select the person and confirm the Inspector opens without changing View.
3. Select and open the RhythmTrainer system; verify L2.
4. Pan diagonally, zoom around a node, toggle both panels, and confirm the viewport is preserved.
5. Open iPhone L3 and Watch L3 through both canvas and Views navigation.
6. Verify every arrow has its description and applicable technology directly on the canvas.
7. Verify there are no R numbers or separate relationship summary.
8. Verify Level 3 nodes do not open Level 4.
9. Verify browser console has no errors and the network log has no failed or external requests.

- [ ] **Step 5: Apply only verification-driven fixes, rerun, and commit**

If a label overlaps, fix its model `waypoints` or `labelPosition`. If a node clips, adjust that View's coordinates or world size. If a control fails, add a focused regression test before the fix.

Rerun:

```bash
node --test tests/*.test.mjs
```

Expected: all tests PASS.

Confirm only intended source and test files are staged; leave `output/` untracked.

Commit:

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "test: verify diagram-first C4 workspace"
```

Final handoff must report the final test count, the four supported C4 Views, the gesture and shortcut set, the commit range, and the absolute path to the completed HTML artifact.
