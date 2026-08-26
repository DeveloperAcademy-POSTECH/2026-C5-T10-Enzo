import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { scanXcodeProject } from "../scripts/scan-xcode-project.mjs";

const fixture = path.resolve(import.meta.dirname, "fixtures/sample-xcode-project");
const macFixture = path.resolve(import.meta.dirname, "fixtures/minimal-macos-project");

test("discovers Apple runtime targets, memberships, and code evidence without building", async () => {
  const result = await scanXcodeProject(fixture);

  assert.deepEqual(result.targets.filter(({ isTest }) => !isTest).map(({ name }) => name).sort(), ["TempoCoach", "TempoCoachWatch"]);
  assert.equal(result.targets.find(({ name }) => name === "TempoCoach").runtimeKind, "ios-app");
  assert.equal(result.targets.find(({ name }) => name === "TempoCoachWatch").runtimeKind, "watch-app");
  assert.ok(result.targets.find(({ name }) => name === "TempoCoach").sourceFiles.includes("TempoCoach/PracticeView.swift"));
  assert.ok(result.declarations.some(({ kind, name }) => kind === "protocol" && name === "SessionBridging"));
  assert.ok(result.interactions.some(({ kind, technology }) => kind === "message-send" && /WCSession/.test(technology)));
  assert.ok(result.interactions.some(({ kind }) => kind === "persistence-write"));
  assert.ok(result.interactions.some(({ kind, technology }) => kind === "file-read" && /Security-scoped URL/.test(technology)));
  assert.ok(result.interactions.every(({ evidence }) => evidence?.file && evidence?.line));
});

test("parses comment-bearing PBX IDs, synchronized groups, and classifies test runtimes", async () => {
  const result = await scanXcodeProject(fixture);

  assert.deepEqual(
    result.targets.filter(({ isTest }) => !isTest).map(({ name }) => name).sort(),
    ["TempoCoach", "TempoCoachWatch"],
  );
  assert.ok(result.targets.find(({ name }) => name === "TempoCoach")?.sourceFiles.includes("TempoCoach/PracticeView.swift"));
  assert.equal(result.targets.find(({ name }) => name === "TempoCoachWatchTests")?.isTest, true);
  assert.ok(result.projects.some(({ primary }) => primary));
});

test("extracts paired messages, native bridges, dependencies, and model artifacts", async () => {
  const result = await scanXcodeProject(fixture);

  assert.ok(result.interactions.some(({ kind, payloadKeys = [] }) => kind === "message-receive" && payloadKeys.includes("song")));
  assert.ok(result.interactions.some(({ kind, payloadKeys = [] }) => kind === "message-reply" && payloadKeys.includes("pingT2")));
  assert.deepEqual(
    result.interactions.find(({ kind, technology, targetNames }) =>
      kind === "message-send" && /transferUserInfo/.test(technology) && targetNames.includes("TempoCoach"))?.payloadKeys,
    ["beatGrid", "song"],
  );
  assert.deepEqual(
    result.interactions.find(({ kind, technology, targetNames }) =>
      kind === "message-send" && /transferUserInfo/.test(technology) && targetNames.includes("TempoCoachWatch"))?.payloadKeys,
    ["sessionResult"],
  );
  assert.ok(result.interfaces.some(({ language, name }) => language === "objective-c" && name === "BeatEngineBridge"));
  assert.ok(result.dependencies.some(({ kind }) => kind === "native-bridge-call"));
  assert.ok(result.dependencies.some(({ kind, toSymbol }) => kind === "initializer-call" && toSymbol === "BeatMatcher"));
  assert.ok(result.artifacts.some(({ path: artifactPath }) => artifactPath.endsWith("beat_model.onnx")));
});

test("parses explicit target dependencies, linked frameworks, and relevant target configuration evidence", async () => {
  const result = await scanXcodeProject(fixture);
  const phone = result.targets.find(({ name }) => name === "TempoCoach");
  const watch = result.targets.find(({ name }) => name === "TempoCoachWatch");
  const tests = result.targets.find(({ name }) => name === "TempoCoachWatchTests");

  assert.deepEqual(phone.targetDependencyNames, ["TempoCoachWatch"]);
  assert.deepEqual(tests.targetDependencyNames, ["TempoCoachWatch"]);
  assert.ok(phone.linkedFrameworks.includes("WatchConnectivity.framework"));
  assert.ok(watch.linkedFrameworks.includes("HealthKit.framework"));
  assert.equal(phone.buildSettings.CODE_SIGN_ENTITLEMENTS, "TempoCoach.entitlements");
  assert.equal(phone.buildSettings.INFOPLIST_FILE, "TempoCoach/Info.plist");
  assert.ok(phone.configurationFiles.includes("TempoCoach.entitlements"));
  assert.ok(phone.configurationFiles.includes("TempoCoach/Info.plist"));
  assert.ok(phone.capabilities.some(({ name, status, sourceEvidence = [] }) =>
    name === "WatchConnectivity" && status === "confirmed" && sourceEvidence.length > 0));
  assert.ok(phone.capabilities.some(({ name, status, sourceEvidence = [] }) =>
    name === "HealthKit" && status === "review-required" && sourceEvidence.length === 0));
  assert.ok(watch.capabilities.some(({ name, status, sourceEvidence = [] }) =>
    name === "HealthKit" && status === "confirmed" && sourceEvidence.length > 0));
  assert.equal(result.interactions.some(({ evidence }) => /\.entitlements$|Info\.plist$/.test(evidence.file)), false);
});

test("normalizes direct Xcode bundle inputs to the owning source directory", async () => {
  const directProject = await scanXcodeProject(path.join(macFixture, "FocusNotes.xcodeproj"));
  const directWorkspace = await scanXcodeProject(path.join(macFixture, "FocusNotes.xcworkspace"));

  for (const result of [directProject, directWorkspace]) {
    assert.equal(result.project.root, macFixture);
    assert.equal(result.project.name, "FocusNotes");
    assert.ok(result.declarations.some(({ name }) => name === "FocusNotesApp"));
    assert.ok(result.targets[0].sourceFiles.includes("FocusNotes/FocusNotesApp.swift"));
  }
});

test("uses Xcode SDK settings instead of guessing the application platform", async () => {
  const result = await scanXcodeProject(macFixture);
  assert.equal(result.targets.length, 1);
  assert.equal(result.targets[0].runtimeKind, "macos-app");
});

test("reports partial Swift parse failures as warnings and keeps target evidence", async () => {
  const result = await scanXcodeProject(fixture, {
    readText: async (file, defaultReadText) =>
      file.endsWith("PracticeView.swift") ? "\u0000invalid" : defaultReadText(file),
  });

  assert.ok(result.warnings.some(({ code, file }) => code === "swift-parse-partial" && file.endsWith("PracticeView.swift")));
  assert.ok(result.targets.length > 0);
});

test("writes the scanner CLI result as formatted JSON", async () => {
  const output = path.join(await fs.mkdtemp("/private/tmp/creating-c4-scan-"), "scan.json");
  const { runScanCli } = await import("../scripts/scan-xcode-project.mjs");
  const exitCode = await runScanCli([fixture, output]);
  const written = JSON.parse(await fs.readFile(output, "utf8"));

  assert.equal(exitCode, 0);
  assert.equal(written.project.name, "TempoCoach");
  assert.equal(written.targets.filter(({ isTest }) => !isTest).length, 2);
});
