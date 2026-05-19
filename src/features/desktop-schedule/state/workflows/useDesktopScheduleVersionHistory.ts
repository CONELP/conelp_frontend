import type { Ref } from "vue";

import type {
    MoveSession,
    ResizeSession,
    SummaryResizeSession,
} from "@/features/desktop-schedule/state/types/desktop-schedule-drag-session.types";
import type {
    DesktopScheduleHistoryDirection,
    DesktopScheduleLocalHistoryEntry,
} from "@/features/desktop-schedule/state/types/desktop-schedule-history.types";

type DesktopScheduleVersionHistoryDependencies = {
  localHistoryUndoStack: Ref<DesktopScheduleLocalHistoryEntry[]>;
  localHistoryRedoStack: Ref<DesktopScheduleLocalHistoryEntry[]>;
  interactionSession: Ref<MoveSession | ResizeSession | SummaryResizeSession | unknown | null>;
  moveLocalHistoryStackAndPersist: (
    direction: DesktopScheduleHistoryDirection,
    entry: DesktopScheduleLocalHistoryEntry,
    sourceStack: "undo" | "redo",
  ) => Promise<void>;
};

export function useDesktopScheduleVersionHistory({
  localHistoryUndoStack,
  localHistoryRedoStack,
  interactionSession,
  moveLocalHistoryStackAndPersist,
}: DesktopScheduleVersionHistoryDependencies) {
  async function undoLocalHistory() {
    const entry = localHistoryUndoStack.value[localHistoryUndoStack.value.length - 1];

    if (!entry || interactionSession.value) {
      return;
    }

    await moveLocalHistoryStackAndPersist("undo", entry, "undo");
  }

  async function redoLocalHistory() {
    const entry = localHistoryRedoStack.value[localHistoryRedoStack.value.length - 1];

    if (!entry || interactionSession.value) {
      return;
    }

    await moveLocalHistoryStackAndPersist("redo", entry, "redo");
  }

  return {
    undoLocalHistory,
    redoLocalHistory,
  };
}
