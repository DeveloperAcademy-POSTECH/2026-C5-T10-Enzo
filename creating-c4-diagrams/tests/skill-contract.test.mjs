import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

test("declares an installable creating-c4-diagrams skill", () => {
  const skill = fs.readFileSync(path.join(root, "SKILL.md"), "utf8");
  const metadata = fs.readFileSync(path.join(root, "agents/openai.yaml"), "utf8");
  const modelContract = fs.readFileSync(path.join(root, "references/c4-model-contract.md"), "utf8");
  const layoutContract = fs.readFileSync(path.join(root, "references/layout-and-notation.md"), "utf8");
  const analysisRules = fs.readFileSync(path.join(root, "references/xcode-analysis-rules.md"), "utf8");
  const forwardEvaluation = fs.readFileSync(path.join(root, "tests/evaluations/forward-test.md"), "utf8");
  for (const requiredPath of [
    "package.json",
    "agents/openai.yaml",
    "scripts/scan-xcode-project.mjs",
    "scripts/synthesize-c4-model.mjs",
    "references/xcode-analysis-rules.md",
  ]) assert.equal(fs.existsSync(path.join(root, requiredPath)), true, `${requiredPath} must ship with the skill`);
  assert.match(skill, /^---\nname: creating-c4-diagrams\n/m);
  assert.match(skill, /description: Use when .*Xcode.*C4/i);
  assert.match(skill, /argument-hint:/);
  assert.match(metadata, /display_name: "C4 모델 다이어그램 만들기"/);
  assert.match(metadata, /\$creating-c4-diagrams/);
  assert.match(skill, /Never present .*c4-explorer-shell\.html.*final artifact/i);
  assert.match(skill, /workspace\.dsl/);
  assert.match(skill, /final relationship geometry/i);
  assert.match(skill, /five files|five artifacts/i);
  assert.match(modelContract, /geometryVersion/);
  assert.match(layoutContract, /browser.*render/i);
  assert.match(`${skill}\n${modelContract}\n${analysisRules}`, /https:\/\/c4model\.com\/diagrams/);
  assert.match(`${skill}\n${modelContract}\n${analysisRules}`, /https:\/\/docs\.structurizr\.com\/dsl(?:\/language)?/);
  assert.match(`${skill}\n${modelContract}\n${analysisRules}`, /https:\/\/github\.com\/structurizr\/structurizr/);
  assert.match(forwardEvaluation, /five artifacts/i);
  assert.match(forwardEvaluation, /workspace\.dsl/);
});
