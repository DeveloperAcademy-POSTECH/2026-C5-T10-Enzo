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

export { architectureModel, explorerRuntime, html, scriptBody };
