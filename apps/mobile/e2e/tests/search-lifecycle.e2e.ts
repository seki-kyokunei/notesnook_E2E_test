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

import { fixtures } from "../fixtures/test-data";
import { EditorPage } from "../page-objects/editor.page";
import { NoteListPage } from "../page-objects/note-list.page";
import { SearchPage } from "../page-objects/search.page";
import { Tests } from "./utils";

/**
 * Search lifecycle — querying, clearing, no-results, and case sensitivity.
 * Everything runs offline against the local database; no account involved.
 *
 * Screen interactions live in page objects: NoteListPage owns the
 * "Search in Notes" entry point, SearchPage owns the query field and its
 * debounce handling, and EditorPage owns note creation (including the
 * react-freeze-safe active-tab variant used for back-to-back fixtures —
 * see page-objects/editor.page.ts). The searchable corpus and queries
 * live in fixtures/test-data.ts.
 */

const { corpus, queries } = fixtures.search;

const noteList = new NoteListPage();
const editor = new EditorPage();
const search = new SearchPage();

/** Create the three corpus notes from the home screen. */
async function createCorpusNotes() {
  for (const note of corpus) {
    // Let the editor-close animation settle before tapping the add button
    // again — back-to-back creations otherwise hit the FAB while it is
    // still clipped by the closing editor pane.
    await Tests.sleep(800);
    await editor.createNoteInActiveTab(note.title, note.body);
  }
}

describe("SEARCH LIFECYCLE", () => {
  // Fresh app install + launch before every test.
  beforeEach(async () => {
    await Tests.prepare();
  });

  it("finds notes matching a search query", async () => {
    // Query that matches exactly one note: the matching title must show,
    // a non-matching one must not.
    await createCorpusNotes();
    await noteList.openSearch();
    await search.query(queries.matching);
    await search.expectResultVisible(corpus[0].title);
    await search.expectResultNotVisible(corpus[1].title);
  });

  it("restores the full list when search is cleared", async () => {
    // After clearing the query, the search screen drops back to its empty
    // state; returning to the notes list must show all three notes again.
    await createCorpusNotes();
    await noteList.openSearch();
    await search.query(queries.matching);
    await search.expectResultVisible(corpus[0].title);

    await search.clearQuery();
    await search.goBack();

    await noteList.expectNoteVisible(corpus[0].title);
    await noteList.expectNoteVisible(corpus[1].title);
    await noteList.expectNoteVisible(corpus[2].title);
  });

  it("shows no results for a non-matching query", async () => {
    // A query that matches nothing: none of the corpus notes may appear.
    await createCorpusNotes();
    await noteList.openSearch();
    await search.query(queries.noMatch);
    await search.expectResultNotVisible(corpus[0].title);
    await search.expectResultNotVisible(corpus[1].title);
    await search.expectResultNotVisible(corpus[2].title);
  });

  it("search is case-insensitive", async () => {
    // Verified actual behavior: Notesnook search is FTS-backed
    // (packages/core/src/api/lookup.ts) and matches case-insensitively —
    // a lowercase query finds a note titled with an uppercase initial.
    await editor.createNote(corpus[0].title, corpus[0].body);
    await noteList.openSearch();
    await search.query(queries.lowercaseMatching);
    await search.expectResultVisible(corpus[0].title);
  });
});
