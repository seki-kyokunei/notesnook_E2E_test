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

import { EditorPage } from "../page-objects/editor.page";
import { NoteListPage } from "../page-objects/note-list.page";
import { TrashPage } from "../page-objects/trash.page";
import { Tests } from "./utils";

/**
 * Trash lifecycle — trashed notes appearing in Trash, restore, permanent
 * delete (with confirm dialog), and clear-all. Everything runs offline
 * against the local database.
 *
 * Verified behavior notes:
 * - Moving a note to trash from the list has NO confirm dialog (the app
 *   trashes immediately; see note-lifecycle's delete test).
 * - Restoring from trash also has NO confirm dialog — immediate + toast.
 * - Permanent delete and "clear trash" DO confirm via a dialog whose
 *   positive button carries the generic "yes" testID.
 */

const noteList = new NoteListPage();
const editor = new EditorPage();
const trash = new TrashPage();

/** Create a note and move it to trash, leaving us on the notes list. */
async function createTrashedNote(title: string, body: string) {
  await editor.createNote(title, body);
  await noteList.moveFirstNoteToTrash();
  await noteList.expectNoteNotVisible(title);
}

describe("TRASH LIFECYCLE", () => {
  // Fresh app install + launch before every test.
  beforeEach(async () => {
    await Tests.prepare();
  });

  it("deleted note appears in trash", async () => {
    // A note moved to trash must leave the notes list (covered by the
    // fixture) and show up on the Trash screen.
    await createTrashedNote("Trashed note", "This note is going to trash.");
    await trash.open();
    await trash.expectItemVisible("Trashed note");
  });

  it("restores a note from trash", async () => {
    // Restore: immediate, no confirm dialog. The note must disappear
    // from trash and reappear in the notes list.
    await createTrashedNote(
      "Restorable note",
      "This note will be restored from trash."
    );
    await trash.open();
    await trash.expectItemVisible("Restorable note");

    await trash.restoreFirstItem();
    await trash.expectItemNotVisible("Restorable note");

    await noteList.open();
    await noteList.expectNoteVisible("Restorable note");
  });

  it("permanently deletes a note from trash", async () => {
    // Permanent delete confirms via dialog (positive button = "yes").
    // Afterwards the note must be gone from trash AND not be back in
    // the notes list.
    await createTrashedNote(
      "Doomed note",
      "This note will be deleted forever."
    );
    await trash.open();
    await trash.expectItemVisible("Doomed note");

    await trash.permanentlyDeleteFirstItem();
    await trash.expectItemNotVisible("Doomed note");

    await noteList.open();
    await noteList.expectNoteNotVisible("Doomed note");
  });

  it("clears all trash", async () => {
    // "Clear trash" wipes every trashed item after the same confirm
    // dialog. Both the title and the body preview must be gone.
    await createTrashedNote(
      "Clearable note",
      "This note will be cleared with the trash."
    );
    await trash.open();
    await trash.expectItemVisible("Clearable note");

    await trash.clearAll();
    await trash.expectItemNotVisible("Clearable note");
    await trash.expectItemNotVisible("This note will be cleared with the trash.");
  });
});
