import test from "node:test";
import assert from "node:assert/strict";
import { layoutC4Model } from "../scripts/layout-c4-model.mjs";
import { normalizeC4Model } from "../scripts/normalize-c4-model.mjs";
import {
  exportStructurizrDsl,
  extractDslIdentifiers,
  quoteDsl,
  tokenizeStructurizrDsl,
} from "../scripts/export-structurizr-dsl.mjs";
import { validateC4Output } from "../scripts/validate-c4-output.mjs";

const evidence = [{ file: "Fixture.swift", line: 1, reason: "Fixture evidence" }];

function laidOutFixture({ hyphenated = false } = {}) {
  const id = (simple, compound) => hyphenated ? compound : simple;
  const user = id("user", "practice-user");
  const system = id("system", "tempo-coach");
  const files = id("files", "user-files");
  const phone = id("phone", "iphone-app");
  const store = id("store", "practice-store");
  const coordinator = id("coordinator", "practice-coordinator");
  const raw = {
    project: { name: "TempoCoach", description: "Coaches rhythm", language: "en" },
    elements: [
      { id: user, type: "Person", name: "Learner", description: "Practises rhythm", evidence, confidence: "confirmed" },
      { id: system, type: "Software System", name: "TempoCoach", description: "Coordinates practice", evidence, confidence: "confirmed" },
      { id: files, type: "Software System", external: true, name: "User Files", description: "Provides selected audio", evidence, confidence: "confirmed" },
      { id: phone, parentId: system, type: "Container", name: "iPhone App", description: "Runs practice", technology: "SwiftUI", evidence, confidence: "confirmed" },
      { id: store, parentId: system, type: "Container", name: "Practice Store", description: "Stores sessions", technology: "SwiftData", visualRole: "data-store", evidence, confidence: "confirmed" },
      { id: coordinator, parentId: phone, type: "Component", name: "Practice Coordinator", description: "Coordinates practice", technology: "Swift", evidence, confidence: "confirmed" },
    ],
    relationships: [
      { id: "uses-system", from: user, to: system, description: "Practises rhythm", evidence, confidence: "confirmed" },
      { id: "reads-files", from: system, to: files, description: "Reads selected audio", evidence, confidence: "confirmed" },
      { id: "uses-phone", from: user, to: phone, description: "Starts practice", evidence, confidence: "confirmed" },
      { id: "saves-session", from: phone, to: store, description: "Saves sessions", technology: "SwiftData", evidence, confidence: "confirmed" },
      { id: "uses-coordinator", from: user, to: coordinator, description: "Controls practice", evidence, confidence: "confirmed" },
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

function expectedSemantics(model) {
  const kind = { 1: "systemContext", 2: "container", 3: "component" };
  return {
    workspace: {
      name: model.project.name,
      description: model.project.description,
    },
    elements: model.elements.map((element) => ({
      id: element.id,
      type: element.type,
      parentId: element.parentId ?? null,
      name: element.name,
      description: element.description,
      technology: element.technology ?? "",
      tags: [...element.tags].sort(),
    })).sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0),
    relationships: model.relationships
      .map(({ from, to, description, technology = "" }) => JSON.stringify([from, to, description, technology]))
      .sort(),
    views: model.views.map((view) => ({
      id: view.id,
      level: view.level,
      kind: kind[view.level],
      scopeId: view.scopeId,
      description: view.description,
      elementIds: [...view.elementIds].sort(),
    })).sort((first, second) => first.id < second.id ? -1 : first.id > second.id ? 1 : 0),
  };
}

test("exports deterministic valid Structurizr DSL with L1 L2 and L3 views", () => {
  const model = laidOutFixture();
  model.views[0].layoutConfiguration = {
    direction: "RightLeft",
    rankSeparation: 223,
    nodeSeparation: 117,
    relationshipSeparation: 41,
  };

  const first = exportStructurizrDsl(model);
  const second = exportStructurizrDsl(model);

  assert.equal(first, second);
  assert.match(first, /^workspace "TempoCoach" "Coaches rhythm"/);
  assert.match(first, /^\s*c4id_[0-9a-f]+ = person /m);
  assert.match(first, /^\s*c4id_[0-9a-f]+ = softwareSystem /m);
  assert.match(first, /^\s*c4id_[0-9a-f]+ = container /m);
  assert.match(first, /^\s*c4id_[0-9a-f]+ = component /m);
  assert.match(first, /^\s*systemContext c4id_[0-9a-f]+ c4id_[0-9a-f]+/m);
  assert.match(first, /^\s*container c4id_[0-9a-f]+ c4id_[0-9a-f]+/m);
  assert.match(first, /^\s*component c4id_[0-9a-f]+ c4id_[0-9a-f]+/m);
  assert.match(first, /^\s*autoLayout rl 223 117$/m);
  assert.match(first, /^\s*c4id_70686f6e65 = container "iPhone App" "Runs practice" "SwiftUI" "Container,Element,application-container"/m);
  assert.equal((first.match(/\s->\s/g) ?? []).length, model.relationships.length);
  assert.deepEqual(
    [...first.matchAll(/^\s*element ("(?:\\.|[^"])*") \{/gm)].map((match) => JSON.parse(match[1])),
    ["Component", "Container", "Person", "Software System", "application-container", "component", "data-store", "external-system", "person", "software-system"],
  );
  assert.doesNotMatch(first, /codeView|dynamic|deployment|image\s/);
});

test("quotes DSL metadata without leaking line breaks or delimiters", () => {
  assert.equal(quoteDsl('A "quoted"\\path\nnext\rline'), '"A \\"quoted\\"\\path next line"');
});

test("quotes and tokenizes metadata with the current Structurizr escape semantics", () => {
  const source = 'A "quoted" Windows path C:\\Temp\\file';

  assert.deepEqual(tokenizeStructurizrDsl(quoteDsl(source)), [source]);
  assert.deepEqual(tokenizeStructurizrDsl(quoteDsl("")), [""]);
});

test("round-trips canonical identifiers, relationship semantics, and view membership", () => {
  const model = laidOutFixture({ hyphenated: true });
  const dsl = exportStructurizrDsl(model);

  assert.match(dsl, /c4id_[0-9a-f]+ = softwareSystem/);
  assert.deepEqual(extractDslIdentifiers(dsl), expectedSemantics(model));
});

test("encodes every canonical ID in one reversible case-fold-safe namespace", () => {
  const model = laidOutFixture();
  const replacements = new Map([["user", "Foo"], ["system", "foo"], ["files", "c4id_466f6f"]]);
  for (const element of model.elements) {
    element.id = replacements.get(element.id) ?? element.id;
    if (element.parentId) element.parentId = replacements.get(element.parentId) ?? element.parentId;
  }
  for (const relationship of model.relationships) {
    relationship.from = replacements.get(relationship.from) ?? relationship.from;
    relationship.to = replacements.get(relationship.to) ?? relationship.to;
  }
  for (const view of model.views) {
    view.scopeId = replacements.get(view.scopeId) ?? view.scopeId;
    view.elementIds = view.elementIds.map((id) => replacements.get(id) ?? id);
  }

  const dsl = exportStructurizrDsl(model);
  const declared = [...dsl.matchAll(/^\s*(c4id_[0-9a-f]+)\s*=/gm)].map((match) => match[1]);

  assert.equal(declared.length, model.elements.length);
  assert.equal(new Set(declared.map((id) => id.toLowerCase())).size, model.elements.length);
  assert.deepEqual(extractDslIdentifiers(dsl), expectedSemantics(model));
});

test("semantic parity ignores internal relationship IDs", async () => {
  const original = laidOutFixture();
  const workspaceDsl = exportStructurizrDsl(original);
  const renamed = structuredClone(original);
  const relationshipIdMap = new Map(renamed.relationships.map((relationship) => {
    const previous = relationship.id;
    relationship.id = `renamed-${previous}`;
    return [previous, relationship.id];
  }));
  for (const view of renamed.views) {
    view.relationshipIds = view.relationshipIds.map((relationshipId) => relationshipIdMap.get(relationshipId));
    view.relationshipLayouts = view.relationshipLayouts.map((layout) => ({
      ...layout,
      relationshipId: relationshipIdMap.get(layout.relationshipId),
    }));
  }

  const report = await validateC4Output({ model: renamed, html: validHtmlFor(renamed), workspaceDsl });

  assert.equal(report.errors.some(({ code }) => code === "workspace-dsl-semantic-mismatch"), false);
});

test("rejects DSL with a missing canonical element", async () => {
  const model = laidOutFixture();
  const workspaceDsl = exportStructurizrDsl(model).replace(/^\s*c4id_66696c6573 = softwareSystem[^\n]*\n/m, "");

  const report = await validateC4Output({ model, html: validHtmlFor(model), workspaceDsl });

  assert.ok(report.errors.some(({ code }) => code === "workspace-dsl-semantic-mismatch"));
});

test("rejects DSL with changed relationship technology", async () => {
  const model = laidOutFixture();
  const workspaceDsl = exportStructurizrDsl(model).replace('"Saves sessions" "SwiftData"', '"Saves sessions" "File system"');

  const report = await validateC4Output({ model, html: validHtmlFor(model), workspaceDsl });

  assert.ok(report.errors.some(({ code }) => code === "workspace-dsl-semantic-mismatch"));
});

test("rejects DSL with a missing view member", async () => {
  const model = laidOutFixture();
  const workspaceDsl = exportStructurizrDsl(model).replace(/^\s*include c4id_66696c6573\n/m, "");

  const report = await validateC4Output({ model, html: validHtmlFor(model), workspaceDsl });

  assert.ok(report.errors.some(({ code }) => code === "workspace-dsl-semantic-mismatch"));
});

async function assertSemanticMutationRejected(mutate) {
  const original = laidOutFixture();
  const workspaceDsl = exportStructurizrDsl(original);
  const changed = structuredClone(original);
  mutate(changed);
  const report = await validateC4Output({ model: changed, html: validHtmlFor(changed), workspaceDsl });
  assert.ok(report.errors.some(({ code }) => code === "workspace-dsl-semantic-mismatch"));
}

test("rejects DSL when an element type differs from the canonical model", async () => {
  await assertSemanticMutationRejected((model) => { model.elements.find(({ id }) => id === "user").type = "Software System"; });
});

test("rejects DSL when element hierarchy differs from the canonical model", async () => {
  await assertSemanticMutationRejected((model) => { model.elements.find(({ id }) => id === "coordinator").parentId = "store"; });
});

test("rejects DSL when element name, description, technology, or tags differ", async () => {
  for (const mutate of [
    (model) => { model.elements.find(({ id }) => id === "phone").name = "Changed name"; },
    (model) => { model.elements.find(({ id }) => id === "phone").description = "Changed description"; },
    (model) => { model.elements.find(({ id }) => id === "phone").technology = "Changed technology"; },
    (model) => { model.elements.find(({ id }) => id === "phone").tags.push("changed-tag"); },
  ]) await assertSemanticMutationRejected(mutate);
});

test("rejects DSL when a view kind or level differs from the canonical model", async () => {
  await assertSemanticMutationRejected((model) => { model.views.find(({ level }) => level === 1).level = 2; });
});

test("rejects DSL when a view scope or description differs from the canonical model", async () => {
  await assertSemanticMutationRejected((model) => { model.views.find(({ level }) => level === 1).scopeId = "files"; });
  await assertSemanticMutationRejected((model) => { model.views.find(({ level }) => level === 1).description = "Changed description"; });
});
