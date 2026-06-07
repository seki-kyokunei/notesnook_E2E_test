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

import { BasePage } from "./base-page";

/**
 * The search screen. Enter it via NoteListPage.openSearch().
 *
 * Search is FTS-backed (packages/core/src/api/lookup.ts) and debounced,
 * so query() waits out the debounce before callers assert on results.
 */
export class SearchPage extends BasePage {
  private readonly ids = {
    input: "search-input",
    clear: "clear-search",
    // Back arrow testID added specifically for e2e — the screen has no
    // header "left" button for the shared goBack() helper to fall back on.
    back: "search-back-button"
  };

  /** Type a query and wait out the debounced FTS lookup. */
  async query(text: string): Promise<void> {
    await this.typeTextById(this.ids.input, text);
    await this.sleep(1000); // debounced FTS query
  }

  /** Clear the current query (drops the screen back to its empty state). */
  async clearQuery(): Promise<void> {
    await this.waitAndTapById(this.ids.clear);
    await this.sleep(500);
  }

  /** Leave the search screen via its back arrow. */
  async goBack(): Promise<void> {
    await this.waitAndTapById(this.ids.back);
    await this.sleep(500);
  }

  /** Assert a result with this text is visible. */
  async expectResultVisible(text: string): Promise<void> {
    await this.expectTextVisible(text);
  }

  /** Assert no visible result shows this text. */
  async expectResultNotVisible(text: string): Promise<void> {
    await this.expectTextNotVisible(text);
  }
}
