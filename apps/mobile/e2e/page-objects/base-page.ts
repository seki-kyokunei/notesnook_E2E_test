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

import { Element, Tests } from "../tests/utils";

/**
 * Base class for all page objects.
 *
 * A thin wrapper over the project's existing Tests/Element helpers
 * (e2e/tests/utils.ts) so every page object shares one vocabulary for
 * waits, taps, typing and visibility assertions. The low-level Detox
 * plumbing (waitAndTap retry across occluded matches, iOS back-press
 * emulation, fresh-install prepare) intentionally stays in utils.ts —
 * page objects only add a screen-oriented API on top.
 */
export abstract class BasePage {
  /** Pause to let animations or debounced work settle. */
  protected sleep(duration: number): Promise<unknown> {
    return Tests.sleep(duration);
  }

  protected byId(id: string): Element {
    return Tests.fromId(id);
  }

  protected byText(text: string): Element {
    return Tests.fromText(text);
  }

  /** Wait for the element to be visible, then tap it (retries occluded matches). */
  protected async waitAndTapById(id: string, timeout?: number): Promise<void> {
    await Tests.fromId(id).waitAndTap(timeout);
  }

  /** Wait for a text element to be visible, then tap it. */
  protected async waitAndTapByText(text: string, timeout?: number): Promise<void> {
    await Tests.fromText(text).waitAndTap(timeout);
  }

  /** Long-press a visible text element (e.g. to enter selection mode). */
  protected async longPressByText(text: string): Promise<void> {
    await Tests.fromText(text).element.longPress();
  }

  /** Wait for the input to exist, then type into it. */
  protected async typeTextById(id: string, text: string): Promise<void> {
    const input = Tests.fromId(id);
    await waitFor(input.element).toExist().withTimeout(5000);
    await input.element.typeText(text);
  }

  async expectTextVisible(text: string, timeout?: number): Promise<void> {
    await Tests.fromText(text).isVisible(timeout);
  }

  async expectTextNotVisible(text: string, timeout?: number): Promise<void> {
    await Tests.fromText(text).isNotVisible(timeout);
  }

  async expectIdVisible(id: string, timeout?: number): Promise<void> {
    await Tests.fromId(id).isVisible(timeout);
  }
}
