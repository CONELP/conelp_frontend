let localPathIdCounter = Date.now();

export function createLocalPathId() {
  localPathIdCounter += 1;
  return localPathIdCounter;
}

export function createLocalRowId(prefix: "parent" | "child") {
  return `${prefix}:placeholder:${Date.now()}-${Math.floor(Math.random() * 1_000_000)
    .toString(36)}`;
}

export function createLocalEntityId(prefix: "critical-path" | "milestone") {
  return `${prefix}:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000)
    .toString(36)}`;
}

export function createLocalItemId() {
  return `item:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}
