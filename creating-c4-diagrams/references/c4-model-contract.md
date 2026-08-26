# Canonical C4 Model Contract

Read this reference when producing or inspecting `raw-c4-model.json` and `c4-model.json`.

## One model, three abstraction levels

The output contains one canonical hierarchy. Views reference canonical IDs; they never copy elements into separate per-view models.

```text
Software System
└── Container
    └── Component
```

- Person and external Software System elements have no parent.
- An owned Container has exactly one Software System parent.
- A Component has exactly one Container parent and is not independently deployable.
- Source files, classes, functions, DTOs, models, and SwiftUI views are evidence. They are not automatically Components.
- L4 Code diagrams are outside the contract.

## Literal types

```typescript
type Confidence = "confirmed" | "inferred" | "review-required";
type ElementType = "Person" | "Software System" | "Container" | "Component";
type Evidence = {
  file: string;
  line?: number;
  symbol?: string;
  reason: string;
};
type C4Element = {
  id: string;
  type: ElementType;
  name: string;
  description: string;
  parentId?: string;
  technology?: string;
  visualRole: string;
  tags: string[];
  external?: boolean;
  responsibilities: string[];
  inputs: Array<{ name: string; evidence: Evidence[] }>;
  outputs: Array<{ name: string; evidence: Evidence[] }>;
  implementationStatus: "active" | "external" | "review-required" | "gap";
  evidenceSummary?: string;
  evidence: Evidence[];
  confidence: Confidence;
};
type C4Relationship = {
  id: string;
  from: string;
  to: string;
  description: string;
  technology?: string;
  purpose?: string;
  payload?: string;
  senderEvidence: Evidence[];
  receiverEvidence: Evidence[];
  evidence: Evidence[];
  confidence: Confidence;
};
type C4View = {
  id: string;
  level: 1 | 2 | 3;
  scopeId: string;
  title: string;
  description: string;
  elementIds: string[];
  relationshipIds: string[];
  layoutConfiguration: {
    direction: "TopBottom" | "BottomTop" | "LeftRight" | "RightLeft";
    rankSeparation: number;
    nodeSeparation: number;
    relationshipSeparation: number;
  };
};
```

## Required element fields

Every element requires a stable ID, specific name, responsibility/value description, visual role, evidence, and confidence. Every Container and Component also requires technology. Components require at least one responsibility, one input, one output, and representative evidence from two or more source locations when the project contains those signals. Keep representative evidence bounded (normally 2–18 entries) and summarize the full evidence count separately.

Every element also has deterministic tags. The required tags are ordered as `Element`, the literal C4 type, and the default visual role. User-supplied tags follow those required tags and are stably de-duplicated.

Default visual roles:

| C4 type | Condition | Visual role |
|---|---|---|
| Person | always | `person` |
| Software System | owned | `software-system` |
| Software System | external | `external-system` |
| Container | owned data schema/store | `data-store` |
| Container | other runtime | `application-container` |
| Component | always | `component` |

## Required relationship fields

- `from` and `to` name existing IDs and express one direction only.
- `description` is a specific verb phrase that agrees with the direction.
- Direct communication between distinct Containers requires technology/protocol.
- Put the concrete API/protocol in `technology`, the business action in `description`, the architectural reason in `purpose`, and exchanged data in `payload`.
- Preserve sender and receiver evidence separately. A relationship may be `confirmed` as paired only when both sides are present.
- Opposing communication is two relationships.
- Aggregate repeated low-level calls only when they express the same architectural intent and protocol.
- Do not create the receiving direction of a send call unless receiver evidence exists.

## Confidence

| Value | Meaning |
|---|---|
| `confirmed` | Direct target, setting, call, data-flow, or symbol-use evidence |
| `inferred` | Multiple structural signals support the conclusion |
| `review-required` | The model needs the item but evidence is weak or ambiguous |

Confidence affects inspection metadata and reporting, never the C4 type or visual shape.

## View inclusion

## View configuration

Views reference canonical element and relationship IDs only; they never duplicate semantic element or relationship fields. Each view declares `layoutConfiguration` with one of `TopBottom`, `BottomTop`, `LeftRight`, or `RightLeft`. Invalid or omitted directions default to `LeftRight` to preserve the product's left-to-right layout. Separations are normalized to these minimums: `rankSeparation` 112, `nodeSeparation` 72, and `relationshipSeparation` 28.

### L1 System Context

- Scope is one owned Software System.
- Include that system and directly connected people and external Software Systems.
- Exclude Containers, Components, frameworks, APIs, and technologies.
- Relationship technology is empty at this level.
- An external user-owned file store may use the data-store silhouette, but remains an external Software System rather than an owned Container.

### L2 Container

- Scope is one Software System.
- Include its direct Containers.
- Include people and external Software Systems directly connected to those Containers.
- Exclude Components.
- Show inter-container protocol/technology.

### L3 Component

- Scope is exactly one Container.
- Include Components whose `parentId` is that Container.
- Include people, other Containers, and external Software Systems directly connected to those Components.
- Never include Components from another Container.
- Supporting Containers can appear when directly connected, but never receive another drilldown from inside L3. L4 is forbidden.

## Repair and issue contract

Normalization performs one deterministic repair pass and records every change.

| Code | Result |
|---|---|
| `element-id-generated` | Generate a stable missing ID |
| `element-duplicate-removed` | Preserve the first record and remove the duplicate |
| `element-invalid-parent-removed` | Remove an element outside the C4 hierarchy |
| `relationship-dangling-removed` | Remove a relationship with a missing endpoint |
| `relationship-duplicate-removed` | Remove an exact architectural duplicate |
| `*-description-defaulted` | Insert an explicit unknown description and downgrade confidence |
| `relationship-technology-required` | Preserve the relationship but report missing inter-container protocol |
| `evidence-required` | Preserve the item but require review because evidence is absent |

Recoverable issues remain in inspection and validation output. They do not justify inventing an element, relationship, or L4 view.
