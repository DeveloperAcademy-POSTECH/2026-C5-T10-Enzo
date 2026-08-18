# C1–C3 Process Rail Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the static Tahoe wireframe's team-member tour from C1-only narrative cards to a five-step C1–C3 process rail with concrete responsibility and handoff information.

**Architecture:** Keep the prototype as one dependency-free `index.html` document. Extend its existing tour data model so each stage owns semantic level, target, responsibility, input, decision, output, connection reason, check question, related elements, and an optional supporting analogy. Render the process rail and the active stage card from that model; retain the existing screen navigation and rating behavior.

**Tech Stack:** Semantic HTML, CSS, vanilla JavaScript, Node.js built-in test runner, Playwright CLI.

## Global Constraints

- Preserve all six MVP screens and their existing navigation targets.
- Keep C4 details out: do not add code bodies, function names, method names, variable names, or call graphs.
- The tour contains exactly five steps: one C1, two C2, and two C3 steps.
- Every tour step exposes responsibility, input, decision, output, connection reason, and a team-member check question.
- The rail uses visible text labels for level, order, state, and handoff; color alone must not communicate state.
- The rail becomes a vertical timeline at `max-width: 900px`; it must not require horizontal scrolling.
- Preserve keyboard focus styles, 44px minimum interactive controls, `prefers-reduced-motion`, and existing rating behavior.

---

### Task 1: Lock the process-rail contract with static regression tests

**Files:**
- Modify: `tests/wireframe.test.mjs`
- Test: `tests/wireframe.test.mjs`

**Interfaces:**
- Consumes: `index.html` as a UTF-8 string.
- Produces: regression checks for C1–C3 labels, the semantic process rail, and the concrete-stage detail fields that Task 2 must render.

- [ ] **Step 1: Write the failing test**

```js
test('renders a five-step C1–C3 process rail with concrete handoffs', () => {
  for (const label of ['C1 · Context', 'C2 · Workspace', 'C3 · Input', 'C2 · Evaluation', 'C3 · Result']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /id="process-rail"/);
  assert.match(source, /aria-current="step"/);
  assert.match(source, /inputLabel/);
  assert.match(source, /outputLabel/);
});

test('renders a team-member check point and connected-element details', () => {
  assert.match(source, /팀원이 확인할 포인트/);
  assert.match(source, /연결 관계/);
  assert.match(source, /관련 요소 더 보기/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/wireframe.test.mjs`

Expected: FAIL because the current one-dimensional tour lacks the C1–C3 labels, process-rail identifier, and concrete content fields.

- [ ] **Step 3: Keep the tests isolated from visual implementation**

Do not test CSS pixel values. Keep checks limited to visible labels, semantic identifiers, and field names so the test protects the content hierarchy without freezing the visual design.

- [ ] **Step 4: Run test to verify the untouched prototype still has the intended red state**

Run: `node --test tests/wireframe.test.mjs`

Expected: the two new tests fail while the three existing smoke tests pass.

- [ ] **Step 5: Commit**

Do not commit this task independently; the test and implementation form one reviewable static-prototype change in Task 2.

### Task 2: Render the C1–C3 rail and concrete stage card from tour data

**Files:**
- Modify: `index.html` — tour markup, visual styles, stage data, and render function.
- Modify: `tests/wireframe.test.mjs` — retain Task 1 regression tests.
- Test: `tests/wireframe.test.mjs`

**Interfaces:**
- Consumes: a five-entry `tour` array whose entries have `level`, `shortLabel`, `target`, `title`, `responsibility`, `inputLabel`, `decisionLabel`, `outputLabel`, `connection`, `checkQuestion`, `analogy`, and `related` properties.
- Produces: `#process-rail` ordered list; active stage attributes including `aria-current="step"`; populated stage-card fields; related-element details; working previous/next navigation into the existing rating screen.

- [ ] **Step 1: Add minimal semantic markup for rail and detail fields**

Replace the existing `div.progress` inside `[data-screen="tour"]` with this semantic skeleton and add the named fields inside the card:

```html
<ol class="process-rail" id="process-rail" aria-label="C1부터 C3까지의 온보딩 흐름"></ol>
<div class="stage-label" id="tour-target"></div>
<h2 id="tour-title"></h2>
<p class="responsibility" id="tour-responsibility"></p>
<dl class="handoff-grid">
  <div><dt>받는 것</dt><dd id="tour-input"></dd></div>
  <div><dt>여기서 결정하는 것</dt><dd id="tour-decision"></dd></div>
  <div><dt>다음에 넘기는 것</dt><dd id="tour-output"></dd></div>
</dl>
<section class="connection"><h3>왜 다음 단계로 이어지나요?</h3><p id="tour-connection"></p></section>
<section class="check-point"><h3>팀원이 확인할 포인트</h3><p id="tour-check"></p></section>
```

Keep `#more-button`, `#detail`, `#return-main`, `#prev-step`, and `#next-step` so existing interaction IDs remain stable.

- [ ] **Step 2: Implement data-driven rail rendering and detailed content**

Use five entries matching this depth sequence and make `drawTour()` render both rail nodes and active content:

```js
const tour = [
  { level: 'C1', shortLabel: 'Context', target: '프로젝트 Context', inputLabel: '연습하려는 의도', outputLabel: '연습 세션의 시작점' },
  { level: 'C2', shortLabel: 'Workspace', target: 'Training Workspace', inputLabel: '연습 세션 시작', outputLabel: '입력 화면에 필요한 상태' },
  { level: 'C3', shortLabel: 'Input', target: 'Rhythm Input Panel', inputLabel: '입력한 리듬', outputLabel: '평가 요청' },
  { level: 'C2', shortLabel: 'Evaluation', target: 'Evaluation Flow', inputLabel: '평가 요청', outputLabel: '피드백 요약' },
  { level: 'C3', shortLabel: 'Result', target: 'Feedback Result Card', inputLabel: '피드백 요약', outputLabel: '다음 연습 행동' },
];

const drawTour = () => {
  processRail.innerHTML = tour.map((item, index) => `
    <li class="rail-step ${index < step ? 'complete' : ''} ${index === step ? 'current' : ''}" ${index === step ? 'aria-current="step"' : ''}>
      <span class="rail-order">${index + 1}</span><span class="rail-level">${item.level}</span><strong>${item.shortLabel}</strong>
      ${index < tour.length - 1 ? `<span class="rail-handoff">${item.outputLabel}</span>` : ''}
    </li>`).join('');
  // Populate all named stage-card fields from the active entry here.
};
```

Fill each entry's responsibility, decision, connection, check question, analogy, and two related elements with natural-language content. Each related element must show its `연결 관계` and role; do not expose C4 information.

- [ ] **Step 3: Style the rail for clear level and progression hierarchy**

Add CSS that makes `.process-rail` a five-column desktop grid with labeled connecting handoff segments. Use `.rail-step.current`, `.rail-step.complete`, `.rail-level`, and `.rail-order` to distinguish state without color-only meaning. At the existing 900px breakpoint, turn it into a single-column timeline and ensure `.rail-handoff` moves below its node rather than causing overflow.

Use the existing blue, glass, line, and shadow tokens; preserve the window's Tahoe character. Keep the active stage card as the visual focus and use a consistent typography scale for overline, headings, body, labels, and handoff values.

- [ ] **Step 4: Make the related panel contextual**

When `관련 요소 더 보기` is pressed, populate `#detail` from the active entry's two related elements in this format:

```html
<strong>관련 요소</strong>
<article><h4>요소 이름</h4><p><b>역할</b> · 설명</p><p><b>연결 관계</b> · 현재 단계와의 연결 이유</p></article>
```

The return button hides the panel without resetting the current step.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/wireframe.test.mjs`

Expected: PASS, with all five static checks passing.

- [ ] **Step 6: Verify the actual browser flow**

Run a local server and use the Playwright CLI to verify:

1. The initial project list renders with no console errors.
2. `팀원 투어` shows C1 `Context` and five labeled rail nodes.
3. Moving next shows C2 `Workspace`, then C3 `Input`; the current rail node changes with the content.
4. `관련 요소 더 보기` shows a `연결 관계` label and `메인 흐름으로 돌아가기` hides it.
5. The final step still opens the existing rating screen.
6. At 390px wide, the rail becomes a vertical timeline without page-level horizontal scrolling.

- [ ] **Step 7: Commit**

```bash
git add index.html tests/wireframe.test.mjs
git commit -m "feat: deepen tour with C1-C3 process rail"
```
