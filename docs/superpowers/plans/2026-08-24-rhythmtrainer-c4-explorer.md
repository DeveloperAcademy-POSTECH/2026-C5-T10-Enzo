# RhythmTrainer C4 Architecture Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained HTML explorer that presents the verified RhythmTrainer architecture as clickable C4 Level 1, Level 2, and Level 3 diagrams without exposing Level 4 code diagrams.

**Architecture:** A single HTML document embeds the architecture model as JSON and exposes pure model/navigation functions on `window.RhythmC4Explorer`. DOM rendering uses semantic buttons plus an SVG relationship layer, while an evidence panel shows source-backed component details without creating another hierarchy level.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, inline SVG, Node.js built-in test runner, Playwright CLI

**Spec:** `docs/superpowers/specs/2026-08-24-rhythmtrainer-c4-explorer-design.md`

## Global Constraints

- Create the production artifact only at `rhythmtrainer-c4-explorer.html` in the C5 workspace.
- Treat `/Users/yang-eunseo/Downloads/C4_즐/2026-C4-T11` as read-only.
- Keep the artifact self-contained: no CDN, `fetch`, XHR, WebSocket, remote fonts, or external scripts.
- Model only C4 Level 1, Level 2, and Level 3; Level 4 is an explicitly omitted endpoint.
- Show only source-verified systems, containers, components, and relationships.
- Mark `Persistence Repository` as implemented but not wired; never render it as an active runtime relationship.
- Preserve unrelated dirty files in the main checkout.
- Support keyboard navigation, `aria-live`, `aria-current`, `aria-pressed`, reduced motion, and widths down to 320px.

---

### Task 1: Architecture model and pure navigation contract

**Files:**
- Create: `tests/rhythmtrainer-c4-explorer.test.mjs`
- Create: `rhythmtrainer-c4-explorer.html`

**Interfaces:**
- Consumes: the approved C4 node and relationship tables from the spec.
- Produces: embedded JSON at `#architecture-model` and `window.RhythmC4Explorer` with `validateModel(model)`, `getParentViewId(viewId)`, `getBreadcrumbs(viewId)`, and `getNodeById(model, viewId, nodeId)`.

- [ ] **Step 1: Write the failing existence and schema tests**

Create `tests/rhythmtrainer-c4-explorer.test.mjs` with Node built-ins. The first tests must load a missing artifact as an empty string so the failure is an assertion, not a module-load error:

```js
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
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test --test-name-pattern="creates|defines|keeps" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because `rhythmtrainer-c4-explorer.html` does not exist.

- [ ] **Step 3: Create the minimal HTML model and pure functions**

Create the HTML shell with `<script id="architecture-model" type="application/json">`. Use these exact view/node IDs:

```text
context: learner, rhythm-system, file-store
containers: file-store, iphone-app, watch-app
iphone-components: iphone-ui, app-flow, audio-io, beat-adapter,
                   beatthis-engine, phone-connectivity, result-scoring, persistence
watch-components: watch-ui, watch-connectivity, motion-capture, swing-detector,
                  rhythm-judge, beat-matcher, rhythm-coach, background-runtime
```

Each node must contain `id`, `name`, `type`, `technology`, `description`, `status`, `evidence`, `inputs`, `outputs`, `x`, `y`, `w`, and `h`. Only `rhythm-system`, `iphone-app`, and `watch-app` receive a `drilldown` value. Use the relationship directions and labels exactly as defined in the spec.

Expose these pure functions from `<script id="explorer-logic" type="text/javascript">`:

```js
function getParentViewId(viewId) {
  return ({ containers: "context", "iphone-components": "containers", "watch-components": "containers" })[viewId] ?? null;
}

function getBreadcrumbs(viewId) {
  const chain = [];
  let cursor = viewId;
  while (cursor) {
    chain.unshift(cursor);
    cursor = getParentViewId(cursor);
  }
  return chain;
}

function getNodeById(model, viewId, nodeId) {
  return model.views[viewId]?.nodes.find((node) => node.id === nodeId) ?? null;
}

