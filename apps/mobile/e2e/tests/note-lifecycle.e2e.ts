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
import { by, web } from "detox";
import { notesnook } from "../test.ids";
import { TestBuilder } from "./utils";

/**
 * Full local note CRUD lifecycle — create, read (persistence), update,
 * delete, and the empty-title edge case. Everything runs offline against
 * the local database; no account or backend is involved.
 *
 * The editor is a WebView (packages/editor-mobile), so editor content is
 * read through Detox's web API: the title is a <textarea id="editor-title">
 * and the body is a ProseMirror contenteditable.
 */

/** Read the current title from the editor WebView. */
function readEditorTitle(): Promise<string> {
  return web()
    .element(by.web.id("editor-title"))
    .runScript("(el) => el.value");
}

/** Read the current body text from the editor WebView. */
function readEditorBody(): Promise<string> {
  return web()
    .element(by.web.className("ProseMirror"))
    .runScript("(el) => el.textContent");
}

/** Append text to the note body inside the editor WebView. */
async function typeIntoEditorBody(text: string) {
  await web().element(by.web.className("ProseMirror")).focus();
  await web().element(by.web.className("ProseMirror")).typeText(text, true);
}

describe("NOTE LIFECYCLE", () => {
  it("creates a note and shows it in the list", async () => {
    // Create: add button -> type title + body in the editor -> exit.
    // createNote() already asserts the body preview is visible in the list;
    // additionally assert the title is shown.
    await TestBuilder.create()
      .prepare()
      .createNote("Lifecycle note", "The body of the lifecycle note.")
      .isVisibleByText("Lifecycle note")
      .run();
  });

  it("persists note content when reopened", async () => {
    // Read-after-write: reopen the note from the list and verify the
    // editor restores exactly what was entered (local DB persistence).
    await TestBuilder.create()
      .prepare()
      .createNote("Persisted note", "This body must survive a reopen.")
      .waitAndTapById(notesnook.ids.note.get(0))
      .wait(1000) // let the editor WebView load the note
      .addStep(async () => {
        jestExpect(await readEditorTitle()).toBe("Persisted note");
        jestExpect(await readEditorBody()).toContain(
          "This body must survive a reopen."
        );
      })
      .exitEditor()
      .run();
  });

  it("edits a note and reflects the update", async () => {
    // Update: reopen the note, append text, exit, reopen again and verify
    // both the original and the appended content were saved.
    await TestBuilder.create()
      .prepare()
      .createNote("Editable note", "Original content.")
      .waitAndTapById(notesnook.ids.note.get(0))
      .wait(1000) // let the editor WebView load the note
      .addStep(async () => {
        await typeIntoEditorBody(" Edited content.");
      })
      .wait(500) // give the editor time to autosave
      .exitEditor()
      .waitAndTapById(notesnook.ids.note.get(0))
      .wait(1000)
      .addStep(async () => {
        const body = await readEditorBody();
        jestExpect(body).toContain("Original content.");
        jestExpect(body).toContain("Edited content.");
      })
      .exitEditor()
      .run();
  });

  it("deletes a note and removes it from the list", async () => {
    // Delete: list item menu -> "Move to trash". The app moves the note to
    // trash immediately (no confirmation dialog) and the properties sheet
    // closes itself, so the only post-condition is the note leaving the list.
    await TestBuilder.create()
      .prepare()
      .createNote("Disposable note", "This note is about to be deleted.")
      .waitAndTapById(notesnook.listitem.menu)
      .wait(500) // sheet open animation
      .waitAndTapById("icon-trash")
      .wait(500) // sheet close animation
      .isNotVisibleByText("Disposable note")
      .isNotVisibleByText("This note is about to be deleted.")
      .run();
  });

  it("handles a note with an empty title", async () => {
    // Edge case: a note created with body text but no title. Notesnook
    // auto-generates a title of the form "Note DD-MM-YYYY HH:MM" (verified
    // behavior), so the note must still appear in the list as item 0 with
    // its body as the preview text.
    await TestBuilder.create()
      .prepare()
      .createNote(undefined, "Body only, no title was entered.")
      .isVisibleById(notesnook.ids.note.get(0))
      .isVisibleByText("Body only, no title was entered.")
      .run();
  });
});
