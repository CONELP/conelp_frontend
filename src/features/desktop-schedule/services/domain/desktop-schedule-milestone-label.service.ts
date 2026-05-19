const EMPTY_MILESTONE_SYNC_NAME_PREFIX = "__conelp_empty_milestone__";

function createStableSyncNameSuffix(localMilestoneId: string) {
  const suffix = localMilestoneId.replace(/[^a-zA-Z0-9]/g, "").slice(-24);
  return suffix || Date.now().toString(36);
}

export function createEmptyMilestoneSyncName(localMilestoneId: string) {
  return `${EMPTY_MILESTONE_SYNC_NAME_PREFIX}${createStableSyncNameSuffix(localMilestoneId)}`;
}

export function normalizeMilestoneLabelFromApi(name: string) {
  return name.startsWith(EMPTY_MILESTONE_SYNC_NAME_PREFIX) ? "" : name;
}
