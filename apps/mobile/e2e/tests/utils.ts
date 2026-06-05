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
import { device as _device, expect } from "detox";
import { readFileSync } from "fs";
//@ts-ignore
import { toMatchImageSnapshot } from "jest-image-snapshot";
import type { RouteName } from "../../app/stores/use-navigation-store";
import { notesnook } from "../test.ids";
jestExpect.extend({ toMatchImageSnapshot });

const testvars = {
  isFirstTest: true
};

class Element {
  element: Detox.NativeElement;
  constructor(public type: "id" | "text", public value: string) {
    if (type == "id") {
      this.element = element(by.id(value)).atIndex(0);
    } else {
      this.element = element(by.text(value)).atIndex(0);
    }
  }

  isVisible(timeout?: number) {
    return waitFor(this.element)
      .toBeVisible()
      .withTimeout(timeout || 5000);
  }

  isNotVisible(timeout?: number) {
    return waitFor(this.element)
      .not.toBeVisible()
      .withTimeout(timeout || 5000);
  }

  async waitAndTap(timeout?: number) {
    // The first match may be occluded (e.g. a sheet row behind a dialog
    // with the same text) or still animating in — retry across match
    // indices before giving up.
    const matcher =
      this.type === "id" ? by.id(this.value) : by.text(this.value);
    let lastError;
    for (const index of [0, 1, 0]) {
      const el = element(matcher).atIndex(index);
      try {
        await waitFor(el)
          .toBeVisible()
          .withTimeout(timeout || 5000);
        await el.tap();
        return;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }

  tap(point?: Detox.Point2D): Promise<void> {
    return this.element.tap(point);
  }

  static fromId(id: string) {
    return new Element("id", id);
  }
  static fromText(text: string) {
    return new Element("text", text);
  }
}

const Tests = {
  awaitLaunch: async () => {
    await device.disableSynchronization();
    // On iOS (Fabric), the root wrapper view is flattened behind its children,
    // so visibility-based matching always fails — check existence instead.
    await waitFor(element(by.id(notesnook.ids.default.root)))
      .toExist()
      //@ts-ignore
      .withTimeout(globalThis["DEBUG_MODE"] ? 4000 : 500);
  },
  sleep: (duration: number) => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve(undefined);
      }, duration)
    );
  },
  fromId: Element.fromId,
  fromText: Element.fromText,
  async exitEditor() {
    if (_device.getPlatform() === "ios") {
      // pressBack is Android-only; tap the editor's in-webview back button.
      await web().element(by.web.id("editor-back-button")).tap();
      return;
    }
    await _device.pressBack();
    await _device.pressBack();
  },
  async goBack() {
    if (_device.getPlatform() === "ios") {
      // No hardware back button on iOS — dismiss the topmost sheet by
      // tapping its backdrop (near the top, above the sheet content).
      // Wait out any closing animation first: a backdrop that disappears
      // on its own was already being dismissed and shouldn't consume
      // this back press.
      const backdrop = element(by.id("sheet-backdrop")).atIndex(0);
      try {
        await waitFor(backdrop).not.toExist().withTimeout(1500);
      } catch (e) {
        // a sheet is genuinely open — dismiss it
        await backdrop.tap({ x: 220, y: 200 });
        await Tests.sleep(500);
        return;
      }
      // Emulate Android hardware back for screens: tap the header left
      // button (back arrow on nested screens). If it opened the side menu
      // instead (drawer-level screen), go to Notes — Android's back
      // returns to the initial route there.
      await Tests.fromId(
        notesnook.ids.default.header.buttons.left
      ).waitAndTap();
      try {
        await waitFor(element(by.id("sidemenu-settings-icon")).atIndex(0))
          .toBeVisible()
          .withTimeout(1500);
        await Tests.fromText("Notes").waitAndTap();
      } catch (e) {
        // header button navigated back instead of opening the drawer
      }
      await Tests.sleep(300);
      return;
    }
    await _device.pressBack();
  },
  async createNote(title?: string, _body?: string) {
    let body =
      _body ||
      "Test note description that is very long and should not fit in text.";
    await Tests.fromId(notesnook.buttons.add).tap();
    if (title) {
      if (_device.getPlatform() === "ios") {
        // typeText silently fails on the React-controlled textarea on iOS;
        // set the value natively and fire an input event instead.
        await web()
          .element(by.web.id("editor-title"))
          .runScript(
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
      } else {
        await web().element(by.web.id("editor-title")).focus();
        await web().element(by.web.id("editor-title")).typeText(title, false);
      }
    }
    await expect(web().element(by.web.className("ProseMirror"))).toExist();
    await web().element(by.web.className("ProseMirror")).focus();
    await web().element(by.web.className("ProseMirror")).typeText(body, true);
    await Tests.exitEditor();
    await Tests.fromText(body).isVisible();
    return { title, body };
  },
  async navigate(screen: RouteName | ({} & string)) {
    if (_device.getPlatform() === "ios") {
      // Wait out the sheet-dismiss animation — the fading backdrop
      // intercepts taps on the header menu button.
      try {
        await waitFor(element(by.id("sheet-backdrop")).atIndex(0))
          .not.toExist()
          .withTimeout(5000);
      } catch (e) {
        // backdrop still around; proceed and let the tap fail loudly
      }
    }
    let menu = Tests.fromId(notesnook.ids.default.header.buttons.left);
    await menu.waitAndTap();
    await Tests.fromText(screen as string).waitAndTap();
  },
  async openSideMenu() {
    await Tests.fromId(notesnook.ids.default.header.buttons.left).waitAndTap();
  },
  async prepare() {
    await device.disableSynchronization();
    if (testvars.isFirstTest) {
      testvars.isFirstTest = false;
      return await Tests.awaitLaunch();
    }
    await device.reverseTcpPort(8081);
    await device.uninstallApp();
    await device.installApp();
    await device.launchApp({ newInstance: true });
    await Tests.awaitLaunch();
  },
  async createNotebook(title = "Notebook 1", description = true) {
    await Tests.sleep(1000);
    const titleInput = Tests.fromId(
      notesnook.ids.dialogs.notebook.inputs.title
    );
    await titleInput.isVisible();
    await titleInput.element.typeText(title);
    await Tests.sleep(1000);
    if (description) {
      await Tests.fromId(
        notesnook.ids.dialogs.notebook.inputs.description
      ).element.typeText(`Description of ${title}`);
    }
    await Tests.fromText("Add").waitAndTap();
  },
  async matchSnapshot(element: Element, name: string) {
    let path = await element.element.takeScreenshot(name);
    const bitmapBuffer = readFileSync(path);
    (jestExpect(bitmapBuffer) as any).toMatchImageSnapshot({
      failureThreshold: 200,
      failureThresholdType: "pixel"
    });
  }
};

