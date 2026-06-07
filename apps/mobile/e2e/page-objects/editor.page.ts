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
import { Tests } from "../tests/utils";
import { BasePage } from "./base-page";

/**
 * The note editor.
 *
 * This is not native UI: the editor is a WebView (packages/editor-mobile)
 * where the title is a <textarea id="editor-title"> and the body is a
 * ProseMirror contenteditable. All reads and writes go through Detox's
 * web API.
 *
 * Tab model: the WebView keeps previously opened notes mounted as frozen
 * tabs (react-freeze), so the DOM can contain several #editor-title /
 * .ProseMirror nodes at once. The focused tab's root element carries the
 * "active" class (editor.tsx), which the active-tab methods below use to
 * pin writes to the note actually being edited — first-DOM-match
 * selectors can silently hit a previous note's frozen tab during
 * back-to-back creations and cross-contaminate content.
 */
export class EditorPage extends BasePage {
  // --- element handles (first DOM match — fine for a single open tab) ---

  private title() {
    return web().element(by.web.id("editor-title"));
  }

  private body() {
    return web().element(by.web.className("ProseMirror"));
  }

  // --- element handles scoped to the ACTIVE tab (react-freeze safe) -----

  private activeTitle() {
    return web().element(by.web.cssSelector(".active #editor-title"));
  }

  private activeBody() {
    return web().element(by.web.cssSelector(".active .ProseMirror"));
  }

  // --- reads -------------------------------------------------------------

  /** Read the current title from the editor WebView. */
  readTitle(): Promise<string> {
    return this.title().runScript("(el) => el.value");
  }

  /** Read the current body text from the editor WebView. */
  readBody(): Promise<string> {
    return this.body().runScript("(el) => el.textContent");
  }

  // --- writes ------------------------------------------------------------

  /** Append text to the note body inside the editor WebView. */
  async appendToBody(text: string): Promise<void> {
    await this.body().focus();
    await this.body().typeText(text, true);
  }

  // --- waits -------------------------------------------------------------

  /** Give the editor WebView time to load a (re)opened note. */
  async waitForLoad(): Promise<void> {
    await this.sleep(1000);
  }

  /** Give the editor time to autosave after a write (debounced). */
  async waitForAutosave(): Promise<void> {
    await this.sleep(500);
  }

  // --- flows -------------------------------------------------------------

  /**
   * Create a note from the notes list: tap add, type title + body, exit.
   * Delegates to the shared Tests.createNote helper, which already
   * asserts the body preview is visible back in the list.
   */
  async createNote(title: string | undefined, body: string): Promise<void> {
    await Tests.createNote(title, body);
  }

  /**
   * Create a note writing ONLY into the active editor tab.
   *
   * The shared Tests.createNote matches #editor-title / .ProseMirror by
   * first DOM match, which on back-to-back creations can write into a
   * previous note's frozen tab (see the react-freeze note in the class
   * docs). Scoping every selector with ".active ..." pins the writes to
   * the note actually being created. Same post-condition as
   * Tests.createNote: the body preview must be visible in the list.
   */
  async createNoteInActiveTab(title: string, body: string): Promise<void> {
    await Tests.fromId(notesnook.buttons.add).waitAndTap();
    await this.sleep(1000); // editor tab open + WebView ready

    // The title textarea is a React-controlled component — write through
    // the native value setter + input event (simulated typing is swallowed).
    await this.activeTitle().runScript(
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
    await this.activeBody().focus();
    await this.activeBody().typeText(body, true);
    await this.exit();
    await this.expectTextVisible(body);
  }

  /** Leave the editor and return to the notes list. */
  async exit(): Promise<void> {
    await Tests.exitEditor();
  }
}
