import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportStructurizrDsl } from "../scripts/export-structurizr-dsl.mjs";
import { layoutC4Model } from "../scripts/layout-c4-model.mjs";
import { normalizeC4Model } from "../scripts/normalize-c4-model.mjs";
import * as validator from "../scripts/validate-c4-output.mjs";

const { runValidateCli, validateC4Output } = validator;

const evidence = [{ file: "Fixture.swift", line: 1, reason: "Fixture evidence" }];

function laidOutFixture() {
  const raw = {
    project: { name: "Atlas", description: "Maps work", language: "en" },
    elements: [
      { id: "user", type: "Person", name: "Planner", description: "Plans work", evidence, confidence: "confirmed" },
      { id: "system", type: "Software System", name: "Atlas", description: "Maps work", evidence, confidence: "confirmed" },
      { id: "phone", parentId: "system", type: "Container", name: "Desktop App", description: "Presents maps", technology: "SwiftUI", evidence, confidence: "confirmed" },
      { id: "store", parentId: "system", type: "Container", name: "Map Store", description: "Stores maps", technology: "SwiftData", visualRole: "data-store", evidence, confidence: "confirmed" },
      { id: "flow", parentId: "phone", type: "Component", name: "Map Flow", description: "Coordinates mapping", technology: "Swift", evidence, confidence: "confirmed" },
    ],
    relationships: [
      { id: "uses-system", from: "user", to: "system", description: "Plans work", evidence, confidence: "confirmed" },
      { id: "uses-phone", from: "user", to: "phone", description: "Edits a map", evidence, confidence: "confirmed" },
      { id: "saves", from: "phone", to: "store", description: "Saves maps", technology: "SwiftData", evidence, confidence: "confirmed" },
      { id: "uses-flow", from: "user", to: "flow", description: "Controls mapping", evidence, confidence: "confirmed" },
    ],
  };
  return JSON.parse(JSON.stringify(layoutC4Model(normalizeC4Model(raw, {}).model)));
}

function validHtmlFor(model) {
  return `<!doctype html><html><head><style>
    :focus-visible {}
    @media (prefers-reduced-motion: reduce) {}
    @media (prefers-contrast: more) {}
  </style></head><body>
    <main id="diagram-viewport"></main>
    <button id="left-panel-close"></button>
    <button data-action="fit-view"></button>
    <button data-tool="hand"></button>
    <button data-relationship-mode="focus"></button>
    <div aria-live="polite"></div>
    <div class="relationship is-emphasized is-ambient is-muted">labelVisible</div>
    <script id="architecture-model" type="application/json">${JSON.stringify(model).replaceAll("<", "\\u003c")}</script>
    <script>window.C4Explorer = {};</script>
  </body></html>`;
}

function layoutFor(model, level, relationshipId) {
  return model.views.find((view) => view.level === level)
    .relationshipLayouts.find((layout) => layout.relationshipId === relationshipId);
}

test("accepts generated version 2 relationship geometry", async () => {
  const model = laidOutFixture();
  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.deepEqual(report.errors, []);
  assert.equal(typeof validator.inspectViewGeometry, "function");
  assert.ok(model.views.every((view) => validator.inspectViewGeometry(model, view).errors.length === 0));
});

test("rejects a generated label that overlaps a node", async () => {
  const model = laidOutFixture();
  const view = model.views.find(({ level }) => level === 2);
  const node = view.nodes.find(({ elementId }) => elementId === "phone");
  layoutFor(model, 2, "uses-phone").label = { x: node.x, y: node.y, width: node.w, height: 80 };

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-label-node-overlap"));
});

test("rejects HTML whose embedded geometry differs from c4-model.json", async () => {
  const model = laidOutFixture();
  const changed = structuredClone(model);
  changed.views[0].relationshipLayouts[0].vertices[0].x += 1;

  const report = await validateC4Output({ model, html: validHtmlFor(changed) });

  assert.ok(report.errors.some(({ code }) => code === "embedded-model-geometry-mismatch"));
});

test("ignores unrelated semantic metadata in the embedded geometry comparison", async () => {
  const model = laidOutFixture();
  const changed = structuredClone(model);
  changed.project.description = "A semantically revised description";
  changed.elements[0].description = "A revised element description";
  changed.relationships[0].description = "A revised relationship description";

  const report = await validateC4Output({ model, html: validHtmlFor(changed) });

  assert.equal(report.errors.some(({ code }) => code === "embedded-model-geometry-mismatch"), false);
});

