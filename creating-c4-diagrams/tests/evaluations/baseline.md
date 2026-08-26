# Creating C4 Diagrams — No-skill Baseline

## Scenario

An independent clean-context evaluator received only this request and the `sample-xcode-project` fixture:

> Analyze the Xcode fixture and create a complete, offline, interactive C4 explorer with L1, L2, and L3 views. Preserve the fixture, do not ask follow-up questions, and write results to a temporary output directory.

The evaluator did not receive the approved design spec, implementation plan, existing RhythmTrainer explorer, or a `creating-c4-diagrams` skill.

## Observed result

Temporary output: `/private/tmp/tempocoach-c4-baseline.KDUTWx`

Artifacts created:

- `index.html`
- `architecture.json`
- `README.md`

The HTML was self-contained and included three manually curated views, node/relationship selection, an evidence inspector, pan, zoom, fit, search, and type filters. The evaluator validated JavaScript syntax, JSON parsing, and internal view references, but reported that no headless browser was available for rendered verification.

## RED findings

This is a valid failing baseline because it misses and violates multiple approved contracts:

1. **Output contract is incomplete.** It produced three differently named artifacts instead of the five contracted artifacts: `<project>-c4-explorer.html`, `c4-model.json`, `c4-analysis.md`, `validation-report.json`, and `workspace.dsl`.
2. **There is no canonical C4 model contract.** `architecture.json` stores `scope.levels` name arrays and a separate relationship list rather than stable element, relationship, and view IDs derived from one hierarchy.
3. **Apple frameworks were promoted to external architecture elements.** WatchConnectivity became “Paired-device channel / Apple connectivity services” and Core Motion became “Device motion service / Apple Watch sensors.” They should remain relationship or implementation technology unless an independently owned external system is evidenced.
4. **L3 is too code-shaped.** `TempoCoachApp`, `PracticeView`, and the `PracticeSession` data entity were emitted as individual Components. A SwiftUI view, composition-root type, file, or entity alone is not a C4 Component.
5. **Unsupported relationships were invented.** The model added reverse WatchConnectivity delivery relationships even though receiver handlers were absent. Marking them inferred does not make an unevidenced architectural relationship valid.
6. **The fixed product shell was not reused.** The result lacks the proven left Views/Layers panel, right inspector structure, explicit drilldown footer contract, panel frame preservation, Spacebar-only temporary Hand behavior, and the required progressive relationship disclosure modes.
7. **Geometry and accessibility were not validated against the approved invariants.** There is no machine-readable text-bound, node-spacing, boundary-containment, route-collision, focus, increased-contrast, or reduced-motion report.
8. **Failure recovery is undocumented and unenforced.** The generated README describes uncertainty, but there is no validation JSON containing repairs, warnings, and confidence counts, and no demonstrated path that still produces HTML after partial source-parse failures.

## Recorded evaluator choices

The evaluator explicitly reported these shortcuts or uncertainties:

- “WatchConnectivity delivery directions are dashed/inferred because send calls exist but counterpart receivers do not.”
- “iCloud is shown as configured-only; runtime use and target association are unverified.”
- “The SwiftData store is modeled as an L2 embedded data-store container.”
- “Rhythm practitioner is inferred from UI labels.”
- Rendered screenshot testing was omitted because a local headless browser executable was unavailable.

These observations show that the fixture exposes the intended ambiguity: a capable evaluator can build a plausible diagram, but without reusable classification, model, layout, shell, and validation contracts it produces inconsistent C4 semantics and incomplete deliverables.

## Skill acceptance scenarios

1. iOS and watchOS targets become sibling Containers inside one Software System.
2. WatchConnectivity becomes relationship technology, not a Container.
3. SwiftData becomes an owned Data Store Container when the schema is project-owned.
4. CoreMotion remains implementation technology; it does not become a Software System.
5. Files/HealthKit remain external Software Systems when project ownership is absent.
6. Protocol-plus-implementation clusters can form Components; individual Views and DTOs do not.
7. Output reaches a complete HTML even when one Swift file produces a warning.

## Fixture validation

- The entitlement plist passes `plutil -lint`.
- The Xcode fixtures contain three `PBXNativeTarget` blocks and matching `PBXSourcesBuildPhase` memberships.
- The Swift sources contain direct protocol, dependency-injection, persistence, WatchConnectivity, Core Motion, and user-entry evidence.
- No fixture build is required for static architecture analysis.

## Fixture baseline

```text
89f04f3f627135b247570e643df983cc7f201b4332bb45e73b254054cbc16dab  creating-c4-diagrams/tests/fixtures/minimal-macos-project/FocusNotes.xcodeproj/project.pbxproj
2c49630f28171d884a1eb7ff4f989d71ea2860de567ba3d2448262da2dd37ca3  creating-c4-diagrams/tests/fixtures/minimal-macos-project/FocusNotes/FocusNotesApp.swift
271c802733df90cc5f29decf06b7385323c6124847571f29d640061230122780  creating-c4-diagrams/tests/fixtures/minimal-macos-project/FocusNotes/NoteStore.swift
c09322e1b754ec5e229a955e4403147cdc871fb2e73ecef47a464ebfe52d341a  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoach.entitlements
4ed74aaa72decedb52185c3956baa5e1f9a857573c81910556060f0e54747985  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoach.xcodeproj/project.pbxproj
4980848b36ff711f982d50e619d64a0811d5d8e74042b781d49c125197b4248a  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoach/PracticeView.swift
b6a669ca2cc762968d6f2f8a40be00358a96d757b009e4cd3d0c99885cece4fd  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoach/RhythmStore.swift
13596f4969a476bb823f551bf21a7408019efbc4925cea0f9aa777ef8d8ada53  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoach/SessionBridge.swift
0631109d96133a92109a6bedbeb7fd58cb4013c97a77458bb5d4d3244d0e84b5  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoach/TempoCoachApp.swift
bcfb188c750b1234a9d68634d2118664dab0b76dfc4ceeecc848b88c61195401  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoachWatch/MotionSampler.swift
b3a7f3173557a5bf1a8df92238ae58d905f25f43fc5f2d46881257f92bf5d3d7  creating-c4-diagrams/tests/fixtures/sample-xcode-project/TempoCoachWatch/TempoCoachWatchApp.swift
```
