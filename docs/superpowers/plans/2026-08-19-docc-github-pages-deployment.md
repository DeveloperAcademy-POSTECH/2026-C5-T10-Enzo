# DocC GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track the SceneKit-to-RealityKit DocC catalog in this repository and automatically publish its static archive to GitHub Pages.

**Architecture:** The DocC catalog lives under `Tutorials/` and a shell script converts it into a static archive with the repository project path as its hosting base path. A macOS GitHub Actions build job runs that script and uploads the archive; a separate deployment job publishes the artifact to GitHub Pages.

**Tech Stack:** DocC, Xcode command-line tools, Bash, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-19-docc-github-pages-deployment.md`

## Global Constraints

- Preserve the existing repository documents.
- Keep generated DocC output out of version control.
- Use `/2026-C5-T10-Enzo` as the DocC hosting base path.
- Deploy only after local DocC conversion succeeds.

---

### Task 1: Track the catalog and reproducible static build

**Files:**
- Create: `Tutorials/SceneKitToRealityKit.docc/**`
- Create: `scripts/build-docc-site.sh`
- Create: `README.md`

**Interfaces:**
- Consumes: `Tutorials/SceneKitToRealityKit.docc` DocC catalog.
- Produces: a DocC archive at the first argument passed to `scripts/build-docc-site.sh`, or `build/SceneKitToRealityKit.doccarchive` when omitted.

- [x] **Step 1: Copy the validated DocC catalog into `Tutorials/`**

Copy the catalog containing `SceneKitToRealityKit.tutorial`, the `01-ClosedWorld.tutorial` chapter, eight Swift snippets, and `closed-world-chapter-icon.png`.

- [x] **Step 2: Add a failing static-build precondition check**

Run:

```bash
test -f Tutorials/SceneKitToRealityKit.docc/SceneKitToRealityKit.tutorial
test -f scripts/build-docc-site.sh
```

Expected: the second check fails because the build script does not yet exist.

- [x] **Step 3: Add the build script**

```bash
#!/usr/bin/env bash
set -euo pipefail

output_path="${1:-build/SceneKitToRealityKit.doccarchive}"
mkdir -p "$(dirname "$output_path")"

xcrun docc convert Tutorials/SceneKitToRealityKit.docc \
  --fallback-display-name "씬킷에서 리얼리티킷으로" \
  --fallback-bundle-identifier "com.techmap.scenekittorealitykit" \
  --fallback-bundle-version "1.0" \
  --hosting-base-path /2026-C5-T10-Enzo \
  --output-path "$output_path"

test -f "$output_path/index.html"
test -f "$output_path/data/tutorials/scenekittorealitykit.json"
```

- [x] **Step 4: Build locally and verify the project base path**

Run:

```bash
bash scripts/build-docc-site.sh /tmp/SceneKitToRealityKit.github-pages.doccarchive
rg --fixed-strings 'baseUrl = "/2026-C5-T10-Enzo/"' /tmp/SceneKitToRealityKit.github-pages.doccarchive/index.html
```

Expected: both archive contract files and the repository base path are present.

- [x] **Step 5: Document the local build and published URL convention**

Add a short README section with the build command and the project Pages URL convention.

### Task 2: Add the GitHub Pages workflow

**Files:**
- Create: `.github/workflows/deploy-docc.yml`

**Interfaces:**
- Consumes: `scripts/build-docc-site.sh` and its `site` output directory argument.
- Produces: a GitHub Pages artifact that contains the generated DocC archive root.

- [x] **Step 1: Add the workflow with build and deployment jobs**

```yaml
name: Deploy DocC

on:
  push:
    branches: [main]
    paths:
      - "Tutorials/SceneKitToRealityKit.docc/**"
      - "scripts/build-docc-site.sh"
      - ".github/workflows/deploy-docc.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - run: bash scripts/build-docc-site.sh site
      - run: test -f site/index.html && test -f site/data/tutorials/scenekittorealitykit.json
      - uses: actions/upload-pages-artifact@v4
        with:
          path: site
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [x] **Step 2: Validate the YAML structure**

Run:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/deploy-docc.yml"); puts "valid"'
```

Expected: `valid`.

### Task 3: Enable Pages and publish

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: validated `main` commit and the `Deploy DocC` workflow.
- Produces: the GitHub Pages project URL for the repository.

- [ ] **Step 1: Commit the catalog, script, workflow, design, and plan**

```bash
git add Tutorials scripts .github README.md docs/superpowers
git commit -m "Deploy DocC tutorial with GitHub Pages"
```

- [ ] **Step 2: Push the `main` commit to `origin`**

```bash
git push origin main
```

- [ ] **Step 3: Enable GitHub Pages to use GitHub Actions**

Set the repository Pages source to **GitHub Actions** in Settings → Pages, then confirm that the `Deploy DocC` workflow starts from the pushed commit.

- [ ] **Step 4: Verify the published page**

Open:

```text
https://developeracademy-postech.github.io/2026-C5-T10-Enzo/
```

Expected: the DocC home page and the `01-ClosedWorld` tutorial load without missing static assets.
