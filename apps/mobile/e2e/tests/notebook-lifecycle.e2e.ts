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
import { NotebookPage } from "../page-objects/notebook.page";
import { Tests } from "./utils";

/**
 * Notebook lifecycle — creating a notebook, linking a note to it from the
 * notes list, and unlinking a note from inside the notebook. Everything
 * runs offline against the local database.
 *
 * Flow deviations from the original spec, verified against the app source
 * (see page-objects/notebook.page.ts for details):
 * - "Add to notebook" is testID "icon-notebooks" (not icon-add-to-notebook)
 *   and requires saving the picker via "floating-save-button".
 * - Removing a note from a notebook goes through long-press selection mode
 *   and the "select-minus" header action — the note menu's remove action
 *   is conditionally hidden, so the upstream-proven selection flow is used.
 */

const noteList = new NoteListPage();
const editor = new EditorPage();
const notebooks = new NotebookPage();

describe("NOTEBOOK LIFECYCLE", () => {
  // Fresh app install + launch before every test.
  beforeEach(async () => {
    await Tests.prepare();
  });

  it("creates a notebook", async () => {
    // Create via the notebooks tab's add button; the new notebook must
    // appear in the notebooks list.
    await notebooks.create("Notebook A", true);
    await notebooks.expectNotebookVisible("Notebook A");
  });

  it("adds a note to a notebook", async () => {
    // Link an existing note to an existing notebook from the notes list
    // (note menu -> notebooks picker -> save), then verify from both
    // sides: the note item shows the notebook chip, and the notebook
    // contains the note.
    await notebooks.create("Notebook A", true);
    await notebooks.returnToNotesHome();
    await editor.createNote("Linked note", "Body of the linked note.");

    await notebooks.linkFirstNoteToNotebook();
    // The note's list item now renders a "Notebook A" chip.
    await noteList.expectNoteVisible("Notebook A");

    await notebooks.openNotebooksList();
    await notebooks.openNotebookAt(0);
    await notebooks.expectNoteInNotebook("Body of the linked note.");
  });

  it("removes a note from a notebook", async () => {
    // Create the note directly inside the notebook (the add button there
    // links it automatically), then unlink it via selection mode. The
    // note must leave the notebook's list (it is NOT deleted — unlinking
    // only removes the relation).
    await notebooks.create("Notebook A", true);
    await notebooks.openNotebookAt(0);
    await editor.createNote("Inside note", "Body of the inside note.");
    await notebooks.expectNoteInNotebook("Body of the inside note.");

    await notebooks.removeNoteFromNotebook("Body of the inside note.");
    await notebooks.expectNoteNotInNotebook("Body of the inside note.");
  });
});
