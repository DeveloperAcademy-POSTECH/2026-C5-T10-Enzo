import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runPipeline } from "../scripts/build-c4-explorer.mjs";

async function directoryDigest(root) {
  const files = [];
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      if (entry.isFile()) files.push(absolute);
    }
  }
  await walk(root);
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(root, file));
    hash.update(await fs.readFile(file));
  }
  return hash.digest("hex");
}

function sourceEvidence(scan, suffix, reason) {
  const file = scan.files.find(({ path: filePath }) => filePath.endsWith(suffix))?.path;
  assert.ok(file, `fixture evidence must contain ${suffix}`);
  return [{ file, line: 1, reason }];
}

function makeEvidenceBackedRawModel(scan) {
  const projectEvidence = [{ ...scan.targets[0].evidence, line: 1 }];
  const phoneEvidence = sourceEvidence(scan, "TempoCoachApp.swift", "iPhone application entry");
  const watchEvidence = sourceEvidence(scan, "TempoCoachWatchApp.swift", "watchOS application entry");
  const practiceEvidence = sourceEvidence(scan, "PracticeView.swift", "Practice UI responsibility");
  const bridgeEvidence = sourceEvidence(scan, "SessionBridge.swift", "Direct WatchConnectivity send");
  const storeEvidence = sourceEvidence(scan, "RhythmStore.swift", "Direct SwiftData persistence");
  const motionEvidence = sourceEvidence(scan, "MotionSampler.swift", "Direct motion sampling responsibility");
  return {
    project: { name: "TempoCoach", description: "Apple 기기에서 리듬 연습을 돕습니다.", language: "ko" },
    elements: [
      { id: "learner", type: "Person", name: "리듬 학습자", description: "iPhone과 Apple Watch로 리듬을 연습합니다.", evidence: practiceEvidence, confidence: "inferred" },
      { id: "tempo-coach", type: "Software System", name: "TempoCoach", description: "리듬 연습 흐름과 측정 피드백을 제공합니다.", evidence: projectEvidence, confidence: "confirmed" },
      { id: "iphone-app", parentId: "tempo-coach", type: "Container", name: "TempoCoach iPhone App", description: "연습을 구성하고 결과를 표시합니다.", technology: "SwiftUI · iOS", evidence: phoneEvidence, confidence: "confirmed" },
      { id: "watch-app", parentId: "tempo-coach", type: "Container", name: "TempoCoach Watch App", description: "손목 움직임을 측정하고 연습 상태를 주고받습니다.", technology: "SwiftUI · watchOS", evidence: watchEvidence, confidence: "confirmed" },
      { id: "rhythm-store", parentId: "tempo-coach", type: "Container", name: "리듬 기록 저장소", description: "연습 세션과 점수를 기기에 보관합니다.", technology: "SwiftData", visualRole: "data-store", evidence: storeEvidence, confidence: "confirmed" },
      { id: "practice-flow", parentId: "iphone-app", type: "Component", name: "연습 흐름", description: "연습 시작과 저장을 조정합니다.", technology: "SwiftUI", evidence: practiceEvidence, confidence: "confirmed" },
      { id: "session-bridge", parentId: "iphone-app", type: "Component", name: "Watch 세션 브리지", description: "Watch로 연습 세션을 전송합니다.", technology: "WatchConnectivity", evidence: bridgeEvidence, confidence: "confirmed" },
      { id: "motion-sampler", parentId: "watch-app", type: "Component", name: "움직임 샘플러", description: "기기 움직임 표본을 수집합니다.", technology: "CoreMotion", evidence: motionEvidence, confidence: "confirmed" },
    ],
    relationships: [
      { id: "uses-system", from: "learner", to: "tempo-coach", description: "리듬을 연습합니다.", evidence: practiceEvidence, confidence: "inferred" },
      { id: "uses-phone", from: "learner", to: "iphone-app", description: "연습을 구성하고 시작합니다.", technology: "iPhone UI", evidence: practiceEvidence, confidence: "confirmed" },
      { id: "uses-watch", from: "learner", to: "watch-app", description: "손목에서 연습 상태를 확인합니다.", technology: "Apple Watch UI", evidence: watchEvidence, confidence: "inferred" },
      { id: "syncs-session", from: "iphone-app", to: "watch-app", description: "연습 세션을 전송합니다.", technology: "WCSession.transferUserInfo", evidence: bridgeEvidence, confidence: "confirmed" },
      { id: "stores-session", from: "iphone-app", to: "rhythm-store", description: "연습 결과를 저장합니다.", technology: "SwiftData ModelContext", evidence: storeEvidence, confidence: "confirmed" },
      { id: "controls-practice", from: "learner", to: "practice-flow", description: "연습 흐름을 조작합니다.", technology: "SwiftUI", evidence: practiceEvidence, confidence: "confirmed" },
      { id: "samples-motion", from: "learner", to: "motion-sampler", description: "측정을 시작합니다.", technology: "watchOS UI", evidence: motionEvidence, confidence: "inferred" },
    ],
  };
}

