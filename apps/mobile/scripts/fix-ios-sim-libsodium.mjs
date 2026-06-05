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

/*
E2E-assignment helper (not part of upstream Notesnook):

@ammarahmed/react-native-sodium vendors a prebuilt libsodium.a whose
arm64 slice targets iOS *devices* only (its simulator slice is x86_64).
Xcode 26 / iOS 26 simulators no longer run x86_64 apps, so a simulator
build needs an arm64-simulator slice.

scripts/ios-simulator-libs/libsodium-sim.a is libsodium 1.0.17 (the
exact vendored version) compiled for arm64-apple-ios-simulator and
lipo'd with the original x86_64 simulator slice. This script swaps it
into node_modules after every install so a fresh `npm install` keeps
the iOS Detox build working. The original device library is preserved
next to it as libsodium.a.device-backup.

NOTE: this makes the checked-out tree SIMULATOR-ONLY for iOS. To build
for a physical device, restore libsodium.a.device-backup.
*/

import { copyFileSync, existsSync, renameSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const source = path.join(__dirname, "ios-simulator-libs", "libsodium-sim.a");
const targetDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@ammarahmed",
  "react-native-sodium",
  "libsodium",
  "libsodium-ios",
  "lib"
);
const target = path.join(targetDir, "libsodium.a");
const backup = path.join(targetDir, "libsodium.a.device-backup");

if (!existsSync(source)) {
  console.warn("[fix-ios-sim-libsodium] vendored lib missing, skipping.");
  process.exit(0);
}

if (!existsSync(target)) {
  console.warn(
    "[fix-ios-sim-libsodium] react-native-sodium not installed, skipping."
  );
  process.exit(0);
}

if (statSync(target).size === statSync(source).size) {
  console.log("[fix-ios-sim-libsodium] simulator libsodium already in place.");
  process.exit(0);
}

if (!existsSync(backup)) {
  renameSync(target, backup);
}
copyFileSync(source, target);
console.log(
  "[fix-ios-sim-libsodium] swapped in arm64-simulator libsodium.a " +
    "(original kept as libsodium.a.device-backup)."
);
