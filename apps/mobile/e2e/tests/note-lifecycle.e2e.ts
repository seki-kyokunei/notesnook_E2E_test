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

import { expect as jestExpect } from "@jest/globals";
import { fixtures } from "../fixtures/test-data";
import { EditorPage } from "../page-objects/editor.page";
import { NoteListPage } from "../page-objects/note-list.page";
import { Tests } from "./utils";

/**
 * Full local note CRUD lifecycle — create, read (persistence), update,
 * delete, and the empty-title edge case. Everything runs offline against
 * the local database; no account or backend is involved.
 *
 * Screen interactions live in page objects: NoteListPage drives the notes
 * list, EditorPage wraps the editor WebView (see page-objects/editor.page.ts
 * for the WebView structure and the react-freeze tab model). Test data
 * lives in fixtures/test-data.ts.
 */

const noteList = new NoteListPage();
const editor = new EditorPage();

describe("NOTE LIFECYCLE", () => {
  // Fresh app install + launch before every test.
  beforeEach(async () => {
    await Tests.prepare();
  });

  it("creates a note and shows it in the list", async () => {
    // Create: add button -> type title + body in the editor -> exit.
    // createNote() already asserts the body preview is visible in the
    // list; additionally assert the title is shown.
    const note = fixtures.notes.lifecycle;
    await editor.createNote(note.title, note.body);
    await noteList.expectNoteVisible(note.title);
  });

  it("persists note content when reopened", async () => {
    // Read-after-write: reopen the note from the list and verify the
    // editor restores exactly what was entered (local DB persistence).
    const note = fixtures.notes.persisted;
    await editor.createNote(note.title, note.body);
    await noteList.openNoteAt(0);
    await editor.waitForLoad();

    jestExpect(await editor.readTitle()).toBe(note.title);
    jestExpect(await editor.readBody()).toContain(note.body);

    await editor.exit();
  });

  it("edits a note and reflects the update", async () => {
    // Update: reopen the note, append text, exit, reopen again and verify
    // both the original and the appended content were saved.
    const note = fixtures.notes.edit;
    await editor.createNote(note.title, note.body);

    await noteList.openNoteAt(0);
    await editor.waitForLoad();
    await editor.appendToBody(note.appendix);
    await editor.waitForAutosave();
    await editor.exit();

    await noteList.openNoteAt(0);
    await editor.waitForLoad();
    const body = await editor.readBody();
    jestExpect(body).toContain(note.body);
    jestExpect(body).toContain(note.appendix.trim());
    await editor.exit();
  });

  it("deletes a note and removes it from the list", async () => {
    // Delete: list item menu -> "Move to trash". The app moves the note to
    // trash immediately (no confirmation dialog) and the properties sheet
    // closes itself, so the only post-condition is the note leaving the list.
    const note = fixtures.notes.disposable;
    await editor.createNote(note.title, note.body);
    await noteList.moveFirstNoteToTrash();
    await noteList.expectNoteNotVisible(note.title);
    await noteList.expectNoteNotVisible(note.body);
  });

  it("handles a note with an empty title", async () => {
    // Edge case: a note created with body text but no title. Notesnook
    // auto-generates a title of the form "Note DD-MM-YYYY HH:MM" (verified
    // behavior), so the note must still appear in the list as item 0 with
    // its body as the preview text.
    const note = fixtures.notes.untitled;
    await editor.createNote(undefined, note.body);
    await noteList.expectNoteItemVisible(0);
    await noteList.expectNoteVisible(note.body);
  });
});
