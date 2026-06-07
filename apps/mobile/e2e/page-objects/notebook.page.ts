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

import { notesnook } from "../test.ids";
import { Tests } from "../tests/utils";
import { BasePage } from "./base-page";

/**
 * Notebooks: the side menu's notebooks tab, the notebook screen, and the
 * note <-> notebook linking flows.
 *
 * Verified behavior (app source + the project's own notebook suite):
 * - Notebook list items render testID `notebook-item-${depth}-${index}`
 *   (side-menu/notebook-item.tsx) — NOT the `notebook-item-N` recorded in
 *   the test.ids registry, which is stale. A top-level first notebook is
 *   "notebook-item-0-0". The same component backs the link-notebooks
 *   picker, so the ids work there too.
 * - "Add to notebook" on a note is action id "notebooks" -> testID
 *   "icon-notebooks" (use-actions.tsx), which opens a picker; the link is
 *   only saved after tapping "floating-save-button".
 * - Removing a note from a notebook goes through selection mode: long-press
 *   the note inside the notebook, then tap the selection header's
 *   "select-minus" action (selection-header/index.tsx, visible only on
 *   Notebook routes). No confirm dialog. The note menu's
 *   "remove-from-notebook" action is conditionally hidden, so it is not
 *   used here (matches the upstream suite's approach).
 */
export class NotebookPage extends BasePage {
  private readonly ids = {
    notebooksTab: "tab-notebooks",
    homeTab: "tab-home",
    sidebarAddButton: "sidebar-add-button",
    addToNotebook: "icon-notebooks",
    saveNotebookLink: "floating-save-button",
    removeSelectedFromNotebook: "select-minus",
    noteMenu: notesnook.listitem.menu,
    /** Actual rendered id — the registry's notebook-item-N is stale. */
    notebookAt: (index: number, depth = 0) => `notebook-item-${depth}-${index}`
  };

  /** Open the side menu's notebooks tab (shows the notebooks list). */
  async openNotebooksList(): Promise<void> {
    await Tests.openSideMenu();
    await this.waitAndTapById(this.ids.notebooksTab);
    await this.sleep(500); // tab switch animation
  }

  /**
   * Create a notebook from anywhere: notebooks tab -> sidebar add button
   * -> title/description dialog. Delegates the dialog interaction to the
   * shared Tests.createNotebook helper.
   */
  async create(title: string, withDescription = false): Promise<void> {
    await this.openNotebooksList();
    await this.waitAndTapById(this.ids.sidebarAddButton);
    await Tests.createNotebook(title, withDescription);
    await this.sleep(500); // dialog close + list update
  }

  /** From the (open) notebooks list, open the notebook at `index`. */
  async openNotebookAt(index: number): Promise<void> {
    await this.waitAndTapById(this.ids.notebookAt(index));
    await this.sleep(500); // screen transition
  }

  /** From the open side menu, return to the home tab's Notes screen. */
  async returnToNotesHome(): Promise<void> {
    await this.waitAndTapById(this.ids.homeTab);
    await this.waitAndTapByText("Notes");
    await this.sleep(500); // screen transition
  }

  /**
   * Link the first note in the notes list to a notebook:
   * note menu -> "icon-notebooks" -> pick the notebook -> save.
   * The picker reuses the sidebar's NotebookItem component, so the
   * first/top-level notebook is selectable by the same generated id.
   */
  async linkFirstNoteToNotebook(notebookIndex = 0): Promise<void> {
    await this.waitAndTapById(this.ids.noteMenu);
    await this.sleep(500); // properties sheet open animation
    await this.waitAndTapById(this.ids.addToNotebook);
    await this.sleep(500); // picker open animation
    await this.waitAndTapById(this.ids.notebookAt(notebookIndex));
    await this.sleep(300); // selection state update
    await this.waitAndTapById(this.ids.saveNotebookLink);
    await this.sleep(500); // picker close + list update
  }

  /**
   * Remove a note from the open notebook via selection mode:
   * long-press the note, then tap the selection header's minus action.
   * No confirm dialog; selection clears itself afterwards.
   */
  async removeNoteFromNotebook(noteText: string): Promise<void> {
    await this.longPressByText(noteText);
    await this.sleep(500); // selection mode + header animation
    await this.waitAndTapById(this.ids.removeSelectedFromNotebook);
    await this.sleep(500); // unlink + list update
  }

  /** Assert a notebook with this title is visible in the notebooks list. */
  async expectNotebookVisible(title: string): Promise<void> {
    await this.expectTextVisible(title);
  }

  /** Assert a note (by title or preview) is listed inside the open notebook. */
  async expectNoteInNotebook(text: string): Promise<void> {
    await this.expectTextVisible(text);
  }

  /** Assert a note is NOT listed inside the open notebook. */
  async expectNoteNotInNotebook(text: string): Promise<void> {
    await this.expectTextNotVisible(text);
  }
}