test("rejects a relationship path through an unrelated node", async () => {
  const model = laidOutFixture();
  const view = model.views.find(({ level }) => level === 2);
  const layout = layoutFor(model, 2, "uses-phone");
  const unrelated = view.nodes.find(({ elementId }) => elementId === "store");
  const source = layout.vertices[0];
  const target = layout.vertices.at(-1);
  const center = { x: unrelated.x + unrelated.w / 2, y: unrelated.y + unrelated.h / 3 };
  layout.vertices = [source, { x: center.x, y: source.y }, center, { x: target.x, y: center.y }, target];

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(
    report.errors.some(({ code }) => code === "geometry-path-node-traversal"),
    JSON.stringify({ vertices: layout.vertices, unrelated, errors: report.errors }, null, 2),
  );
});

test("rejects overlapping labels in full and directly connected focus states", async () => {
  const model = laidOutFixture();
  const first = layoutFor(model, 2, "uses-phone");
  const second = layoutFor(model, 2, "saves");
  second.label = { ...first.label };

  const inspection = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(inspection.errors.some(({ code, state }) => code === "geometry-label-label-overlap" && state === "full"));
  assert.ok(inspection.errors.some(({ code, state, selectedNodeId }) =>
    code === "geometry-label-label-overlap" && state === "focus" && selectedNodeId === "phone"));
});

test("rejects identical lanes for distinct same-direction relationships", async () => {
  const model = laidOutFixture();
  const relationship = model.relationships.find(({ id }) => id === "uses-phone");
  model.relationships.push({
    ...structuredClone(relationship),
    id: "uses-phone-again",
    description: "Reviews the map on the desktop",
  });
  const view = model.views.find(({ level }) => level === 2);
  const layout = layoutFor(model, 2, "uses-phone");
  view.relationshipIds.push("uses-phone-again");
  view.relationshipLayouts.push({ ...structuredClone(layout), relationshipId: "uses-phone-again" });

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-lane-collision"));
});

test("validation CLI requires and rejects a semantically corrupted workspace DSL", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-validate-cli-"));
  const model = laidOutFixture();
  const modelPath = path.join(directory, "c4-model.json");
  const htmlPath = path.join(directory, "explorer.html");
  const reportPath = path.join(directory, "validation-report.json");
  const dslPath = path.join(directory, "workspace.dsl");
  await fs.writeFile(modelPath, JSON.stringify(model));
  await fs.writeFile(htmlPath, validHtmlFor(model));
  await fs.writeFile(dslPath, exportStructurizrDsl(model).replace(/softwareSystem/, "container"));
  const errors = [];

  assert.equal(await runValidateCli([modelPath, htmlPath, reportPath], { error: (message) => errors.push(message) }), 2);
  assert.match(errors.at(-1), /workspace-dsl/i);
  assert.equal(await runValidateCli([modelPath, htmlPath, reportPath, dslPath], { error() {} }), 1);
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  assert.equal(report.checks.dslParity, false);
  assert.ok(report.errors.some(({ code }) => code === "workspace-dsl-semantic-mismatch"));
});

test("validation CLI preserves authoritative repairs and warnings during revalidation", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-validate-repairs-"));
  const model = laidOutFixture();
  const modelPath = path.join(directory, "c4-model.json");
  const htmlPath = path.join(directory, "explorer.html");
  const reportPath = path.join(directory, "validation-report.json");
  const dslPath = path.join(directory, "workspace.dsl");
  const repair = { code: "relationship-duplicate-merged", message: "Merged duplicate evidence." };
  const sourceWarning = { code: "source-parse-warning", message: "One source file was partially parsed." };
  await fs.writeFile(modelPath, JSON.stringify(model));
  await fs.writeFile(htmlPath, validHtmlFor(model));
  await fs.writeFile(dslPath, exportStructurizrDsl(model));
  await fs.writeFile(reportPath, JSON.stringify({ repairs: [repair], warnings: [sourceWarning] }));

  assert.equal(await runValidateCli([modelPath, htmlPath, reportPath, dslPath], { error() {} }), 0);
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  assert.deepEqual(report.repairs, [repair]);
  assert.ok(report.warnings.some(({ code }) => code === sourceWarning.code));
  assert.equal(report.checks.dslParity, true);
});