function validateModel(model) {
  const errors = [];
  for (const [viewId, view] of Object.entries(model.views ?? {})) {
    const ids = new Set((view.nodes ?? []).map((node) => node.id));
    for (const relationship of view.relationships ?? []) {
      if (!ids.has(relationship.from)) errors.push(`${viewId}:${relationship.id}:missing-source`);
      if (!ids.has(relationship.to)) errors.push(`${viewId}:${relationship.id}:missing-target`);
    }
    if (view.level === 3 && view.nodes.some((node) => node.drilldown)) {
      errors.push(`${viewId}:unexpected-level4-drilldown`);
    }
  }
  return { valid: errors.length === 0, errors };
}

window.RhythmC4Explorer = { validateModel, getParentViewId, getBreadcrumbs, getNodeById };
```

Guard DOM initialization with `if (typeof document !== "undefined")` so the pure functions can run under Node `vm`.

- [ ] **Step 4: Extend tests for pure behavior and verify GREEN**

Append a test that extracts `#explorer-logic`, evaluates it with `vm.runInNewContext`, validates the real model, then mutates a relationship endpoint and confirms validation fails:

```js
test("exports navigation helpers and rejects dangling relationships", () => {
  const source = scriptBody("explorer-logic", "text/javascript");
  const context = { window: {}, console };
  vm.runInNewContext(source, context);
  const api = context.window.RhythmC4Explorer;
  const model = architectureModel();
  assert.equal(api.validateModel(model).valid, true);
  assert.deepEqual(Array.from(api.getBreadcrumbs("watch-components")), [
    "context", "containers", "watch-components"
  ]);
  const broken = structuredClone(model);
  broken.views.context.relationships[0].to = "missing-node";
  assert.equal(api.validateModel(broken).valid, false);
});
```

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS with 4 tests and 0 failures.

- [ ] **Step 5: Commit the model contract**

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: add RhythmTrainer C4 architecture model"
```

### Task 2: Click navigation, diagram rendering, and evidence panel

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs`
- Modify: `rhythmtrainer-c4-explorer.html`

**Interfaces:**
- Consumes: Task 1 model and navigation helpers.
- Produces: `navigateTo(viewId)`, `navigateUp()`, `selectNode(nodeId)`, `renderDiagram(viewId)`, `renderEvidence(nodeId)`, and `drawRelationships(view)`.

- [ ] **Step 1: Write failing semantic interaction tests**

Append tests that assert the exact DOM hooks and accessibility contract:

```js
test("provides semantic navigation and evidence regions", () => {
  assert.match(html, /<nav[^>]+aria-label="C4 수준 탐색"/);
  assert.match(html, /id="back-button"/);
  assert.match(html, /id="diagram-nodes"/);
  assert.match(html, /id="relationship-layer"/);
  assert.match(html, /id="evidence-panel"[^>]+aria-live="polite"/);
});

test("implements the approved interaction functions", () => {
  const source = scriptBody("explorer-logic", "text/javascript");
  for (const name of ["navigateTo", "navigateUp", "selectNode", "renderDiagram", "renderEvidence", "drawRelationships"]) {
    assert.match(source, new RegExp(`function\\s+${name}\\s*\\(`));
  }
});
```

- [ ] **Step 2: Run new tests and verify RED**

Run:

```bash
node --test --test-name-pattern="semantic|interaction" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL because the semantic regions and render functions do not exist.

- [ ] **Step 3: Implement semantic rendering and interaction**

Add a header, breadcrumb buttons, level rail, back button, title/description, diagram stage, SVG relationship layer, node layer, legend, and evidence panel. `renderDiagram(viewId)` must:

1. Update `navigationState.currentView`.
2. Render one real `<button class="diagram-node">` per node.
3. Set `aria-pressed` from `navigationState.selectedNode`.
4. Navigate when the node has `drilldown`; otherwise call `selectNode(node.id)`.
5. Call `drawRelationships(view)` after node layout.
6. Update breadcrumb, level rail, title, description, and evidence panel.

`drawRelationships(view)` must draw arrowed SVG paths and separate readable label groups. Relationships with `status: "gap"` use a dashed path and include `구현됨 · 미배선` in the visible label.

`renderEvidence(nodeId)` must show the selected node's kind, technology, description, input list, output list, evidence file list, and status note. At Level 1 and Level 2, the default evidence panel explains how to click deeper. At Level 3, the first component is selected by default.

- [ ] **Step 4: Run all Node tests and verify GREEN**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: PASS with 6 tests and 0 failures.

- [ ] **Step 5: Verify the two browser drill-down paths**

Start a local server in the isolated worktree:

```bash
python3 -m http.server 4173
```

Using the Playwright CLI wrapper, open `http://127.0.0.1:4173/rhythmtrainer-c4-explorer.html`, take a snapshot, click `엇박 리듬 훈련 시스템`, then `RhythmTrainer iPhone App`, select `BeatThis Native Engine`, and confirm its evidence files are visible. Navigate back to Level 2, enter `RhythmTrainer Watch App`, select `Rhythm Coach`, and confirm `3연속 이탈` and `2연속 정확` are visible. Confirm the browser console has no errors.

- [ ] **Step 6: Commit the interactive explorer**

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: add C4 drill-down navigation"
```

### Task 3: C4 visual system, responsive layout, and final verification

**Files:**
- Modify: `tests/rhythmtrainer-c4-explorer.test.mjs`
- Modify: `rhythmtrainer-c4-explorer.html`

**Interfaces:**
- Consumes: Task 2 semantic diagram and interaction functions.
- Produces: complete C4 styling, responsive layouts, status legend, reduced-motion handling, and verified final artifact.

- [ ] **Step 1: Write failing self-contained and responsive contract tests**

Append:

```js
test("is self-contained and encodes the visual states accessibly", () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href=/i);
  assert.doesNotMatch(html, /\bfetch\s*\(/);
  assert.match(html, /@media\s*\(max-width:\s*760px\)/);
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(html, /\.diagram-node\.status-gap/);
  assert.match(html, /\.relationship-path\.status-gap/);
});

