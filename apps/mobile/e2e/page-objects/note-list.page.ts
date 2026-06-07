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
 * The home screen: the notes list, its list-item menus and the header's
 * "Search in Notes" bar (a single tappable element that navigates to the
 * search screen).
 */
export class NoteListPage extends BasePage {
  private readonly ids = {
    itemMenu: notesnook.listitem.menu,
    moveToTrash: "icon-trash",
    searchHeader: "search-header",
    noteAt: (index: number) => notesnook.ids.note.get(index)
  };

  /** Navigate (back) to the Notes screen via the side menu. */
  async open(): Promise<void> {
    await Tests.navigate("Notes");
    await this.sleep(500); // screen transition
  }

  /** Tap the note at `index` in the list to open it in the editor. */
  async openNoteAt(index: number): Promise<void> {
    await this.waitAndTapById(this.ids.noteAt(index));
  }

  /**
   * Move the first note to trash via its list-item menu. The app trashes
   * the note immediately (no confirmation dialog) and the properties
   * sheet closes itself, so the only post-condition callers can assert
   * is the note leaving the list.
   */
  async moveFirstNoteToTrash(): Promise<void> {
    await this.waitAndTapById(this.ids.itemMenu);
    await this.sleep(500); // sheet open animation
    await this.waitAndTapById(this.ids.moveToTrash);
    await this.sleep(500); // sheet close animation
  }

  /** Open the search screen via the header's "Search in Notes" bar. */
  async openSearch(): Promise<void> {
    await this.waitAndTapById(this.ids.searchHeader);
    await this.sleep(500); // search screen open animation
  }

  /** Assert a note's title or body preview is visible in the list. */
  async expectNoteVisible(text: string): Promise<void> {
    await this.expectTextVisible(text);
  }

  /** Assert no list item shows this title or body preview. */
  async expectNoteNotVisible(text: string): Promise<void> {
    await this.expectTextNotVisible(text);
  }

  /** Assert the list item at `index` exists and is visible. */
  async expectNoteItemVisible(index: number): Promise<void> {
    await this.expectIdVisible(this.ids.noteAt(index));
  }
}
