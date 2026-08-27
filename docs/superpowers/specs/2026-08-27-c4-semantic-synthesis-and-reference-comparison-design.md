# C4 Semantic Synthesis and Reference Comparison Design

Date: 2026-08-27  
Status: Revised after user review; awaiting final design approval
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

## 7. Project-Neutral Interpretation Method

The generator must reproduce the *reasoning pattern* behind the RhythmTrainer reference, not its nouns. Every final claim passes through the following interpretation ladder:

```text
Source evidence
  -> observed operation and data movement
  -> user or domain capability
  -> stable architectural responsibility
  -> C4 element or relationship
  -> product-facing explanation
```

No step may jump directly from a class name, directory, target name, or imported framework to final prose.

### 7.1 Keep observation, interpretation, and narration separate

The pipeline stores three different records:

1. **Observation** — a literal source fact such as `startDeviceMotionUpdates`, `transferUserInfo`, a `ModelContext` insert, or a UI action calling a view model.
2. **Interpretation** — a bounded hypothesis such as motion capture, practice-session transfer, result persistence, or practice-flow coordination.
3. **Narration** — the audience-facing C4 phrase such as `손목 움직임을 수집합니다`.

Observations are immutable evidence. Interpretations can be merged, split, or rejected. Narration can be localized or rewritten without changing evidence. This separation prevents final descriptions from becoming either raw code dumps or unsupported product prose.

### 7.2 Recover end-to-end capability chains before naming elements

Analyze each project as a set of behavioral slices:

```text
trigger or external input
  -> coordinating boundary
  -> domain/integration work
  -> result or feedback
  -> optional persistence or external transfer
```

Start from entry points such as UI actions, commands, app intents, delegates, incoming messages, file opens, and scheduled/background callbacks. Follow evidenced calls and payloads until they reach an observable result. Repeated slices are folded into a capability chain.

RhythmTrainer illustrates the method:

- song selection -> practice-flow coordination -> audio decoding/beat analysis -> playback/result presentation;
- Watch start -> motion capture -> swing detection -> timing judgment/coaching -> haptic/UI feedback;
- iPhone package send -> WCSession transport -> Watch receive and session preparation;
- session result -> transfer -> scoring/display/persistence.

For another project, the nouns will differ, but the trigger-to-result method remains the same.

### 7.3 Interpret each C4 level with a different question

| Level | Interpretation question | Acceptable evidence | Avoid |
|---|---|---|---|
| L1 Person | Who pursues an external goal, and what outcome do they seek? | user-facing commands, UI copy, app intents, tests/docs corroboration | `애플리케이션 사용자`, device model, screen name |
| L1 System | What durable value does the whole product deliver? | dominant capability chains across targets | source inventory or Xcode metadata wording |
| L1 External System | What lies outside ownership but exchanges meaningful data or services? | filesystem/service APIs, target boundary, network endpoint | every framework or internal database |
| L2 Container | Where are the executable/deployable/runtime boundaries, and what part of the value do they own? | targets, extensions, processes, datastores, runtime dependencies | renaming a target without explaining its responsibility |
| L3 Component | Which stable responsibility can be understood and changed independently inside one container? | cohesive calls, interface, runtime ownership, tests, domain flow | every class, directory, or generic technical layer |
| Relationship | What crosses the boundary, why, in which direction, and by what mechanism? | calls, payloads, handlers, callbacks, reads/writes | `사용합니다`, `연결합니다`, receiver-name-only wording |

### 7.4 Derive the actor and system purpose from dominant behavior

The Person is named from the repeated goal visible across primary entry points, not from the fact that a UI exists. The System description summarizes the dominant input-to-outcome chain shared by the main targets.

When several unrelated capabilities exist, retain a short product-level umbrella and list secondary capabilities in responsibilities. When the code does not reveal the real-world role, use a conservative role such as `문서를 편집하는 사용자`, derived from operations, and mark it `review-required`; do not fabricate a demographic or job title.

### 7.5 Determine component boundaries using responsibility invariants

A candidate is a Component only if all of the following are answerable:

- What responsibility does it own?
- What inputs does it accept or observe?
- What outputs or side effects does it produce?
- Which container owns it?
- What evidence separates it from neighboring responsibilities?

