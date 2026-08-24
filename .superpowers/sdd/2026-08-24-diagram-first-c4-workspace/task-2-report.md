# Task 2 report: explicit workspace state and diagram-first shell

## Implementation summary

- Added `createWorkspaceState()` with the required immutable workspace shape and `reduceWorkspace(model, state, action)` for independent panel, selection, tab, and canvas-tool transitions.
- Replaced the document-style hero/content/footer markup with full-viewport workspace chrome and stable IDs: `left-panel`, `diagram-viewport`, `diagram-svg`, `right-inspector`, `top-toolbar`, and `canvas-tools`.
- Preserved the embedded C4 model and existing navigation/evidence/relationship helpers, while adapting rendering to the new diagram SVG and inspector shell.
- Moved the former provenance footer values into `model.meta.provenance` for later Inspector rendering.

## RED/GREEN evidence

RED: after adding the two contract tests, the focused command failed as expected:

```text
✖ starts as a diagram-first workspace and reduces panel state independently
  TypeError: api.createWorkspaceState is not a function
✖ declares full-viewport workspace chrome instead of document sections
  AssertionError: The input did not match /id="left-panel"/
ℹ pass 0
ℹ fail 2
```

GREEN: after implementing the reducer and shell, the focused command passed 2/2 tests. The final full test run passed 13/13 tests.

## Exact test commands and output

```bash
node --test --test-name-pattern="diagram-first workspace|full-viewport workspace" tests/rhythmtrainer-c4-explorer.test.mjs
```

Final output: `ℹ tests 2`, `ℹ pass 2`, `ℹ fail 0`.

```bash
node --test tests/rhythmtrainer-c4-explorer.test.mjs
```

Final output: `ℹ tests 13`, `ℹ pass 13`, `ℹ fail 0`.

```bash
git diff --check
```

Final output: no whitespace errors.

## Files changed

- `rhythmtrainer-c4-explorer.html`
- `tests/rhythmtrainer-c4-explorer.test.mjs`
- `.superpowers/sdd/2026-08-24-diagram-first-c4-workspace/task-2-report.md`

The pre-existing untracked `output/` directory was not staged or altered.

## Self-review

- Verified required DOM IDs and removal of the relationship-summary/provenance document sections through focused contract tests.
- Verified the reducer returns copied state and leaves panel state independent during the required selection flow.
- Verified existing model validation, navigation, evidence, relationship-label, and responsive-layout tests remain green.
- Checked the final diff for whitespace errors.

## Concerns

- Legacy CSS selectors and the exported relationship-summary helper remain for compatibility with existing rendering tests; no legacy document sections are present in the new shell.
- SVG relationship rendering still uses the existing fixed 1020×640 coordinate space; later SVG-focused work can refine viewport transforms and pan/zoom state.
