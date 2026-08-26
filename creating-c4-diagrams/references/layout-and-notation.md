# Layout and Notation Contract

Read this reference before running layout or changing the explorer shell. Geometry belongs to a view because the same canonical element can appear at different positions in L1, L2, and L3.

## Fixed spacing tokens

| Token | Value |
|---|---:|
| Canvas outer margin | 144 units |
| Node gap | 280 units |
| Row gap | 176 units |
| Boundary title band | 72 units |
| Relationship lane separation | 36 units |
| Label-node clearance | 28 units |
| Label-label clearance | 20 units |
| Idle relationship opacity | 0.15 |
| Muted relationship opacity | 0.06 |
| Focused relationship opacity | 1.0 |

Grow the SVG world when content needs room. Do not reduce node padding, type size, or relationship clearance to force a compact canvas.

## Semantic notation

| Role | Shape and treatment |
|---|---|
| Person | Human silhouette enclosing a readable content surface |
| Software System in scope | Blue document/system card with folded corner |
| Application Container | Blue window/device card with a distinct runtime header |
| Data Store Container | Cylinder/store silhouette with readable inset surface |
| Component | Compact rounded responsibility card inside one Container boundary |
| External Software System | Neutral gray system/store shape; never use blue ownership styling |
| Boundary | Dashed, labelled ownership/scope rectangle behind its members |

Shape communicates semantic role; color communicates ownership/emphasis. Confidence is inspector metadata and must not alter the C4 shape.

Every view has a title, scope description, and legend. L1 shows the system as a node. L2 uses a Software System boundary. Each L3 view uses one Container boundary.

## Node measurement

- Measure name, technology, and responsibility before placement.
- Use conservative character-width estimates for Korean and English.
- Preserve fixed internal padding and line height.
- Wrap text and increase height; never let text escape or shrink to fit.
- Reserve a common footer area for drilldown only on navigable L1/L2 nodes.

## Semantic placement

### L1

People sit left, the system in scope sits centrally, and external systems sit right. All primary shapes share one bottom baseline and use a common horizontal connection lane when possible.

### L2

Owned Containers sit inside the Software System boundary. Rank entry/presentation applications first, coordination/processing next, and integration/data-store roles last. People remain outside on the left and external systems outside on the right. Container centers and relationship ports align by row.

### L3

Only Components belonging to the scoped Container sit inside its boundary. Rank presentation, coordination, domain processing, and adapter/repository/persistence responsibilities in that order. Supporting people, other Containers, and external systems remain outside.

## Final relationship geometry

Layout is the sole authority for relationship geometry. It routes relationships only after final node measurement and placement, preserving the stable order in `view.relationshipIds`. Every current relationship layout has `geometryVersion: 2`, source and target boundary ports, a complete orthogonal `vertices` polyline, and measured label geometry. Parallel lanes use the view's normalized `relationshipSeparation`; candidates that traverse an unrelated node rectangle are rejected.

`label.x` and `label.y` are the label center coordinates because the SVG renderer applies a center transform. Collision checks convert a label to `{ x: label.x - label.width / 2, y: label.y - label.height / 2, w: label.width, h: label.height }`. Labels prefer the first sufficiently long segment near the source, then the corresponding segment near the target, then remaining route segments in order. Placement reserves both label-node and label-label clearance. If no existing segment can hold a label without collision, layout adds a dedicated outer lane and grows the SVG world instead of overlaying content or compressing text and nodes.

The browser render contract is exact: it renders `geometryVersion: 2` ports, vertices, and label geometry verbatim. It must not reroute, remeasure, or repair current geometry. Selection changes relationship opacity and label visibility only: idle lines are 15% with hidden labels, selected-neighbor lines are 100% with labels, unrelated selected-state lines are 6%, and full-relation mode shows all lines and labels at 100%. A browser-side legacy routing fallback is permitted only when `geometryVersion !== 2`.
