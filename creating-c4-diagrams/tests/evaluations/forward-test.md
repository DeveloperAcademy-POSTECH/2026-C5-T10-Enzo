# Creating C4 Diagrams Forward Evaluation

Evaluation date: 2026-08-26
Method: deterministic forward runs through the completed public pipeline in fresh temporary output directories. The sample run uses an evidence-backed Phase 2 synthesis seam; the structurally different macOS run deliberately throws during Phase 2 to exercise the documented conservative fallback. Both inputs are checksum-verified after execution.

## Scenario A — TempoCoach iOS + watchOS project

Command:

```bash
node --test creating-c4-diagrams/tests/end-to-end.test.mjs
```

Observed result:

- Six progress events occurred in order: scan, synthesize, normalize, layout, build, validate.
- Five artifacts were written: `tempocoach-c4-explorer.html`, `c4-model.json`, `c4-analysis.md`, `validation-report.json`, and `workspace.dsl`.
- Model view levels were `[1, 2, 3, 3]`.
- The system contained sibling `iphone-app` and `watch-app` runtime Containers plus the owned `rhythm-store` Data Store Container.
- `WCSession.transferUserInfo` remained relationship technology on the observed iPhone-to-Watch direction.
- CoreMotion remained Component technology; neither CoreMotion nor WatchConnectivity became a Software System.
- No reverse Watch-to-iPhone relationship was invented from sender-only evidence.
- No `PracticeView` or `PracticeSession` source type was promoted directly to a Component.
- Validation had zero errors. Model, views, geometry, offline runtime, interaction runtime, accessibility, DSL parity, and L4-absence checks were all `true`.

## Scenario B — FocusNotes macOS generalization and recovery

Command:

```bash
node --test creating-c4-diagrams/tests/end-to-end.test.mjs
```

Observed result:

- Five artifacts were written: `focusnotes-c4-explorer.html`, `c4-model.json`, `c4-analysis.md`, `validation-report.json`, and `workspace.dsl`.
- Model view levels were `[1, 2, 3]`.
- Exactly one macOS application Container and one conservative entry-responsibility Component were emitted.
- One owned data-store Container aggregated the directly observed SwiftData and Foundation file-write evidence.
- watchOS, WCSession, CoreMotion, and mobile-only Containers were not invented.
- Every fallback element and relationship was marked `review-required`.
- Both analysis and validation recorded `semantic-synthesis-fallback`.
- Validation had zero errors and every required check was `true`.

## Acceptance scenarios

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | iOS and watchOS targets become sibling Containers inside one Software System. | PASS | `iphone-app` and `watch-app` share parent `tempo-coach`; L2 contains both. |
| 2 | WatchConnectivity becomes relationship technology, not a Container. | PASS | `syncs-session.technology` is `WCSession.transferUserInfo`; no WatchConnectivity element exists. |
| 3 | SwiftData becomes an owned Data Store Container when the schema is project-owned. | PASS | `rhythm-store` has `visualRole: data-store` and `technology: SwiftData`. |
| 4 | CoreMotion remains implementation technology; it does not become a Software System. | PASS | CoreMotion appears only on `motion-sampler.technology`. |
| 5 | User/externally owned Files or HealthKit remain external; entitlements alone do not prove runtime use. | PASS | The fixture's iCloud entitlement alone did not create a node; the ownership and direct-use gates were applied. |
| 6 | Protocol-plus-implementation responsibilities can form Components; individual Views and DTOs do not. | PASS | Responsibility Components were emitted; `PracticeView` and `PracticeSession` were not emitted as Component names. |
| 7 | Output reaches complete HTML after a recoverable warning. | PASS | Forced semantic synthesis failure produced all five FocusNotes artifacts and recorded the fallback warning. |

## Mutation and boundary checks

- L4 view mutation is rejected by `view-level-4-forbidden`.
- A Component directly under a Software System is removed and reported by `element-invalid-parent-removed`.
- Missing technology on an inter-container relationship is reported by `relationship-technology-required`.
- Shells with zero or two `__C4_MODEL_JSON__` placeholders are rejected.
- Hostile project names are slugged, and every generated artifact remains inside the selected output directory.
- External runtime URLs, `fetch`, module imports, and unsafe `</script>` model text are rejected or escaped.

## Outcome

The completed skill closes the baseline gaps: it produces the complete five-artifact contract, maintains one canonical L1-L3 model, keeps Apple frameworks as technology, avoids unobserved reverse relationships, provides deterministic text-safe layout, preserves the fixed offline explorer interactions, validates `workspace.dsl` semantic parity, and records recoverable uncertainty instead of stopping before HTML generation.
