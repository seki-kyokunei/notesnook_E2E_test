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

/**
 * Centralized test data for the e2e suites — the third layer of the
 * page-objects / tests / fixtures architecture.
 *
 * All values are fixed and deterministic (no randomization): tests
 * reinstall the app before every case, so there is no cross-test state
 * to collide with, and stable strings keep failures reproducible.
 *
 * Grouped by suite; keys describe the note's ROLE in its scenario.
 */

export const fixtures = {
  /** note-lifecycle.e2e.ts — local CRUD scenarios. */
  notes: {
    /** Create: shows up in the list after creation. */
    lifecycle: {
      title: "Lifecycle note",
      body: "The body of the lifecycle note."
    },
    /** Read: content must survive a close + reopen round-trip. */
    persisted: {
      title: "Persisted note",
      body: "This body must survive a reopen."
    },
    /** Update: body gets `appendix` typed onto it in the editor. */
    edit: {
      title: "Editable note",
      body: "Original content.",
      // Typed with a leading space so it joins the existing body cleanly;
      // assertions use appendix.trim().
      appendix: " Edited content."
    },
    /** Delete: moved to trash from the list. */
    disposable: {
      title: "Disposable note",
      body: "This note is about to be deleted."
    },
    /** Edge case: created with a body but no title. */
    untitled: {
      body: "Body only, no title was entered."
    }
  },

  /** search-lifecycle.e2e.ts — searchable corpus + queries. */
  search: {
    /**
     * Three-note corpus with distinct, non-overlapping titles so a
     * single-word query matches exactly one of them.
     */
    corpus: [
      { title: "Apple note", body: "Body of the apple note." },
      { title: "Banana note", body: "Body of the banana note." },
      { title: "Cherry note", body: "Body of the cherry note." }
    ],
    queries: {
      /** Matches only corpus[0] ("Apple note"). */
      matching: "Apple",
      /** Matches nothing in the corpus. */
      noMatch: "Zzzzz",
      /** Lowercase form of `matching` — must still find "Apple note". */
      lowercaseMatching: "apple"
    }
  },

  /** trash-lifecycle.e2e.ts — one note per trash scenario. */
  trash: {
    /** Appears in trash after being moved there. */
    trashed: {
      title: "Trashed note",
      body: "This note is going to trash."
    },
    /** Restored back to the notes list. */
    restorable: {
      title: "Restorable note",
      body: "This note will be restored from trash."
    },
    /** Permanently deleted via the confirm dialog. */
    doomed: {
      title: "Doomed note",
      body: "This note will be deleted forever."
    },
    /** Wiped by "clear trash". */
    clearable: {
      title: "Clearable note",
      body: "This note will be cleared with the trash."
    }
  },

  /** notebook-lifecycle.e2e.ts — notebook + linkable notes. */
  notebooks: {
    /** The single notebook every scenario works with. */
    primary: {
      title: "Notebook A",
      withDescription: true
    },
    /** Created on the home list, then linked to `primary` via the picker. */
    linkedNote: {
      title: "Linked note",
      body: "Body of the linked note."
    },
    /** Created directly inside `primary`, then unlinked via selection mode. */
    insideNote: {
      title: "Inside note",
      body: "Body of the inside note."
    }
  }
} as const;