test("turns an Xcode project into five consistent C4 artifacts without modifying it", async () => {
  const fixture = path.resolve(import.meta.dirname, "fixtures/sample-xcode-project");
  const before = await directoryDigest(fixture);
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-diagrams-"));
  const progress = [];
  const result = await runPipeline({
    projectRoot: fixture,
    outputDirectory: output,
    language: "ko",
    synthesizeModel: async (scan) => makeEvidenceBackedRawModel(scan),
    onProgress: (event) => progress.push(event.phase),
  });

  assert.deepEqual(Object.keys(result.paths).sort(), ["analysis", "html", "model", "validation", "workspaceDsl"]);
  assert.deepEqual((await fs.readdir(output)).sort(), [
    "c4-analysis.md",
    "c4-model.json",
    "tempocoach-c4-explorer.html",
    "validation-report.json",
    "workspace.dsl",
  ]);
  assert.equal(result.paths.workspaceDsl, path.join(output, "workspace.dsl"));
  assert.equal(await directoryDigest(fixture), before);
  assert.deepEqual(result.validation.errors, []);
  assert.deepEqual(result.model.views.map(({ level }) => level), [1, 2, 3, 3]);
  assert.deepEqual(progress, ["scan", "synthesize", "normalize", "layout", "build", "validate"]);
  assert.deepEqual(
    result.model.elements.filter(({ type }) => type === "Container").map(({ id }) => id),
    ["iphone-app", "watch-app", "rhythm-store"],
  );
  assert.equal(result.model.elements.some(({ name }) => /WatchConnectivity|CoreMotion/.test(name)), false);
  assert.equal(result.model.elements.find(({ id }) => id === "rhythm-store").visualRole, "data-store");
  assert.equal(result.model.relationships.find(({ id }) => id === "syncs-session").technology, "WCSession.transferUserInfo");
  assert.equal(result.model.relationships.some(({ from, to }) => from === "watch-app" && to === "iphone-app"), false);
  assert.equal(result.model.elements.some(({ type, name }) => type === "Component" && /PracticeView|PracticeSession/.test(name)), false);
});

test("continues with a conservative review-required model when synthesis fails", async () => {
  const fixture = path.resolve(import.meta.dirname, "fixtures/minimal-macos-project");
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-fallback-"));
  const result = await runPipeline({
    projectRoot: fixture,
    outputDirectory: output,
    language: "en",
    synthesizeModel: async () => { throw new Error("agent synthesis unavailable"); },
  });

  assert.ok(result.warnings.some(({ code }) => code === "semantic-synthesis-fallback"));
  assert.ok(result.model.elements.some(({ type }) => type === "Component"));
  assert.ok(result.model.elements.every(({ confidence }) => confidence === "review-required"));
  assert.deepEqual(result.validation.errors, []);
  assert.deepEqual(result.model.views.map(({ level }) => level), [1, 2, 3]);
  assert.equal(result.model.elements.filter(({ type }) => type === "Component").length, 1);
  assert.equal(result.model.elements.some(({ name, technology }) => /watch|WCSession|CoreMotion/i.test(`${name} ${technology}`)), false);
  assert.match(await fs.readFile(result.paths.analysis, "utf8"), /semantic-synthesis-fallback/);
  assert.ok(JSON.parse(await fs.readFile(result.paths.validation, "utf8")).warnings.some(({ code }) => code === "semantic-synthesis-fallback"));
  assert.deepEqual((await fs.readdir(output)).sort(), ["c4-analysis.md", "c4-model.json", "focusnotes-c4-explorer.html", "validation-report.json", "workspace.dsl"]);
});

