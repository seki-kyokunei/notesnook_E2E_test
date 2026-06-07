# Detox E2E Take-Home Assignment — Notesnook (iOS)

This repository is a fork of [Notesnook](https://github.com/streetwriters/notesnook) used for a **Detox E2E testing take-home assignment**. The application under test is Notesnook's work; **the E2E test suite is mine.**

## What I built

- **16 end-to-end tests across 4 suites** — note CRUD, search, trash, and notebooks — all running fully offline against the local database on an iOS simulator (deterministic, no backend dependency).
- A **three-layer test architecture**: `fixtures/` (typed test data) / `page-objects/` (every selector and reusable step, one class per screen) / `tests/` (scenarios and assertions only — zero selectors, zero inline data).
- An **illustrative GitHub Actions workflow** (`.github/workflows/ios.e2e.yml`) showing how the suite would run in CI, annotated with the usual mobile-CI failure and flake points.
- The **infrastructure fixes** needed to make the repo's existing Detox harness build and run on a current toolchain (Xcode 26 / Detox 20), committed separately with clear messages.

## 📖 Full write-up

**→ [`apps/mobile/e2e/README.md`](apps/mobile/e2e/README.md)** — architecture, test strategy, per-suite coverage, the real flakiness problems hit during development (root cause → fix), CI notes, and how to run.

## Branches

| Branch | Contents |
|---|---|
| [`e2e-pom-refactor`](../../tree/e2e-pom-refactor) | **Full submission** — 16 tests, Page Object Model, fixtures layer, CI example, docs |

---

## About Notesnook (upstream)

This is a fork of **[Notesnook](https://github.com/streetwriters/notesnook)** — a free, open-source, end-to-end encrypted note-taking app by [Streetwriters](https://notesnook.com), used here solely as the application under test. All application code is theirs; see the [original repository](https://github.com/streetwriters/notesnook) for the full project README, documentation, and downloads. Notesnook is licensed under **GPL-3.0**, and this fork retains the original [LICENSE](LICENSE).
