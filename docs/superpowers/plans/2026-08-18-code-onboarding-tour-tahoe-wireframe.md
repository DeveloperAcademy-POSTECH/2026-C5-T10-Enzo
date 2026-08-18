# Code Onboarding Tour Tahoe Wireframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a fully editable Figma desktop wireframe that covers the approved code-structure onboarding MVP flows in a macOS Tahoe visual language.

**Architecture:** Use one new Figma Design file with a `Wireframes` page, local Tahoe-inspired visual foundations, reusable local components for repeated UI, and six top-level desktop screen frames. Build the flow from developer management screens to the team-member tour and rating journey, validating each major section with Figma screenshots.

**Tech Stack:** Figma Design, Figma Plugin API via `use_figma`, Figma local variables/styles, Figma screenshots.

## Global Constraints

- Create a new Figma **Design** file in the authenticated user's drafts; do not require a pre-existing file from the user.
- Produce exactly these primary flows: project list, project registration, analysis result, tour editor, team tour, and completion/rating.
- Use `Context → 구조 → 핵심 플로우` as the only team-tour order.
- Never expose code bodies, function names, method names, or variable names in the team-facing wireframes.
- Distinguish project states `등록됨`, `분석 완료`, `투어 초안`, `검토 완료`, and `발행됨`.
- Keep wireframe sample content in Korean and mark AI-produced copy as `AI 분석 기반 초안` or `AI 분석 기반 설명`.
- Use a desktop frame width of 1440 px and auto-layout for all structurally related children.
- Use the available SF Pro font family if listed by Figma; otherwise use the closest available system sans-serif font returned by `figma.listAvailableFontsAsync()`.
- Validate every major screen with a screenshot before constructing the next screen.

---

## File Structure

- Create: Figma Design file `코드 구조 온보딩 투어 — Tahoe Wireframe` — editable design artifact holding pages, variables, components, and six screen frames.
- Create: Figma page `Wireframes` — contains all screens in left-to-right reading order.
- Create: Figma page `Components` — contains local reusable components and foundations.
- Create: `docs/superpowers/plans/2026-08-18-code-onboarding-tour-tahoe-wireframe.md` — implementation record for this artifact.

### Task 1: Create and inspect the Figma document

**Files:**
- Create: Figma Design file `코드 구조 온보딩 투어 — Tahoe Wireframe`
- Create: Figma page `Components`
- Create: Figma page `Wireframes`

**Interfaces:**
- Consumes: authenticated Figma plan key from `whoami`.
- Produces: `fileKey`, `componentsPageId`, and `wireframesPageId` for all later Figma calls.

- [ ] **Step 1: Resolve the Figma plan and create the draft file**

Call `figma_whoami`; if it returns one plan, use its `key` unchanged. Then call `figma_create_new_file` with:

```json
{
  "editorType": "design",
  "fileName": "코드 구조 온보딩 투어 — Tahoe Wireframe",
  "planKey": "<key returned by whoami>"
}
```

Expected: one `file_key` and one Figma design URL.

- [ ] **Step 2: Inspect the empty document and available fonts**

Run a read-only `use_figma` script that returns all page IDs/names plus the available font families matching `SF`, `Helvetica`, or `Inter`.

```js
const fonts = await figma.listAvailableFontsAsync();
return {
  pages: figma.root.children.map(p => ({ id: p.id, name: p.name })),
  matchingFonts: fonts.filter(f => /SF|Helvetica|Inter/i.test(f.fontName.family)).slice(0, 30)
};
```

Expected: an initial page and a verified font name/style pair; no canvas mutations.

- [ ] **Step 3: Create working pages and validate their hierarchy**

Create or rename pages so that `Components` and `Wireframes` exist. Put `Wireframes` first so subsequent Figma calls start on the screen canvas.

```js
const createdNodeIds = [];
const first = figma.root.children[0];
first.name = 'Wireframes';
createdNodeIds.push(first.id);
const components = figma.createPage();
components.name = 'Components';
createdNodeIds.push(components.id);
return { createdNodeIds, wireframesPageId: first.id, componentsPageId: components.id };
```