test("uses the evidence-backed synthesizer by default", async () => {
  const fixture = path.resolve(import.meta.dirname, "fixtures/sample-xcode-project");
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-default-synthesis-"));
  const result = await runPipeline({
    projectRoot: fixture,
    outputDirectory: output,
    language: "ko",
  });

  assert.equal(result.warnings.some(({ code }) => code === "semantic-synthesis-fallback"), false);
  assert.ok(result.model.elements.filter(({ type }) => type === "Component").length >= 5);
  assert.ok(result.model.relationships.some(({ technology, senderEvidence, receiverEvidence }) =>
    /transferUserInfo/.test(technology) && senderEvidence?.length && receiverEvidence?.length));
  const analysis = await fs.readFile(result.paths.analysis, "utf8");
  assert.match(analysis, /## 요소와 책임/);
  assert.match(analysis, /## 관계와 데이터 흐름/);
  assert.match(analysis, /Beat Grid|Song/);
  assert.match(analysis, /SessionBridge\.swift|PhoneSessionBridge\.swift/);
});

test("generates all five FocusNotes artifacts without unrelated product claims", async () => {
  const fixture = path.resolve(import.meta.dirname, "fixtures/minimal-macos-project");
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-focusnotes-"));
  const result = await runPipeline({ projectRoot: fixture, outputDirectory: output, language: "en" });
  const [analysis, dsl, validation, html] = await Promise.all([
    fs.readFile(result.paths.analysis, "utf8"),
    fs.readFile(result.paths.workspaceDsl, "utf8"),
    fs.readFile(result.paths.validation, "utf8"),
    fs.readFile(result.paths.html, "utf8"),
  ]);
  const embedded = html.match(/<script[^>]*id="architecture-model"[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? "";
  const claims = [JSON.stringify(result.model), analysis, dsl, validation, embedded].join("\n");

  assert.deepEqual((await fs.readdir(output)).sort(), ["c4-analysis.md", "c4-model.json", "focusnotes-c4-explorer.html", "validation-report.json", "workspace.dsl"]);
  assert.deepEqual(result.validation.errors, []);
  assert.doesNotMatch(claims, /rhythm|watch|audio|song|beatgrid|scor(?:e|ing)|iphone|wrist/i);
  assert.ok(result.model.elements
    .filter(({ type, visualRole }) => type === "Person" || (type === "Software System" && visualRole === "software-system") || visualRole === "application-container")
    .every(({ implementationStatus }) => implementationStatus === "review-required"));
});

test("accepts a direct xcodeproj bundle and a referencing xcworkspace as pipeline inputs", async () => {
  const fixture = path.resolve(import.meta.dirname, "fixtures/minimal-macos-project");
  for (const input of [
    path.join(fixture, "FocusNotes.xcodeproj"),
    path.join(fixture, "FocusNotes.xcworkspace"),
  ]) {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), "creating-c4-direct-bundle-"));
    const result = await runPipeline({ projectRoot: input, outputDirectory: output, language: "en" });

    assert.equal(result.scan.project.root, fixture);
    assert.equal(result.scan.files.some(({ path: file }) => file === "FocusNotes/NoteStore.swift"), true);
    assert.deepEqual((await fs.readdir(output)).sort(), ["c4-analysis.md", "c4-model.json", "focusnotes-c4-explorer.html", "validation-report.json", "workspace.dsl"]);
    assert.deepEqual(result.validation.errors, []);
  }
});
