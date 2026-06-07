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
 * The Trash screen (side menu -> Trash).
 *
 * Verified behavior (hooks/use-actions.tsx):
 * - Restore ("icon-restore") restores IMMEDIATELY — no confirm dialog,
 *   just a success toast.
 * - Permanent delete ("icon-delete") closes the properties sheet, waits
 *   300ms, then presents a confirm dialog whose positive/negative buttons
 *   carry the generic dialog testIDs "yes"/"no" (dialog-buttons.tsx).
 * - "Clear trash" ("trash-clear", screens/trash/index.tsx) uses the same
 *   confirm dialog.
 */
export class TrashPage extends BasePage {
  private readonly ids = {
    itemMenu: notesnook.listitem.menu,
    restore: "icon-restore",
    deleteForever: "icon-delete",
    clearAllButton: "trash-clear",
    confirmYes: notesnook.ids.default.dialog.yes
  };

  /** Navigate to the Trash screen via the side menu. */
  async open(): Promise<void> {
    await Tests.navigate("Trash");
    await this.sleep(500); // screen transition + list settle
  }

  /** Open the first trash item's properties sheet. */
  private async openFirstItemMenu(): Promise<void> {
    await this.waitAndTapById(this.ids.itemMenu);
    await this.sleep(500); // sheet open animation
  }

  /**
   * Restore the first item in trash back to its original location.
   * No confirm dialog — the app restores immediately and shows a toast.
   */
  async restoreFirstItem(): Promise<void> {
    await this.openFirstItemMenu();
    await this.waitAndTapById(this.ids.restore);
    await this.sleep(500); // sheet close + list update
  }

  /**
   * Permanently delete the first item in trash, confirming the dialog.
   * The app closes the sheet and waits 300ms before presenting the
   * dialog, so wait generously before tapping "yes".
   */
  async permanentlyDeleteFirstItem(): Promise<void> {
    await this.openFirstItemMenu();
    await this.waitAndTapById(this.ids.deleteForever);
    await this.sleep(800); // sheet close + 300ms app delay + dialog open
    await this.waitAndTapById(this.ids.confirmYes);
    await this.sleep(500); // dialog close + list update
  }

  /** Clear the entire trash via the header button, confirming the dialog. */
  async clearAll(): Promise<void> {
    await this.waitAndTapById(this.ids.clearAllButton);
    await this.sleep(500); // confirm dialog open
    await this.waitAndTapById(this.ids.confirmYes);
    await this.sleep(500); // dialog close + list update
  }

  /** Assert an item with this title/preview is in the trash list. */
  async expectItemVisible(text: string): Promise<void> {
    await this.expectTextVisible(text);
  }

  /** Assert no trash item shows this title/preview. */
  async expectItemNotVisible(text: string): Promise<void> {
    await this.expectTextNotVisible(text);
  }
}