class TestBuilder {
  private steps: (() => Promise<void> | void)[] = [];
  private result: any;
  private savedResult: any;
  constructor() {}

  saveResult() {
    return this.addStep(() => {
      this.savedResult = this.result;
    });
  }

  addStep(step: () => Promise<void> | void) {
    this.steps.push(step);
    return this;
  }

  awaitLaunch() {
    return this.addStep(async () => {
      await Tests.awaitLaunch();
    });
  }

  wait(duration = 500) {
    return this.addStep(async () => {
      await Tests.sleep(duration);
    });
  }

  fromId(id: string) {
    return this.addStep(() => {
      this.result = Tests.fromId(id);
    });
  }

  fromText(text: string) {
    return this.addStep(() => {
      this.result = Tests.fromText(text);
    });
  }

  exitEditor() {
    return this.addStep(async () => {
      await Tests.exitEditor();
    });
  }

  createNote(title?: string, body?: string) {
    return this.addStep(async () => {
      this.result = await Tests.createNote(title, body);
    });
  }

  navigate(screen: RouteName | ({} & string)) {
    return this.addStep(async () => {
      await Tests.navigate(screen);
    });
  }

  openSideMenu() {
    return this.addStep(async () => {
      await Tests.openSideMenu();
    });
  }

  prepare() {
    return this.addStep(async () => {
      await Tests.prepare();
    });
  }

  createNotebook(title = "Notebook 1", description = true) {
    return this.addStep(async () => {
      await Tests.createNotebook(title, description);
    });
  }

  matchSnapshot(element: Element, name: string) {
    return this.addStep(async () => {
      await Tests.matchSnapshot(element, name);
    });
  }

  isVisibleById(id: string, timeout?: number) {
    return this.addStep(async () => {
      const element = new Element("id", id);
      await element.isVisible(timeout);
    });
  }

  isVisibleByText(text: string, timeout?: number) {
    return this.addStep(async () => {
      const element = new Element("text", text);
      await element.isVisible(timeout);
    });
  }

  isNotVisibleById(id: string, timeout?: number) {
    return this.addStep(async () => {
      const element = new Element("id", id);
      await element.isNotVisible(timeout);
    });
  }

  isNotVisibleByText(text: string, timeout?: number) {
    return this.addStep(async () => {
      const element = new Element("text", text);
      await element.isNotVisible(timeout);
    });
  }

  waitAndTapById(id: string, timeout?: number) {
    return this.addStep(async () => {
      const element = new Element("id", id);
      await element.waitAndTap(timeout);
    });
  }

  waitAndTapByText(text: string, timeout?: number) {
    return this.addStep(async () => {
      const element = new Element("text", text);
      await element.waitAndTap(timeout);
    });
  }

  tapById(id: string, point?: Detox.Point2D) {
    return this.addStep(async () => {
      const element = new Element("id", id);
      await element.tap(point);
    });
  }

  tapReturnKeyById(id: string) {
    return this.addStep(async () => {
      const element = new Element("id", id);
      await element.element.tapReturnKey();
    });
  }

  tapByText(text: string, point?: Detox.Point2D) {
    return this.addStep(async () => {
      const element = new Element("text", text);
      await element.tap(point);
    });
  }

  processResult(callback: (result: any) => Promise<void>) {
    return this.addStep(async () => {
      if (this.savedResult) {
        await callback(this.savedResult);
      } else {
        throw new Error("No result to process.");
      }
    });
  }

  typeTextById(id: string, text: string) {
    return this.addStep(async () => {
      const el = Element.fromId(id);
      await waitFor(el.element).toExist().withTimeout(5000);
      await el.element.typeText(text);
    });
  }

  clearTextById(id: string) {
    return this.addStep(async () => {
      await Element.fromId(id).element.clearText();
    });
  }

  pressBack(count = 1) {
    return this.addStep(async () => {
      for (let i = 0; i < count; i++) {
        await Tests.goBack();
      }
    });
  }

  longPressByText(text: string) {
    return this.addStep(async () => {
      const element = new Element("text", text);
      await element.element.longPress();
    });
  }

  longPressById(id: string) {
    return this.addStep(async () => {
      const element = new Element("id", id);
      await element.element.longPress();
    });
  }

  async run() {
    for (const step of this.steps) {
      const result = step.call(this);
      if (result instanceof Promise) {
        await result;
      }
    }
    this.steps = []; // Clear steps after execution
  }
  static create() {
    return new TestBuilder();
  }
}

export { Element, Tests, TestBuilder };
