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
 * for the WebView structure and the react-freeze tab model).
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
    await editor.createNote(
      "Lifecycle note",
      "The body of the lifecycle note."
    );
    await noteList.expectNoteVisible("Lifecycle note");
  });

  it("persists note content when reopened", async () => {
    // Read-after-write: reopen the note from the list and verify the
    // editor restores exactly what was entered (local DB persistence).
    await editor.createNote(
      "Persisted note",
      "This body must survive a reopen."
    );
    await noteList.openNoteAt(0);
    await editor.waitForLoad();

    jestExpect(await editor.readTitle()).toBe("Persisted note");
    jestExpect(await editor.readBody()).toContain(
      "This body must survive a reopen."
    );

    await editor.exit();
  });

  it("edits a note and reflects the update", async () => {
    // Update: reopen the note, append text, exit, reopen again and verify
    // both the original and the appended content were saved.
    await editor.createNote("Editable note", "Original content.");

    await noteList.openNoteAt(0);
    await editor.waitForLoad();
    await editor.appendToBody(" Edited content.");
    await editor.waitForAutosave();
    await editor.exit();

    await noteList.openNoteAt(0);
    await editor.waitForLoad();
    const body = await editor.readBody();
    jestExpect(body).toContain("Original content.");
    jestExpect(body).toContain("Edited content.");
    await editor.exit();
  });

  it("deletes a note and removes it from the list", async () => {
    // Delete: list item menu -> "Move to trash". The app moves the note to
    // trash immediately (no confirmation dialog) and the properties sheet
    // closes itself, so the only post-condition is the note leaving the list.
    await editor.createNote(
      "Disposable note",
      "This note is about to be deleted."
    );
    await noteList.moveFirstNoteToTrash();
    await noteList.expectNoteNotVisible("Disposable note");
    await noteList.expectNoteNotVisible("This note is about to be deleted.");
  });

  it("handles a note with an empty title", async () => {
    // Edge case: a note created with body text but no title. Notesnook
    // auto-generates a title of the form "Note DD-MM-YYYY HH:MM" (verified
    // behavior), so the note must still appear in the list as item 0 with
    // its body as the preview text.
    await editor.createNote(undefined, "Body only, no title was entered.");
    await noteList.expectNoteItemVisible(0);
    await noteList.expectNoteVisible("Body only, no title was entered.");
  });
});
