import test from "node:test";
import assert from "node:assert/strict";
import { layoutC4Model } from "../scripts/layout-c4-model.mjs";
import { normalizeC4Model } from "../scripts/normalize-c4-model.mjs";
import {
  exportStructurizrDsl,
  extractDslIdentifiers,
  quoteDsl,
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
  return {
    elements: model.elements.map(({ id }) => id).sort(),
    relationships: model.relationships
      .map(({ from, to, description, technology = "" }) => JSON.stringify([from, to, description, technology]))
      .sort(),
    views: model.views.map(({ id }) => id).sort(),
    viewMembers: Object.fromEntries(model.views
      .map(({ id, elementIds }) => [id, [...elementIds].sort()])
      .sort(([first], [second]) => first.localeCompare(second))),
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
  assert.match(first, /^\s*user = person /m);
  assert.match(first, /^\s*system = softwareSystem /m);
  assert.match(first, /^\s*phone = container /m);
  assert.match(first, /^\s*coordinator = component /m);
  assert.match(first, /^\s*systemContext system "system-system-context"/m);
  assert.match(first, /^\s*container system "system-containers"/m);
  assert.match(first, /^\s*component phone "phone-components"/m);
  assert.match(first, /^\s*autoLayout rl 223 117$/m);
  assert.match(first, /^\s*phone = container "iPhone App" "Runs practice" "SwiftUI" "Container,Element,application-container"/m);
  assert.equal((first.match(/\s->\s/g) ?? []).length, model.relationships.length);
  assert.deepEqual(
    [...first.matchAll(/^\s*element ("(?:\\.|[^"])*") \{/gm)].map((match) => JSON.parse(match[1])),
    ["Component", "Container", "Person", "Software System", "application-container", "component", "data-store", "external-system", "person", "software-system"],
  );
  assert.doesNotMatch(first, /codeView|dynamic|deployment|image\s/);
});

test("quotes DSL metadata without leaking line breaks or delimiters", () => {
  assert.equal(quoteDsl('A "quoted"\\path\nnext\rline'), '"A \\"quoted\\"\\\\path next line"');
});

test("round-trips canonical identifiers, relationship semantics, and view membership", () => {
  const model = laidOutFixture({ hyphenated: true });
  const dsl = exportStructurizrDsl(model);

  assert.match(dsl, /_c4_[0-9a-f]+ = softwareSystem/);
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
  const workspaceDsl = exportStructurizrDsl(model).replace(/^\s*files = softwareSystem[^\n]*\n/m, "");

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
  const workspaceDsl = exportStructurizrDsl(model).replace(/^\s*include files\n/m, "");

  const report = await validateC4Output({ model, html: validHtmlFor(model), workspaceDsl });

  assert.ok(report.errors.some(({ code }) => code === "workspace-dsl-semantic-mismatch"));
});