Expected: two named pages with no accidental top-level screen nodes.

- [ ] **Step 4: Verify page setup**

Run the page-list read script again. Expected: `Wireframes` and `Components` are both returned exactly once.

### Task 2: Build Tahoe foundations and reusable components

**Files:**
- Modify: Figma page `Components`

**Interfaces:**
- Consumes: `componentsPageId`, verified font family and style.
- Produces: component IDs for `App Sidebar`, `Status Badge`, `Primary Button`, `Secondary Button`, `AI Notice`, and `Step Progress`.

- [ ] **Step 1: Create scoped local color variables**

On `Components`, create a local `Tahoe Wireframe` variable collection with a Light mode and specific scopes. Use these semantic values: `surface/base` #F4F7FB, `surface/glass` white at 72% opacity, `text/primary` #182230, `text/secondary` #687586, `stroke/subtle` #D8E0EA, `accent/blue` #1677FF, `state/success` #3DAA72, `state/warning` #E8A12C.

Expected: color variables use `FRAME_FILL`/`SHAPE_FILL` or `TEXT_FILL` scopes; opacity belongs to paint, not color values.

- [ ] **Step 2: Create reusable components with auto-layout**

Create one local component for each recurring unit: sidebar navigation item, status badge, primary button, secondary button, AI notice banner, and `n / total` step-progress control. Give each component a concise Korean description stating where it is used.

Expected: all controls are components, not repeated primitive groups; text nodes use the verified font.

- [ ] **Step 3: Screenshot and inspect foundations**

Capture the full `Components` section at 1× scale. Expected: no clipped text, visually distinct primary/secondary actions, and readable status colors.

### Task 3: Create the project list and project-registration screens

**Files:**
- Modify: Figma page `Wireframes`

**Interfaces:**
- Consumes: sidebar, status badge, buttons, AI notice, Tahoe variables.
- Produces: `projectListFrameId` and `registrationFrameId`.

- [ ] **Step 1: Create the project-list wrapper**

Create a 1440 px desktop frame named `01 프로젝트 목록` with a 248 px left sidebar and a main content area. Add a title `프로젝트`, a `새 프로젝트 등록` primary action, and a developer-space label.

Expected: frame appears at least 200 px to the right of existing top-level content and uses a soft base surface.

- [ ] **Step 2: Add project cards and state information**

Place three project cards including `RhythmTrainer`. Each card shows project name, local path, current status, final analysis time, publication state, and current publication’s average rating. Use sample state variety: `발행됨`, `투어 초안`, and `등록됨`.

Expected: every card exposes `열기`, `재분석`, and deletion affordances; the primary card shows `평균 4.3`.

- [ ] **Step 3: Create the registration screen**

Create `02 프로젝트 등록` with a visible folder-selection field, editable proposed project name, optional PRD textarea, optional core-flow textarea, inline path error state, and a disabled/enabled analysis-start action example.

Expected: required-path validation is attached immediately below the path control and optional fields remain labelled as optional.

- [ ] **Step 4: Validate both screens**

Screenshot each frame separately. Expected: the list has a clear visual hierarchy; the registration screen makes the invalid-path reason and the start action state obvious.

### Task 4: Create analysis-result and tour-editor screens

**Files:**
- Modify: Figma page `Wireframes`

**Interfaces:**
- Consumes: foundations and components from Task 2; screen placement after Task 3.
- Produces: `analysisFrameId` and `editorFrameId`.

- [ ] **Step 1: Create the analysis-result screen**

Create `03 분석 결과` with a project header, a left structure tree, an excluded-items panel, and a right summary with `투어 초안 생성` action. Use folder/file labels only, including `src`, `components`, `data`, `README.md`, and exclusion reasons for `node_modules`, `.git`, and a binary asset.

Expected: no code snippets or implementation identifiers appear; scanning errors retain the successful tree items.