Several classes may realize one Component. One large class may realize several candidates only when distinct interfaces or independently evidenced flows justify a split. Utility types, value models, extensions, generated code, UI decoration, and framework wrappers remain implementation details unless they own an architectural boundary.

### 7.6 Translate operations into domain verbs

Use this deterministic translation order:

1. explicit user-facing/domain vocabulary in APIs, tests, UI copy, and model names;
2. payload semantics and before/after state;
3. framework operation semantics;
4. stable role vocabulary;
5. cleaned symbol name as a fallback.

For example:

| Source observation | Intermediate interpretation | Final responsibility/relationship wording |
|---|---|---|
| `AVAudioFile` read + PCM conversion + player scheduling | audio input and playback | 선택한 음원을 PCM으로 변환하고 기준 시각에 맞춰 재생합니다 |
| `startDeviceMotionUpdates` consumed by swing logic | wrist-motion capture | 손목 움직임 표본을 수집해 스윙 검출에 제공합니다 |
| `transferUserInfo` with song/grid keys | asynchronous practice-package transfer | `[WCSession · transferUserInfo] Song + BeatGrid 패키지를 전송합니다` |
| `ModelContext.insert(SessionResult)` | practice-result persistence | 연습 결과와 판정 상태를 저장합니다 |

Framework semantics constrain the verb but do not determine the product noun by themselves.

### 7.7 Record an interpretation worksheet for every final claim

Before normalization, each element and relationship retains an internal worksheet:

```json
{
  "observations": [],
  "capabilityChain": "...",
  "domainConcepts": [],
  "responsibility": "...",
  "c4Decision": { "type": "Component", "parentId": "..." },
  "narration": { "name": "...", "description": "..." },
  "supportingSignals": [],
  "counterEvidence": [],
  "confidence": "confirmed"
}
```

This worksheet is machine-readable scan/synthesis evidence. It is summarized, not dumped verbatim, in `c4-analysis.md`.

### 7.8 Confidence and disagreement rules

- `confirmed`: direct behavioral evidence plus at least one corroborating signal, or paired evidence at both ends of a relationship;
- `probable`: one strong behavioral signal or two mutually consistent moderate signals;
- `review-required`: naming/documentation hints only, competing interpretations, or incomplete endpoints;
- `rejected`: contradicted by target ownership, direction, or stronger source evidence.

Counter-evidence is retained. A higher-confidence interpretation cannot be replaced merely to resemble the reference.

### 7.9 Original-derived calibration rules

The RhythmTrainer original demonstrates these general rules:

| Original interpretation choice | General rule carried to other projects |
|---|---|
| `리듬을 연습하는 사용자` rather than `애플리케이션 사용자` | name actors by pursued outcome |
| system description combines audio analysis, wrist motion, judgment, and coaching | summarize the dominant end-to-end value chain |
| iPhone and Watch are separate Containers | use executable/runtime boundaries at L2 |
| files/iCloud appears as an external system | distinguish outside-owned user data from internal storage |
| flow, playback, analysis, scoring, connectivity, and persistence are separate Components | split by stable responsibility and data flow, not broad layer |
| `Song + BeatGrid를 전송합니다` | relationship labels name payload and directional intent |
| CoreMotion, HealthKit, WCSession, AVFoundation appear as technology | technology qualifies behavior; it does not replace behavior |
| helper/value/UI decoration types are absent | omit implementation detail that does not own a responsibility |

These rules are valid only because they generalize. RhythmTrainer-specific nouns are not placed in the generic skill instructions.

## 8. Semantic Synthesis Pipeline

### 8.1 Stage A: Build a target-local evidence graph

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

### 8.2 Stage B: Form responsibility seeds

A responsibility seed begins at one of these boundaries:

- stable protocol or public interface;
- coordinator, orchestrator, view model, or dependency hub;
- owner of a direct runtime API such as AVFoundation, CoreMotion, HealthKit, WCSession, SwiftData, Core Data, URLSession, or a native/model bridge;
- repository, adapter, engine, detector, analyzer, matcher, judge, scorer, coach, player, recorder, or renderer role supported by behavior;
- a behavior unit independently strengthened by tests.