test("rejects a zero-length relationship segment", async () => {
  const model = laidOutFixture();
  const layout = layoutFor(model, 2, "uses-phone");
  layout.vertices.splice(1, 0, { ...layout.vertices[0] });

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-invalid"));
});

test("rejects a duplicated positive-length relationship segment", async () => {
  const model = laidOutFixture();
  const layout = layoutFor(model, 2, "uses-phone");
  const [source, target] = layout.vertices;
  layout.vertices.splice(2, 0, { ...source }, { ...target });

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-positive-retrace"));
});

test("rejects a partially overlapping positive-length relationship retrace", async () => {
  const model = laidOutFixture();
  const layout = layoutFor(model, 2, "uses-phone");
  const source = layout.vertices[0];
  const target = layout.vertices.at(-1);
  const railX = source.x + 160;
  layout.vertices = [
    source,
    { x: source.x + 100, y: source.y },
    { x: source.x + 40, y: source.y },
    { x: railX, y: source.y },
    { x: railX, y: target.y },
    target,
  ];

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-positive-retrace"));
});

test("rejects a non-orthogonal relationship path", async () => {
  const model = laidOutFixture();
  const layout = layoutFor(model, 2, "uses-phone");
  layout.vertices[1] = { x: layout.vertices[0].x + 1, y: layout.vertices[0].y + 1 };

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-invalid"));
});

test("rejects an unknown relationship port", async () => {
  const model = laidOutFixture();
  layoutFor(model, 2, "uses-phone").sourcePort = "center";

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-invalid"));
});

test("rejects a path endpoint detached from its declared port", async () => {
  const model = laidOutFixture();
  layoutFor(model, 2, "uses-phone").vertices[0].x += 1;

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-invalid"));
});

test("rejects a declared port hint moved inside its node", async () => {
  const model = laidOutFixture();
  const view = model.views.find(({ level }) => level === 2);
  const layout = layoutFor(model, 2, "uses-phone");
  const sourceNode = view.nodes.find(({ elementId }) => elementId === "user");
  sourceNode.portHints[layout.sourcePort].x -= 10;
  layout.vertices[0].x -= 10;

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-invalid"));
});

test("rejects non-finite relationship path vertices", async () => {
  const model = laidOutFixture();
  layoutFor(model, 2, "uses-phone").vertices[1].x = Number.NaN;

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-path-invalid"));
});

test("rejects a relationship label outside the SVG world", async () => {
  const model = laidOutFixture();
  const view = model.views.find(({ level }) => level === 2);
  const layout = layoutFor(model, 2, "uses-phone");
  layout.label.x = view.worldSize.width + layout.label.width;

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-label-outside-world"));
});

test("rejects nonnumeric world bounds without numeric coercion", async () => {
  const model = laidOutFixture();
  model.views[0].worldSize.width = "Infinity";

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-world-invalid"));
  assert.equal(report.checks.geometry, false);
});

test("rejects nonnumeric boundary bounds before containment", async () => {
  const model = laidOutFixture();
  model.views.find(({ level }) => level === 2).boundaries[0].w = "Infinity";

  const report = await validateC4Output({ model, html: validHtmlFor(model) });

  assert.ok(report.errors.some(({ code }) => code === "geometry-boundary-invalid"));
  assert.equal(report.checks.geometry, false);
});

test("compares every projected view geometry field", async () => {
  const mutations = [
    (model) => { model.views[0].nodes[0].x += 1; },
    (model) => { model.views.find(({ level }) => level === 2).boundaries[0].w += 1; },
    (model) => { model.views[0].worldSize.width += 1; },
    (model) => { model.views[0].layoutConfiguration.rankSeparation += 1; },
    (model) => { model.views[0].relationshipLayouts[0].geometryVersion += 1; },
  ];

  for (const mutate of mutations) {
    const model = laidOutFixture();
    const changed = structuredClone(model);
    mutate(changed);
    const report = await validateC4Output({ model, html: validHtmlFor(changed) });
    assert.ok(report.errors.some(({ code }) => code === "embedded-model-geometry-mismatch"));
  }
});