- [ ] **Step 2: Create the tour-editor screen**

Create `04 투어 편집` containing three clear sections: `Context`, `구조`, and `핵심 플로우`. Use a draft notice, reorderable step rows, one role explanation and one metaphor per row, related-file chips capped at two, and a 3–7 step core-flow indicator.

Expected: sample content describes a project in natural language and makes `AI 분석 기반 초안` visible.

- [ ] **Step 3: Add publication readiness feedback**

Add a right-side review panel showing Context complete, structure complete, and core flow incomplete. Show a disabled `발행하기` button with the exact missing-state message `핵심 플로우 3단계를 완성하면 발행할 수 있습니다.` Also show a current published-version card that remains available during re-analysis.

Expected: publishing rules and draft-versus-published separation are immediately legible.

- [ ] **Step 4: Validate editor screens**

Screenshot `03 분석 결과` and `04 투어 편집`. Expected: tree labels are readable, no progress controls overlap, related file counts never exceed two, and publication feedback is unambiguous.

### Task 5: Create the team-member tour and completion/rating screens

**Files:**
- Modify: Figma page `Wireframes`

**Interfaces:**
- Consumes: step-progress, AI notice, buttons, and example project content.
- Produces: `teamTourFrameId` and `ratingFrameId`.

- [ ] **Step 1: Create the team-tour Context state**

Create `05 팀원용 가이드 투어` with a calm, distraction-free content card. Start with Context and show project purpose, familiar-language start/end points, `1 / 5` progress, the AI-analysis disclosure, and previous/next controls.

Expected: no source-code body or forbidden implementation terms are visible.

- [ ] **Step 2: Add structure, core-flow, and detail states in the same screen**

Place three adjacent state panels labelled `구조`, `핵심 플로우`, and `더 보기`. Structure shows one folder/file target, role, and metaphor. Core flow shows ordered natural-language steps from user action to result. Detail shows at most two related files and always includes `메인 흐름으로 돌아가기`.

Expected: left-to-right state order remains Context → 구조 → 핵심 플로우; the detail panel visibly returns to the primary flow.

- [ ] **Step 3: Create completion and rating screen**

Create `06 완료 · 이해도 평가` with a five-star rating control, short completion copy, and a conditional low-score area that appears at 3 stars or below. Include `어려웠던 단계를 다시 보기` and a list of reusable step links.

Expected: a 1–5 selection is unmistakable, the revisit action is shown for low understanding, and the submission button is present.

- [ ] **Step 4: Validate team screens**

Screenshot the team-tour frame and rating frame. Expected: progress, navigation, detail return, stars, and low-score revisit flow are all readable at desktop scale.

### Task 6: Perform final visual QA and hand off the Figma file

**Files:**
- Modify: Figma Design file `코드 구조 온보딩 투어 — Tahoe Wireframe`

**Interfaces:**
- Consumes: all six frame IDs and foundation component IDs.
- Produces: polished editable Figma file URL and final screenshot evidence.

- [ ] **Step 1: Inspect frame hierarchy and count**

Run a read-only script on `Wireframes` that returns every top-level frame name, width, height, and child count.

Expected: exactly six top-level numbered desktop frames (`01` through `06`), all 1440 px wide.

- [ ] **Step 2: Verify the rendered font**

Read all free-standing text nodes and return distinct `fontName.family` values. Expected: each matches the verified system font selected in Task 1; no unintended fallback family appears.

- [ ] **Step 3: Take final desktop screenshots**

Capture each of the six frames individually and inspect for clipped text, overlapping panels, missing state badges, wrong-language labels, or blank interactive areas. Correct only the affected nodes and re-capture after each correction.

Expected: all primary actions, status states, and the team-tour order are visible without overlap.

- [ ] **Step 4: Deliver the editable file**

Provide the Figma design URL, state that it was created in the user’s drafts, and summarize the six screen frames plus the reusable components. Include the design-plan document link for traceability.

Expected: the user can open and edit the Figma wireframe directly.