Role suffixes are signals, not automatic architecture. A seed must be strengthened by an interaction, dependency, interface, framework, or test signal.

### 8.3 Stage C: Cluster by cohesion, not category

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

### 8.4 Stage D: Generate product-facing names

Names are selected in this order:

1. established domain responsibility supported by symbols and operations;
2. stable interface or adapter role;
3. input-to-output transformation;
4. runtime integration purpose;
5. cleaned primary symbol name;
6. generic category fallback only when evidence is insufficient.

Generated names describe responsibility rather than implementation inventory. Target names are normalized to remove repeated product/platform suffixes, preventing names such as `RhythmTrainerWatch Watch App`.

### 8.5 Stage E: Generate explanatory descriptions

Descriptions follow a compact behavioral contract:

> Receives or observes **input**, performs **responsibility**, and produces, displays, stores, or sends **output**.

Descriptions must not make the scanner or Xcode metadata the grammatical subject when stronger behavior evidence exists. Phrases such as `소스에서 확인된 동작을 묶습니다` and `Xcode 대상 메타데이터에서 확인된 실행 경계` are diagnostic fallback text, not acceptable final primary copy for a strongly evidenced element.

### 8.6 Stage F: Derive architecture-level inputs and outputs

Eligible inputs and outputs include:

- user commands and selections;
- files, URLs, streams, samples, and model inputs;
- domain payloads and session packages;
- sensor events and timestamps;
- analysis, judgment, scoring, coaching, and playback results;
- persisted domain entities and query results;
- explicit callback or message payloads.

Primitive types, standard collection wrappers, SwiftUI shapes/views, framework plumbing types, and incidental return values remain evidence but do not appear as C4 I/O unless the primitive itself has an explicit domain meaning.

## 9. Relationship Synthesis

### 9.1 One interaction fact, level-appropriate projection

Every physical interaction receives a stable fact identifier. Views project that fact at only the appropriate abstraction:

- L1 shows person-to-system and system-to-external intent;
- L2 aggregates component facts into container relationships;
- L3 shows component endpoints for the selected container;
- a view must not show both an aggregate relationship and its expanded component copies.

### 9.2 Behavioral labels

Labels contain:

1. technology/API on the first line;
2. concrete directional action and payload/intent on the second line.

Receiver-symbol wording such as `X 경계에 위임합니다` is replaced by behavior wording such as `정박 검출을 위임합니다` or `Song + BeatGrid 패키지를 전송합니다` when supported.

### 9.3 Pairing and direction

Send and receive evidence is paired using target pair, protocol/API, payload keys/types, and nearby handlers. Reply/callback flow becomes a separate reverse relationship only when reverse-direction source evidence exists.

## 10. Container Semantics

Container identity comes from executable/deployable/runtime boundaries. Its description and technology are summarized from child responsibilities and confirmed frameworks, not PBX metadata alone.

Examples of acceptable container descriptions:

- selects and analyzes audio, coordinates a practice session, and presents results;
- captures wrist motion, judges timing, and returns coaching feedback.

The generator must distinguish user-owned external files from an internal application database and must not introduce a datastore merely to improve visual notation.

## 11. Original-Guided Calibration and Reference Comparison

Reference comparison is optional for normal skill use but mandatory during RhythmTrainer development and regression testing. Its purpose is to reveal which interpretation rule failed, not merely which wording differs.

### 11.1 Calibration loop

1. Generate a model using only the project evidence.
2. Compare it with the hand-authored original.
3. Decompose each delta into actor goal, system value, boundary, responsibility, input/output, direction, payload, technology, or prose-depth differences.
4. Identify the failed interpretation stage.
5. Change a rule only if it can be stated without RhythmTrainer-specific names and improves at least one structurally different fixture.
6. Re-run all fixtures and reject changes that improve reference similarity by creating unsupported claims or regressions elsewhere.

This loop prevents hard-coded parity while still learning as much as possible from the original.

### 11.2 Comparison dimensions

Comparison scores semantic coverage separately from wording similarity:

- actor-goal recovery;
- system-value recovery;
- runtime-boundary recovery;
- responsibility coverage and over-merge/over-split behavior;
- input/output specificity;
- relationship direction, intent, payload, and technology;
- explanation depth;
- source-evidence support;
- generic-fallback rate;
- duplicate relationship-fact rate.

