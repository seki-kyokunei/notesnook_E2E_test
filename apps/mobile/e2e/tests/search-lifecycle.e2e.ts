/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { by, web } from "detox";
import { notesnook } from "../test.ids";
import { Tests, TestBuilder } from "./utils";

/**
 * Search lifecycle — querying, clearing, no-results, and case sensitivity.
 * Everything runs offline against the local database; no account involved.
 *
 * Entry point: the home header's "Search in Notes" bar is a single tappable
 * element (testID "search-header") that navigates to the search screen,
 * where "search-input" is the query field and "clear-search" clears it.
 * Search is FTS-backed and debounced, hence the waits after typing.
 */

const NOTES = [
  { title: "Apple note", body: "Body of the apple note." },
  { title: "Banana note", body: "Body of the banana note." },
  { title: "Cherry note", body: "Body of the cherry note." }
] as const;

/**
 * Create a note writing ONLY into the active editor tab.
 *
 * The editor WebView keeps previously opened notes mounted as frozen tabs
 * (react-freeze), so each tab has its own #editor-title and .ProseMirror.
 * The shared Tests.createNote helper matches those by first-DOM-match,
 * which on back-to-back creations can write into a previous note's tab
 * and cross-contaminate content. The focused tab's root element carries
 * the "active" class (editor.tsx), so scoping selectors with
 * ".active ..." pins every write to the note actually being created.
 */
async function createNoteInActiveTab(title: string, body: string) {
  const activeTitle = () =>
    web().element(by.web.cssSelector(".active #editor-title"));
  const activeBody = () =>
    web().element(by.web.cssSelector(".active .ProseMirror"));

  await Tests.fromId(notesnook.buttons.add).waitAndTap();
  await Tests.sleep(1000); // editor tab open + WebView ready

  // The title textarea is a React-controlled component — write through the
  // native value setter + input event (simulated typing is swallowed).
  await activeTitle().runScript(
    `(el, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      ).set;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }`,
    [title]
  );
  await activeBody().focus();
  await activeBody().typeText(body, true);
  await Tests.exitEditor();
  // Same post-condition as Tests.createNote: body preview in the list.
  await Tests.fromText(body).isVisible();
}

/** Queue creation of the three fixture notes from the home screen. */
function createFixtureNotes(builder: ReturnType<typeof TestBuilder.create>) {
  for (const note of NOTES) {
    // Let the editor-close animation settle before tapping the add button
    // again — back-to-back creations otherwise hit the FAB while it is
    // still clipped by the closing editor pane.
    builder.wait(800);
    builder.addStep(() => createNoteInActiveTab(note.title, note.body));
  }
  return builder;
}

describe("SEARCH LIFECYCLE", () => {
  it("finds notes matching a search query", async () => {
    // Query that matches exactly one note: the matching title must show,
    // a non-matching one must not.
    await createFixtureNotes(TestBuilder.create().prepare())
      .waitAndTapById("search-header")
      .wait(500) // search screen open animation
      .typeTextById("search-input", "Apple")
      .wait(1000) // debounced FTS query
      .isVisibleByText("Apple note")
      .isNotVisibleByText("Banana note")
      .run();
  });

  it("restores the full list when search is cleared", async () => {
    // After clearing the query, the search screen drops back to its empty
    // state; returning to the notes list must show all three notes again.
    await createFixtureNotes(TestBuilder.create().prepare())
      .waitAndTapById("search-header")
      .wait(500)
      .typeTextById("search-input", "Apple")
      .wait(1000)
      .isVisibleByText("Apple note")
      .waitAndTapById("clear-search")
      .wait(500)
      // Leave the search screen via its back arrow (testID added for this —
      // the screen has no header "left" button for goBack to fall back on).
      .waitAndTapById("search-back-button")
      .wait(500)
      .isVisibleByText("Apple note")
      .isVisibleByText("Banana note")
      .isVisibleByText("Cherry note")
      .run();
  });

  it("shows no results for a non-matching query", async () => {
    // A query that matches nothing: none of the fixture notes may appear.
    await createFixtureNotes(TestBuilder.create().prepare())
      .waitAndTapById("search-header")
      .wait(500)
      .typeTextById("search-input", "Zzzzz")
      .wait(1000)
      .isNotVisibleByText("Apple note")
      .isNotVisibleByText("Banana note")
      .isNotVisibleByText("Cherry note")
      .run();
  });

  it("search is case-insensitive", async () => {
    // Verified actual behavior: Notesnook search is FTS-backed
    // (packages/core/src/api/lookup.ts) and matches case-insensitively —
    // a lowercase query finds a note titled with an uppercase initial.
    await TestBuilder.create()
      .prepare()
      .createNote("Apple note", "Body of the apple note.")
      .waitAndTapById("search-header")
      .wait(500)
      .typeTextById("search-input", "apple")
      .wait(1000)
      .isVisibleByText("Apple note")
      .run();
  });
});
