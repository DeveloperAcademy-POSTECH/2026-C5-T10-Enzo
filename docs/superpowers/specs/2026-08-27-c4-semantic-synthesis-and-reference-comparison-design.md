# C4 Semantic Synthesis and Reference Comparison Design

Date: 2026-08-27  
Status: Approved direction; awaiting design-document review  
Extends: `2026-08-26-creating-c4-diagrams-design.md` and `2026-08-26-c4-content-richness-parity-design.md`

## 1. Product Goal

Given an arbitrary Apple Xcode project, the `creating-c4-diagrams` skill must produce an evidence-backed L1/L2/L3 C4 explorer whose text explains the product in the same kind of language as the hand-authored RhythmTrainer explorer:

- who uses the product and why;
- what the software system accomplishes;
- which independently deployable or executable containers exist;
- which responsibilities each qualifying container delegates to components;
- what information crosses each relationship and for what purpose;
- which source files, symbols, APIs, and lines support every claim.

The objective is semantic explanatory quality across projects, not literal copying of RhythmTrainer names or descriptions.

## 2. Problem

The current generator discovers code but translates it into broad implementation categories. This causes output such as `애플리케이션 사용자`, `애플리케이션 서비스 경계`, and `Xcode 대상 메타데이터에서 확인된 실행 경계`. Such phrases describe the analysis process or source-code shape rather than the product's behavior.

The current synthesis also:

- merges independent responsibilities that share a broad category;
- misses role-bearing types such as Judge, Matcher, Coach, and Scorer;
- promotes primitives and UI helper types to architectural inputs and outputs;
- derives relationship labels from receiver symbols instead of behavioral intent;
- emits the same physical interaction at multiple abstraction levels;
- uses target names without removing duplicated platform/product suffixes;
- provides no structured explanation of how a generated model differs from a supplied reference explorer.

## 3. Chosen Approach

Use an evidence-bounded semantic synthesizer with an optional reference comparator.

The core synthesizer always works without a reference. It derives product responsibilities and flows from source evidence. When a reference HTML or canonical model is supplied, a separate comparator aligns the two models and reports semantic differences. The reference is a calibration fixture and review aid, never an authority that overwrites current source evidence.

This design rejects two alternatives:

1. Copying or overriding generated text with the RhythmTrainer reference, because that would be project-specific and could preserve stale claims.
2. Improving generic categories without comparison support, because it would not explain regressions or distinguish a source change from a synthesis failure.

## 4. Scope

### Included

- Apple Xcode projects with iOS, watchOS, macOS, extensions, shared frameworks, and supported mixed-language bridges.
- C4 System Context, Container, and Component levels only.
- Korean explanatory output, with project symbols and technology names preserved where appropriate.
- Deterministic static analysis with traceable evidence.
- Optional comparison against a standalone explorer HTML or canonical C4 JSON.
- Comparison details appended to the existing `c4-analysis.md` artifact.

### Excluded

- L4 Code diagrams.
- Blind use of README or reference prose as source truth.
- Runtime behavior claims that cannot be supported by static evidence.
- Guaranteed recovery of business intent when neither code, configuration, tests, documentation, nor a reference supplies sufficient evidence.
- A sixth required output artifact; the five-artifact contract remains unchanged.

## 5. Inputs and Outputs

### Required input

- Xcode project or workspace root.

### Optional inputs

- reference explorer HTML containing `script#architecture-model`;
- canonical C4 JSON;
- project documentation used as low-priority corroborating evidence;
- explicit product vocabulary supplied by the user.

### Outputs

1. standalone interactive HTML explorer;
2. canonical C4 model JSON;
3. `c4-analysis.md`, including the optional reference-difference section;
4. validation report JSON;
5. retained scan/evidence artifact defined by the existing pipeline contract.

## 6. Evidence Hierarchy

Claims use the strongest available evidence in this order:

1. direct runtime calls and paired send/receive behavior;
2. protocol conformance, public interfaces, construction, and dependency injection;
3. cohesive call graphs and shared data flow;
4. framework ownership and capabilities;
5. tests that exercise a unit as a responsibility;
6. configuration, entitlements, model artifacts, and target membership;
7. repository documentation;
8. names and directory structure as hints only;
9. optional reference model as comparison evidence, not implementation evidence.

A final responsibility or relationship must cite at least one strong source-code/configuration signal. A role inferred only from naming remains `review-required`.

## 7. Semantic Synthesis Pipeline

### 7.1 Stage A: Build a target-local evidence graph

For each non-test runtime target, create a graph of:

- declarations and protocol conformances;
- constructors and injected properties;
- calls, callbacks, delegates, publishers, and message handlers;
- framework APIs and owned resources;
- payload types and dictionary keys;
- persistence reads and writes;
- native bridge calls and model artifacts;
- tests and documented vocabulary.

Graph edges retain file, line, enclosing symbol, target, direction, API, and evidence strength.

### 7.2 Stage B: Form responsibility seeds

A responsibility seed begins at one of these boundaries:

- stable protocol or public interface;
- coordinator, orchestrator, view model, or dependency hub;
- owner of a direct runtime API such as AVFoundation, CoreMotion, HealthKit, WCSession, SwiftData, Core Data, URLSession, or a native/model bridge;
- repository, adapter, engine, detector, analyzer, matcher, judge, scorer, coach, player, recorder, or renderer role supported by behavior;
- a behavior unit independently strengthened by tests.

Role suffixes are signals, not automatic architecture. A seed must be strengthened by an interaction, dependency, interface, framework, or test signal.

### 7.3 Stage C: Cluster by cohesion, not category

Declarations join the same Component candidate only when at least two signals agree:

- shared interface boundary;
- shared construction/injection boundary;
- high internal calls and lower external calls;
- one directional input-to-output responsibility;
- common integration/runtime ownership;
- tests treat the group as one behavior;
- one stable adapter/repository/engine boundary.

Broad categories such as presentation, service, and persistence remain layout/classification metadata. They are not default component identities.

Distinct responsibility seeds stay separate even when they use the same framework. For example, audio playback and beat analysis must not merge merely because both touch AVFoundation data.

### 7.4 Stage D: Generate product-facing names

Names are selected in this order:

1. established domain responsibility supported by symbols and operations;
2. stable interface or adapter role;
3. input-to-output transformation;
4. runtime integration purpose;
5. cleaned primary symbol name;
6. generic category fallback only when evidence is insufficient.

Generated names describe responsibility rather than implementation inventory. Target names are normalized to remove repeated product/platform suffixes, preventing names such as `RhythmTrainerWatch Watch App`.

### 7.5 Stage E: Generate explanatory descriptions

Descriptions follow a compact behavioral contract:

> Receives or observes **input**, performs **responsibility**, and produces, displays, stores, or sends **output**.

Descriptions must not make the scanner or Xcode metadata the grammatical subject when stronger behavior evidence exists. Phrases such as `소스에서 확인된 동작을 묶습니다` and `Xcode 대상 메타데이터에서 확인된 실행 경계` are diagnostic fallback text, not acceptable final primary copy for a strongly evidenced element.

### 7.6 Stage F: Derive architecture-level inputs and outputs

Eligible inputs and outputs include:

- user commands and selections;
- files, URLs, streams, samples, and model inputs;
- domain payloads and session packages;
- sensor events and timestamps;
- analysis, judgment, scoring, coaching, and playback results;
- persisted domain entities and query results;
- explicit callback or message payloads.

Primitive types, standard collection wrappers, SwiftUI shapes/views, framework plumbing types, and incidental return values remain evidence but do not appear as C4 I/O unless the primitive itself has an explicit domain meaning.

## 8. Relationship Synthesis

### 8.1 One interaction fact, level-appropriate projection

Every physical interaction receives a stable fact identifier. Views project that fact at only the appropriate abstraction:

- L1 shows person-to-system and system-to-external intent;
- L2 aggregates component facts into container relationships;
- L3 shows component endpoints for the selected container;
- a view must not show both an aggregate relationship and its expanded component copies.

### 8.2 Behavioral labels

Labels contain:

1. technology/API on the first line;
2. concrete directional action and payload/intent on the second line.

Receiver-symbol wording such as `X 경계에 위임합니다` is replaced by behavior wording such as `정박 검출을 위임합니다` or `Song + BeatGrid 패키지를 전송합니다` when supported.

### 8.3 Pairing and direction

Send and receive evidence is paired using target pair, protocol/API, payload keys/types, and nearby handlers. Reply/callback flow becomes a separate reverse relationship only when reverse-direction source evidence exists.

## 9. Container Semantics

Container identity comes from executable/deployable/runtime boundaries. Its description and technology are summarized from child responsibilities and confirmed frameworks, not PBX metadata alone.

Examples of acceptable container descriptions:

- selects and analyzes audio, coordinates a practice session, and presents results;
- captures wrist motion, judges timing, and returns coaching feedback.

The generator must distinguish user-owned external files from an internal application database and must not introduce a datastore merely to improve visual notation.

## 10. Optional Reference Comparator

### 10.1 Reference extraction

The comparator accepts:

- standalone explorer HTML with embedded architecture JSON; or
- canonical model JSON.

It normalizes names, types, hierarchy, technologies, responsibilities, relationships, and evidence references without changing either model.