Exact Korean sentences, element positions, and element counts are not parity requirements.

### 11.3 Reference extraction

The comparator accepts:

- standalone explorer HTML with embedded architecture JSON; or
- canonical model JSON.

It normalizes names, types, hierarchy, technologies, responsibilities, relationships, and evidence references without changing either model.

### 11.4 Semantic alignment

Candidates align using weighted signals:

- C4 type and parent scope;
- normalized name and aliases;
- target/runtime ownership;
- responsibilities and domain terms;
- technologies and APIs;
- relationship neighborhood;
- payload and data-flow similarity.

The comparator records the score and reasons. Low-confidence matches remain unpaired rather than being forced.

### 11.5 Difference taxonomy

Each comparison result uses one of:

- `MATCH`: equivalent responsibility and flow;
- `RENAMED`: same responsibility, materially different name;
- `SPLIT`: one reference responsibility maps to several generated elements;
- `MERGED`: several reference responsibilities map to one generated element;
- `MISSING`: reference responsibility or relationship is absent;
- `ADDED`: current source supports a new responsibility or relationship;
- `SOURCE_CHANGED`: current source contradicts or supersedes the reference;
- `INSUFFICIENT_EVIDENCE`: the reference claim cannot be confirmed from current evidence.

### 11.6 Analysis report section

`c4-analysis.md` appends `원본 대비 의미 차이` containing, for every material delta:

- level and element/relationship;
- reference wording;
- generated wording;
- classification;
- why they differ;
- supporting current-source evidence;
- recommended action: synthesizer fix, source-change acknowledgement, or human review.

The comparator never silently copies reference wording into the generated model.

## 12. Skill Workflow and Resource Changes

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

To keep `SKILL.md` concise, detailed reasoning rules will live in:

- `references/semantic-interpretation-rules.md` — interpretation ladder, C4 decision table, responsibility boundaries, naming, narration, and I/O rules;
- `references/reference-comparison.md` — reference extraction, alignment, delta taxonomy, and calibration loop;
- `references/xcode-analysis-rules.md` — language/framework-specific evidence extraction only.

`SKILL.md` will explicitly route to the semantic rules for every generation and to the comparison rules only when a reference is supplied or a golden regression is being run.

## 13. Quality Gates

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
- an element cannot show the full observation-to-capability-to-responsibility interpretation chain;
- a rule improves RhythmTrainer parity but fails the project-neutral fixture check.

These are semantic gates. Fixed element-count parity with RhythmTrainer is explicitly not required.

## 14. Test Strategy

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

The regression records supported semantic-reference coverage, generic-fallback rate, over-merge count, unsupported-claim rate, and duplicate-fact count. Improvements must preserve or improve the same gates on the other fixtures.

### Negative tests

- utility classes do not become Components without responsibility evidence;
- `Bool`, `Double`, and SwiftUI geometry types do not become I/O;
- unmatched reference claims are not copied;
- callbacks do not create reverse arrows without receiver evidence;
- one WCSession fact is not duplicated across abstraction levels in one view.

## 15. Acceptance Criteria

The design is complete when:

- a project without a reference produces product-facing L1/L2/L3 explanations grounded in code;
- RhythmTrainer generation recovers its major user goal, iPhone/Watch responsibilities, audio analysis, motion judgment, coaching/scoring, connectivity, and persistence boundaries where supported;
- supplying the original explorer produces a readable, evidence-linked difference section;
- generic category labels are used only for insufficient-evidence fallbacks;
- every final element and relationship can be traced to evidence;
- the standard explorer interaction and layout contracts remain unchanged;
- L4 is never generated.
- the implementation can explain how each final sentence was derived through the interpretation ladder;
- a RhythmTrainer parity improvement is accepted only when the underlying rule also applies to at least one unrelated fixture.

## 16. Delivery Boundary

Implementation will modify the reusable skill instructions, semantic synthesizer, model normalization/comparison support, analysis report, tests, and regenerated artifacts. It will not modify the supplied Xcode project, copy unsupported reference text, or redesign the established product shell.