test("documents source provenance and the deliberate Level 4 boundary", () => {
  assert.match(html, /bff9f2a6b38fe50e5f4f65c91ef95da402bd928f/);
  assert.match(html, /Level 4 코드 다이어그램은 의도적으로 제외/);
  assert.match(html, /PracticeSessionStore\.swift/);
  assert.match(html, /구현됨 · 미배선/);
});
```

- [ ] **Step 2: Run new tests and verify RED**

Run:

```bash
node --test --test-name-pattern="self-contained|provenance" tests/rhythmtrainer-c4-explorer.test.mjs
```

Expected: FAIL until final styling and provenance content are present.

- [ ] **Step 3: Implement final C4 styling and responsive behavior**

Use a restrained C4 palette: navy person nodes, blue internal nodes, gray external nodes, amber gap nodes. Pair every color with visible type/status text. Give nodes a clear hierarchy (`name`, `[type · technology]`, description), relationship arrows neutral strokes, and gap relationships dashed amber strokes.

Desktop layout uses a diagram/evidence split. At 760px and below, stack evidence under the diagram, switch relationship labels to compact text, and render nodes in document flow so no content requires horizontal scrolling. Keep all text at 12px or larger and preserve browser focus outlines. Add a footer with source root, analyzed commit, scope exclusions, and the deliberate Level 4 boundary.

- [ ] **Step 4: Run the complete automated suite and verify GREEN**

Run:

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
node --test tests/*.test.mjs
```

Expected: the new explorer tests pass and all pre-existing workspace tests remain green.

- [ ] **Step 5: Run desktop and mobile browser verification**

With the local server still running, use Playwright CLI to:

1. Capture Level 1 at desktop width around 1440px.
2. Traverse and capture iPhone Level 3.
3. Traverse and capture Watch Level 3.
4. Resize to 390px width, revisit all three levels, and capture the mobile view.
5. Confirm no node, arrow label, breadcrumb, or evidence content overlaps or clips.
6. Confirm keyboard focus can activate all drill-down nodes and Level 3 evidence nodes.
7. Confirm no console errors and no network requests except the local HTML document.

- [ ] **Step 6: Reconcile the result against the specification**

Read all 12 verification criteria in the spec and record an explicit pass/fail result for each. If any criterion fails, add a focused failing regression test before changing production HTML.

- [ ] **Step 7: Commit the verified visual artifact**

```bash
git add rhythmtrainer-c4-explorer.html tests/rhythmtrainer-c4-explorer.test.mjs
git commit -m "feat: finish RhythmTrainer C4 explorer"
```

- [ ] **Step 8: Integrate only the explorer commits into the main checkout**

Use the finishing-branch workflow. Preserve unrelated `index.html`, `structure-explorer.js`, existing tests, notes, and untracked specifications. After integration, verify that the main checkout contains the new HTML and test file and that unrelated status entries are unchanged.