### 10.2 Semantic alignment

Candidates align using weighted signals:

- C4 type and parent scope;
- normalized name and aliases;
- target/runtime ownership;
- responsibilities and domain terms;
- technologies and APIs;
- relationship neighborhood;
- payload and data-flow similarity.

The comparator records the score and reasons. Low-confidence matches remain unpaired rather than being forced.

### 10.3 Difference taxonomy

Each comparison result uses one of:

- `MATCH`: equivalent responsibility and flow;
- `RENAMED`: same responsibility, materially different name;
- `SPLIT`: one reference responsibility maps to several generated elements;
- `MERGED`: several reference responsibilities map to one generated element;
- `MISSING`: reference responsibility or relationship is absent;
- `ADDED`: current source supports a new responsibility or relationship;
- `SOURCE_CHANGED`: current source contradicts or supersedes the reference;
- `INSUFFICIENT_EVIDENCE`: the reference claim cannot be confirmed from current evidence.

### 10.4 Analysis report section

`c4-analysis.md` appends `원본 대비 의미 차이` containing, for every material delta:

- level and element/relationship;
- reference wording;
- generated wording;
- classification;
- why they differ;
- supporting current-source evidence;
- recommended action: synthesizer fix, source-change acknowledgement, or human review.

The comparator never silently copies reference wording into the generated model.

## 11. Skill Workflow Changes

`SKILL.md` will require the following workflow:

1. inventory project targets, sources, tests, configuration, artifacts, and documentation;
2. build the evidence graph;
3. synthesize L1 product intent conservatively;
4. synthesize L2 runtime boundaries and aggregate relationships;
5. synthesize L3 responsibility clusters for qualifying containers;
6. run semantic content-quality gates;
7. when a reference is supplied, compare and report deltas;
8. generate the explorer and all standard artifacts;
9. validate C4 integrity, evidence coverage, semantic quality, layout, and interaction behavior;
10. disclose review-required gaps instead of inventing explanations.

The skill documentation will include project-neutral examples, anti-examples, and a decision table for clustering, naming, descriptions, I/O, and relationship projection.

## 12. Quality Gates

Generation fails validation or emits an explicit `review-required` warning when:

- a strongly evidenced element retains a generic category name;
- a primary description explains Xcode/source discovery instead of product behavior;
- primitives or UI helper types appear as architecture-level I/O;
- several strong responsibility seeds are merged without cohesion evidence;
- one interaction fact appears more than once in the same view;
- relationship wording lacks a directional action;
- a claim has no traceable evidence;
- a navigable runtime container has qualifying component evidence but no L3 view;
- a reference comparison has unresolved high-impact `MISSING` or `MERGED` results.

These are semantic gates. Fixed element-count parity with RhythmTrainer is explicitly not required.

## 13. Test Strategy

### Unit tests

- role vocabulary and target-name normalization;
- responsibility seed creation and cohesion scoring;
- product-facing name and behavioral description generation;
- architecture I/O filtering;
- interaction fact deduplication and level projection;
- reference extraction, alignment, and delta classification.

### Fixture acceptance tests

Use at least three structurally different fixtures:

1. iOS + watchOS practice/health application;
2. single-target document or media application;
3. multi-target application with persistence and an external network service.

Assertions are based on supported responsibilities and flows, not fixed component counts.

### RhythmTrainer golden regression

Use the hand-authored explorer as a semantic calibration fixture. The generated model should recover the same major product responsibilities when current source still supports them. Legitimate source differences must be classified instead of treated automatically as failures.

### Negative tests

- utility classes do not become Components without responsibility evidence;
- `Bool`, `Double`, and SwiftUI geometry types do not become I/O;
- unmatched reference claims are not copied;
- callbacks do not create reverse arrows without receiver evidence;
- one WCSession fact is not duplicated across abstraction levels in one view.

## 14. Acceptance Criteria

The design is complete when:

- a project without a reference produces product-facing L1/L2/L3 explanations grounded in code;
- RhythmTrainer generation recovers its major user goal, iPhone/Watch responsibilities, audio analysis, motion judgment, coaching/scoring, connectivity, and persistence boundaries where supported;
- supplying the original explorer produces a readable, evidence-linked difference section;
- generic category labels are used only for insufficient-evidence fallbacks;
- every final element and relationship can be traced to evidence;
- the standard explorer interaction and layout contracts remain unchanged;
- L4 is never generated.

## 15. Delivery Boundary

Implementation will modify the reusable skill instructions, semantic synthesizer, model normalization/comparison support, analysis report, tests, and regenerated artifacts. It will not modify the supplied Xcode project, copy unsupported reference text, or redesign the established product shell.
