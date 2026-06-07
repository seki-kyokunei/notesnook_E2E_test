# Detox E2E Test Suite — Notesnook (iOS)

## 1. Overview

A Detox end-to-end test suite for the [Notesnook](https://notesnook.com) mobile app: **16 tests across 4 suites** (note CRUD, search, trash, notebooks), organized in a **three-layer architecture** — `fixtures/` (test data), `page-objects/` (selectors + reusable steps), `tests/` (scenarios + assertions). All tests run fully offline against the local database on an iOS simulator.

This repository is a fork of [streetwriters/notesnook](https://github.com/streetwriters/notesnook) (GPL-3.0). **The test suites, page objects, and fixtures are my own work; the application under test is not.** See [What's mine vs upstream](#9-whats-mine-vs-upstream).

## 2. App selection

I evaluated several open-source RN apps and chose Notesnook because it fits E2E testing on Detox specifically:

- **React Native CLI, not Expo** — Detox does not officially support Expo apps; Notesnook is a bare RN project with a real Xcode workspace.
- **Local-first architecture** — notes, search, trash, and notebooks all work fully offline against a local DB, so core business flows are testable with **zero backend dependency** (no network flakiness, no test accounts, fully reproducible).
- **Existing Detox harness** — the repo ships a `.detoxrc.js`, a testID registry (`test.ids.js`), and low-level helpers, so effort goes into test design rather than reinventing plumbing.

Rejected alternatives: Expo-based apps (unsupported by Detox), backend-dependent apps (flaky, non-reproducible), and unmaintained repos (couldn't be built against current toolchains).

## 3. Architecture

```
e2e/
├── fixtures/
│   └── test-data.ts          # WHAT the tests use — all test data, typed,
│                             #   grouped by suite, keys named by scenario role
├── page-objects/
│   ├── base-page.ts          # HOW to interact — shared wrappers (waits, taps,
│   ├── note-list.page.ts     #   typing, visibility assertions)
│   ├── editor.page.ts        #   per-screen objects encapsulating every
│   ├── search.page.ts        #   selector and reusable action for that screen
│   ├── trash.page.ts
│   └── notebook.page.ts
└── tests/
    ├── note-lifecycle.e2e.ts      # WHAT to verify — scenarios + assertions,
    ├── search-lifecycle.e2e.ts    #   zero selectors, zero inline data
    ├── trash-lifecycle.e2e.ts
    └── notebook-lifecycle.e2e.ts
```

Design rules applied consistently:

- **Page Object Model** — each screen's selectors and actions live in exactly one class; tests compose named steps (`search.query("Apple")`, `trash.permanentlyDeleteFirstItem()`).
- **Test files contain zero selectors** — a test reads as scenario → steps; every testID is defined once, in its screen's page object.
- **Data externalized to fixtures** — fixed, deterministic values (no randomization), named by their role in the scenario (`fixtures.trash.doomed`).
- **testIDs over text matchers** wherever the app exposes them.
- **Clean state per test** — the app is uninstalled, reinstalled, and relaunched before every test; no inter-test dependencies.
- **Explicit settle waits** — Detox auto-synchronization is disabled (the app runs perpetual animations), so every sheet/dialog/screen transition gets a deliberate, commented wait.

This layering is for readability and maintainability: a new scenario is written purely from existing vocabulary, a changed testID is a one-line fix, and a reviewer can audit scenarios without wading through plumbing.

## 4. Test strategy

Selection was driven by **business value × stability**:

- **P0 — note CRUD and search**: the product's reason to exist. If creating, persisting, editing, deleting, or finding notes breaks, nothing else matters.
- **P1/P2 — trash and notebooks**: destructive-action safety (restore, permanent delete, clear-all, confirm dialogs) and the core organizational feature (linking/unlinking notes).
- **Deliberately excluded — login and sync**: they require a real backend account plus TOTP 2FA, making them flaky, slow, and non-reproducible in a take-home context. This is a conscious determinism decision, not a gap I missed — see [Future coverage](#10-future-coverage) for how I'd test them properly.

## 5. Test suites

**note-lifecycle.e2e.ts (5)** — full local CRUD:
1. creates a note and shows it in the list
2. persists note content when reopened (read-after-write through the local DB)
3. edits a note and reflects the update (append → autosave → reopen → both contents present)
4. deletes a note and removes it from the list (verified: no confirm dialog)
5. handles a note with an empty title (verified: app auto-generates a timestamp title)

**search-lifecycle.e2e.ts (4)** — FTS search behaviors over a 3-note corpus:
1. finds notes matching a query (positive **and** negative assertion — filtering is actually proven)
2. restores the full list when search is cleared (search is non-destructive)
3. shows no results for a non-matching query (empty-state code path)
4. search is case-insensitive (verified against `packages/core/src/api/lookup.ts`)

**trash-lifecycle.e2e.ts (4)** — destructive-action safety:
1. deleted note appears in trash
2. restores a note from trash (verified: immediate, no confirm dialog; asserted on both screens)
3. permanently deletes a note from trash (confirm dialog handled via its `yes` testID; asserted gone from trash AND notes)
4. clears all trash (`trash-clear` + confirm)

**notebook-lifecycle.e2e.ts (3)** — note ↔ notebook relations:
1. creates a notebook
2. adds a note to a notebook (picker + save flow; verified from both sides — chip on the note, note inside the notebook)
3. removes a note from a notebook (selection-mode unlink; the note is unlinked, not deleted)

## 6. Challenges & flakiness

Real problems hit during development, as **problem → root cause → fix**:

| Problem | Root cause | Fix |
|---|---|---|
| Back-to-back note creation cross-contaminated content between notes | The editor WebView keeps previously opened notes mounted as **frozen tabs (react-freeze)** — the DOM holds several `#editor-title`/`.ProseMirror` nodes, and first-DOM-match selectors can write into a *previous* note's frozen tab | The active tab's root carries an `.active` class (`editor.tsx`); all editor writes during creation are scoped with `.active …` CSS selectors (`EditorPage.createNoteInActiveTab`) |
| Notebook items unreachable by the registry's testID | `test.ids.js` records `notebook-item-N`, but the component actually renders `notebook-item-{depth}-{index}` (`side-menu/notebook-item.tsx`) — the registry is **stale** | Verified against source; page object uses the real format and documents the discrepancy |
| Empty-title test would flake on title assertions | Notesnook auto-generates `Note DD-MM-YYYY HH:MM` — a **time-dependent string** | Assert on the stable list-item testID and body preview instead of the generated title |
| Wrong assumptions about confirm dialogs | Delete-to-trash and restore-from-trash have **no** confirm dialog; permanent-delete and clear-trash **do** (and the app sleeps 300ms before presenting it) | Verified each flow in `use-actions.tsx` before writing assertions; the delete flow waits out the app-side delay before tapping the dialog's `yes` |
| One flaky run of a passing test | The shared helper's **5s default `isVisible` timeout** is the suite's tightest tolerance — a slow first list render after reinstall can exceed it | Documented as the most likely flake source; making it configurable is listed under future work |

**Why mobile E2E is flaky in general** (and what this suite does about it): animation races (explicit settle waits), WebView state lagging native navigation (load waits + active-tab scoping), simulator boot variance, per-test reinstall cost (accepted deliberately — determinism over speed), and external dependencies (eliminated by testing offline-only flows).

## 7. CI

`.github/workflows/ios.e2e.yml` is an **illustrative example** of how this suite would run on GitHub Actions. It mirrors the exact command sequence verified locally (macOS runner → install/bootstrap → workspace package builds → `pod install` → Detox framework cache → `detox build` → `detox test`), but it has **not been validated on hosted CI runners** — hosted macOS images differ in Xcode and simulator versions, and mobile E2E in CI always needs runner-specific tuning.

The workflow's inline comments annotate the usual mobile-CI failure and flake points — the iOS build step (Xcode/Clang version drift; this repo needed a Podfile fix for Xcode 26.5's stricter Clang), simulator boot and device-set availability per runner image, and the Detox framework cache going stale after Xcode image updates — i.e., the things you actually triage when a red CI run lands.

## 8. How to run

Prerequisites: macOS with Xcode 26+, Node 26 (the version verified on both development machines; older versions untested), CocoaPods, `applesimutils` (`brew tap wix/brew && brew install applesimutils`), an iPhone 17-class simulator (config targets iPhone 17 Pro Max).

```bash
git clone -b e2e-pom-refactor https://github.com/seki-kyokunei/notesnook_E2E_test.git
cd notesnook_E2E_test

# install + link the monorepo
npm install
npm run bootstrap -- --scope=mobile

# build the workspace packages the app's JS bundle resolves to
for pkg in logger intl crypto theme core common editor editor-mobile themes; do
  node scripts/execute.mjs "$pkg:build"
done

# iOS native deps + Detox cache
cd apps/mobile/ios && pod install && cd ..
npx detox build-framework-cache

# build the app, then run everything
npx detox build -c ios.sim.release
npx detox test -c ios.sim.release \
  e2e/tests/note-lifecycle.e2e.ts \
  e2e/tests/search-lifecycle.e2e.ts \
  e2e/tests/trash-lifecycle.e2e.ts \
  e2e/tests/notebook-lifecycle.e2e.ts
```

Run a single suite:

```bash
npx detox test -c ios.sim.release e2e/tests/note-lifecycle.e2e.ts
```

## 9. What's mine vs upstream

**Mine:**
- All 16 test cases (`tests/*-lifecycle.e2e.ts`), all 6 page objects, the fixtures layer, and the illustrative CI workflow.
- Infra fixes committed separately with clear messages: making the existing Detox harness runnable on iOS (Xcode 26 / Detox 20), vendoring an arm64-simulator libsodium for reproducible builds, building the fmt pod as C++17 for Xcode 26.5, and one `search-back-button` testID added to app code for testability.

**Upstream (reused, unmodified):** the application itself, the low-level `tests/utils.ts` helpers (`Tests`/`Element` plumbing my page objects wrap), `test.ids.js`, and the jest/Detox configuration.

The test code was written with AI assistance (Claude Code) as part of my AI-native workflow; the test strategy, architecture decisions, scenario selection, assertions, and the debugging/verification work documented above are mine.

To see exactly what changed relative to upstream:

```bash
git remote add upstream https://github.com/streetwriters/notesnook.git
git fetch upstream master
git diff upstream/master --stat
```

## 10. Future coverage

- **More features**: tags, Vault (app-lock/note-lock), reminders, nested notebooks, sort/filter orders.
- **Login & sync**: as a separate, explicitly-marked suite using a dedicated test account against a staging/mocked backend — never mixed into the deterministic offline suites.
- **Harness hardening**: make the 5s `isVisible` timeout configurable per call site (it's the suite's tightest tolerance), and add Detox artifacts (screenshots/logs on failure) for CI triage.
