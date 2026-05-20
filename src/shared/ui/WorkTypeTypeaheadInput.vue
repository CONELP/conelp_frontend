<template>
  <span
    ref="rootRef"
    class="work-type-typeahead"
    :class="[
      `work-type-typeahead--${variant}`,
      `work-type-typeahead--placement-${placement}`,
    ]"
  >
    <input
      :id="inputId || generatedInputId"
      class="work-type-typeahead__input"
      :value="modelValue"
      type="text"
      autocomplete="off"
      :disabled="disabled"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      role="combobox"
      :aria-expanded="isOpen"
      aria-autocomplete="list"
      :aria-activedescendant="activeDescendantId"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="openSuggestionList"
      @blur="scheduleCloseSuggestionList"
    />

    <Teleport to="body" :disabled="!shouldFloatMenu">
      <Transition name="work-type-typeahead-menu">
        <div
          v-if="isOpen"
          class="work-type-typeahead__menu"
          :class="[
            `work-type-typeahead__menu--${variant}`,
            `work-type-typeahead__menu--placement-${menuPlacement}`,
            { 'work-type-typeahead__menu--floating': shouldFloatMenu },
          ]"
          :style="shouldFloatMenu ? floatingMenuStyle : undefined"
          role="listbox"
          aria-label="공종명 후보"
          @mousedown.prevent
        >
          <p
            v-if="isLoading"
            class="work-type-typeahead__state"
          >
            {{ loadingMessage }}
          </p>

          <p
            v-else-if="errorMessage"
            class="work-type-typeahead__state"
          >
            {{ errorMessage }}
          </p>

          <template v-else-if="suggestions.length > 0">
            <button
              v-for="(suggestion, suggestionIndex) in suggestions"
              :id="getSuggestionOptionId(suggestion, suggestionIndex)"
              :key="`${suggestion.id}-${suggestionIndex}`"
              class="work-type-typeahead__option"
              :class="{
                'work-type-typeahead__option--highlighted':
                  highlightedIndex === suggestionIndex,
              }"
              type="button"
              role="option"
              :aria-selected="highlightedIndex === suggestionIndex"
              @mouseenter="setHighlightedIndex(suggestionIndex)"
              @click="selectSuggestion(suggestion)"
            >
              {{ suggestion.name }}
            </button>
          </template>

          <p
            v-else-if="shouldShowNoResults"
            class="work-type-typeahead__state"
          >
            {{ noResultsMessage }}
          </p>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

type WorkTypeTypeaheadVariant = "upload" | "daily-report" | "sheet";
type WorkTypeTypeaheadPlacement = "bottom" | "top";

interface WorkTypeTypeaheadOption {
  id: number;
  name: string;
  divisionId?: number | null;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    loadSuggestions: (query: string) => Promise<WorkTypeTypeaheadOption[]>;
    selectedId?: number | null;
    placeholder?: string;
    ariaLabel?: string;
    inputId?: string;
    optionIdPrefix?: string;
    variant?: WorkTypeTypeaheadVariant;
    placement?: WorkTypeTypeaheadPlacement;
    loadingMessage?: string;
    noResultsMessage?: string;
    disabled?: boolean;
    teleportMenu?: boolean;
  }>(),
  {
    selectedId: null,
    placeholder: "",
    ariaLabel: "공종명",
    inputId: "",
    optionIdPrefix: "",
    variant: "daily-report",
    placement: "bottom",
    loadingMessage: "불러오는 중",
    noResultsMessage: "매칭되는 공종명이 없어요",
    disabled: false,
    teleportMenu: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  select: [suggestion: WorkTypeTypeaheadOption];
}>();

const generatedInputId = `work-type-typeahead-${Math.random()
  .toString(36)
  .slice(2)}`;
const suggestions = ref<WorkTypeTypeaheadOption[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const loadedQuery = ref("");
const requestId = ref(0);
const rootRef = ref<HTMLElement | null>(null);
const floatingMenuStyle = ref<Record<string, string>>({});
const floatingMenuPlacement = ref<WorkTypeTypeaheadPlacement>(props.placement);
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let hasFloatingListeners = false;

const shouldFloatMenu = computed(
  () => props.teleportMenu || props.variant === "sheet",
);
const menuPlacement = computed(() =>
  shouldFloatMenu.value ? floatingMenuPlacement.value : props.placement,
);

const optionIdPrefix = computed(
  () => props.optionIdPrefix || `${props.inputId || generatedInputId}-option`,
);

const activeDescendantId = computed(() => {
  const suggestion = suggestions.value[highlightedIndex.value];

  return suggestion
    ? getSuggestionOptionId(suggestion, highlightedIndex.value)
    : undefined;
});

const shouldShowNoResults = computed(() => {
  const query = props.modelValue.trim();

  return (
    query.length > 0 &&
    props.selectedId === null &&
    loadedQuery.value === query &&
    !isLoading.value &&
    !errorMessage.value &&
    suggestions.value.length === 0
  );
});

function getEstimatedMenuHeight() {
  const itemCount = Math.max(suggestions.value.length, 1);
  const rowHeight = props.variant === "upload" ? 38 : 32;
  const padding = props.variant === "upload" ? 12 : 10;
  const maxHeight =
    props.variant === "upload" ? 224 : props.variant === "sheet" ? 160 : 192;

  return Math.min(maxHeight, itemCount * rowHeight + padding);
}

function updateFloatingMenuPosition() {
  if (!shouldFloatMenu.value || !isOpen.value || typeof window === "undefined") {
    return;
  }

  const root = rootRef.value;
  if (!root) {
    return;
  }

  const rect = root.getBoundingClientRect();
  const viewportPadding = 8;
  const gap = 6;
  const minWidth = props.variant === "sheet" ? 168 : rect.width;
  const width = Math.max(rect.width, minWidth);
  const estimatedHeight = getEstimatedMenuHeight();
  const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
  const availableAbove = rect.top - viewportPadding - gap;
  const shouldOpenAbove =
    props.placement === "top"
      ? availableAbove > availableBelow
      : availableBelow < Math.min(estimatedHeight, 128) &&
        availableAbove > availableBelow;
  const availableSpace = Math.max(
    96,
    shouldOpenAbove ? availableAbove : availableBelow,
  );
  const maxHeight = Math.min(estimatedHeight, availableSpace);
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    Math.max(viewportPadding, window.innerWidth - viewportPadding - width),
  );
  const top = shouldOpenAbove
    ? Math.max(viewportPadding, rect.top - gap - maxHeight)
    : Math.min(
        window.innerHeight - viewportPadding - maxHeight,
        rect.bottom + gap,
      );

  floatingMenuPlacement.value = shouldOpenAbove ? "top" : "bottom";
  floatingMenuStyle.value = {
    left: `${left}px`,
    top: `${Math.max(viewportPadding, top)}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
  };
}

function queueFloatingMenuUpdate() {
  if (!shouldFloatMenu.value) {
    return;
  }

  void nextTick(() => updateFloatingMenuPosition());
}

function addFloatingListeners() {
  if (
    hasFloatingListeners ||
    !shouldFloatMenu.value ||
    typeof window === "undefined"
  ) {
    return;
  }

  window.addEventListener("resize", updateFloatingMenuPosition, {
    passive: true,
  });
  window.addEventListener("scroll", updateFloatingMenuPosition, {
    capture: true,
    passive: true,
  });
  hasFloatingListeners = true;
}

function removeFloatingListeners() {
  if (!hasFloatingListeners || typeof window === "undefined") {
    return;
  }

  window.removeEventListener("resize", updateFloatingMenuPosition);
  window.removeEventListener("scroll", updateFloatingMenuPosition, true);
  hasFloatingListeners = false;
}

function getSuggestionOptionId(
  suggestion: WorkTypeTypeaheadOption,
  suggestionIndex: number,
) {
  return `${optionIdPrefix.value}-${suggestion.id}-${suggestionIndex}`;
}

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function clearSuggestions() {
  suggestions.value = [];
  errorMessage.value = "";
  isLoading.value = false;
  isOpen.value = false;
  highlightedIndex.value = -1;
  loadedQuery.value = "";
}

async function loadWorkTypeSuggestions(value: string) {
  const query = value.trim();
  const nextRequestId = requestId.value + 1;
  requestId.value = nextRequestId;

  if (!query || props.disabled) {
    clearSuggestions();
    return;
  }

  if (
    query === loadedQuery.value &&
    (isLoading.value || suggestions.value.length > 0)
  ) {
    isOpen.value = true;
    queueFloatingMenuUpdate();
    highlightedIndex.value =
      highlightedIndex.value >= 0
        ? highlightedIndex.value
        : suggestions.value.length > 0
          ? 0
          : -1;
    return;
  }

  loadedQuery.value = query;
  isLoading.value = true;
  errorMessage.value = "";
  isOpen.value = true;
  queueFloatingMenuUpdate();

  try {
    const nextSuggestions = await props.loadSuggestions(query);

    if (requestId.value !== nextRequestId) {
      return;
    }

    suggestions.value = nextSuggestions;
    highlightedIndex.value = nextSuggestions.length > 0 ? 0 : -1;
    queueFloatingMenuUpdate();
  } catch (error) {
    if (requestId.value !== nextRequestId) {
      return;
    }

    suggestions.value = [];
    highlightedIndex.value = -1;
    errorMessage.value =
      error instanceof Error ? error.message : "공종명을 불러오지 못했습니다.";
    queueFloatingMenuUpdate();
  } finally {
    if (requestId.value === nextRequestId) {
      isLoading.value = false;
      queueFloatingMenuUpdate();
    }
  }
}

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const nextValue = input?.value ?? "";

  emit("update:modelValue", nextValue);
  highlightedIndex.value = -1;
  void loadWorkTypeSuggestions(nextValue);
}

function setHighlightedIndex(index: number) {
  highlightedIndex.value = Math.min(
    Math.max(index, -1),
    suggestions.value.length - 1,
  );
}

function moveHighlightedIndex(direction: 1 | -1) {
  const suggestionCount = suggestions.value.length;

  clearCloseTimer();

  if (props.modelValue.trim()) {
    isOpen.value = true;
    queueFloatingMenuUpdate();
  }

  if (suggestionCount === 0) {
    if (!isLoading.value) {
      void loadWorkTypeSuggestions(props.modelValue);
    }
    return;
  }

  const baseIndex =
    highlightedIndex.value >= 0
      ? highlightedIndex.value
      : direction === 1
        ? -1
        : 0;

  highlightedIndex.value =
    (baseIndex + direction + suggestionCount) % suggestionCount;
}

function selectSuggestion(suggestion: WorkTypeTypeaheadOption) {
  clearCloseTimer();
  requestId.value += 1;
  emit("update:modelValue", suggestion.name);
  emit("select", suggestion);
  suggestions.value = [];
  errorMessage.value = "";
  isOpen.value = false;
  highlightedIndex.value = -1;
  loadedQuery.value = suggestion.name.trim();
}

function selectHighlightedSuggestion() {
  const suggestionCount = suggestions.value.length;

  if (!isOpen.value || suggestionCount === 0) {
    return false;
  }

  const selectedIndex =
    highlightedIndex.value >= 0 && highlightedIndex.value < suggestionCount
      ? highlightedIndex.value
      : 0;
  const suggestion = suggestions.value[selectedIndex];

  if (!suggestion) {
    return false;
  }

  selectSuggestion(suggestion);
  return true;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveHighlightedIndex(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveHighlightedIndex(-1);
    return;
  }

  if (event.key === "Enter" && !event.isComposing) {
    if (selectHighlightedSuggestion()) {
      event.preventDefault();
    }
    return;
  }

  if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    isOpen.value = false;
    highlightedIndex.value = -1;
  }
}

function openSuggestionList() {
  clearCloseTimer();

  const query = props.modelValue.trim();

  if (!query) {
    return;
  }

  if (props.selectedId !== null && suggestions.value.length === 0) {
    return;
  }

  isOpen.value = true;
  queueFloatingMenuUpdate();
  highlightedIndex.value =
    highlightedIndex.value >= 0
      ? highlightedIndex.value
      : suggestions.value.length > 0
        ? 0
        : -1;

  if (!isLoading.value && suggestions.value.length === 0) {
    void loadWorkTypeSuggestions(query);
  }
}

function scheduleCloseSuggestionList() {
  clearCloseTimer();
  closeTimer = setTimeout(() => {
    isOpen.value = false;
    closeTimer = null;
  }, 120);
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value.trim()) {
      requestId.value += 1;
      clearSuggestions();
    }
  },
);

watch(
  [isOpen, shouldFloatMenu],
  ([open, shouldFloat]) => {
    if (open && shouldFloat) {
      addFloatingListeners();
      queueFloatingMenuUpdate();
      return;
    }

    removeFloatingListeners();
  },
);

watch(
  () => props.placement,
  (placement) => {
    floatingMenuPlacement.value = placement;
    queueFloatingMenuUpdate();
  },
);

onBeforeUnmount(() => {
  clearCloseTimer();
  removeFloatingListeners();
  requestId.value += 1;
});
</script>

<style scoped>
.work-type-typeahead {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
}

.work-type-typeahead__input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(20, 24, 33, 0.1);
  background: #fff;
  color: var(--ink, #111827);
  font: inherit;
}

.work-type-typeahead__input::placeholder {
  color: rgba(20, 24, 33, 0.34);
  font-style: italic;
}

.work-type-typeahead__input:focus {
  outline: 0;
}

.work-type-typeahead--upload .work-type-typeahead__input {
  min-height: 2.78rem;
  padding: 0.7rem 0.84rem;
  border-color: rgba(0, 0, 0, 0.08);
  border-radius: 0.78rem;
  font-size: 0.94rem;
  line-height: 1.3;
}

.work-type-typeahead--upload .work-type-typeahead__input:focus {
  border-color: rgba(30, 24, 136, 0.28);
}

.work-type-typeahead--daily-report .work-type-typeahead__input {
  height: 2.34rem;
  padding: 0 2rem 0 0.62rem;
  border-color: rgba(20, 24, 33, 0.1);
  border-radius: 0.62rem;
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1;
}

.work-type-typeahead--daily-report .work-type-typeahead__input:focus {
  border-color: rgba(100, 116, 139, 0.38);
}

.work-type-typeahead--sheet .work-type-typeahead__input {
  height: 2rem;
  padding: 0 0.44rem;
  border-color: rgba(20, 24, 33, 0.14);
  border-radius: 0.46rem;
  background: #f8fafc;
  color: #111827;
  font-size: 0.9rem;
  line-height: 1;
  text-align: center;
}

.work-type-typeahead--sheet .work-type-typeahead__input:focus {
  border-color: rgba(20, 24, 33, 0.22);
  background: #fff;
  box-shadow: 0 0 0 2px rgba(20, 24, 33, 0.06);
}

.work-type-typeahead__menu {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 70;
  display: grid;
  overflow: auto;
  background: #fff;
}

.work-type-typeahead--placement-bottom .work-type-typeahead__menu,
.work-type-typeahead__menu--placement-bottom:not(.work-type-typeahead__menu--floating) {
  top: calc(100% + 0.36rem);
}

.work-type-typeahead--placement-top .work-type-typeahead__menu,
.work-type-typeahead__menu--placement-top:not(.work-type-typeahead__menu--floating) {
  bottom: calc(100% + 0.36rem);
}

.work-type-typeahead__menu--floating {
  position: fixed;
  right: auto;
  bottom: auto;
  left: auto;
  z-index: 1000;
}

.work-type-typeahead--upload .work-type-typeahead__menu,
.work-type-typeahead__menu--upload {
  max-height: 14rem;
  padding: 0.32rem;
  border: 1px solid var(--outline-soft, rgba(20, 24, 33, 0.1));
  border-radius: 0.78rem;
  box-shadow: 0 10px 24px rgba(20, 24, 33, 0.12);
}

.work-type-typeahead--daily-report .work-type-typeahead__menu,
.work-type-typeahead--sheet .work-type-typeahead__menu,
.work-type-typeahead__menu--daily-report,
.work-type-typeahead__menu--sheet {
  gap: 0.12rem;
  max-height: 12rem;
  padding: 0.28rem;
  border: 1px solid rgba(20, 24, 33, 0.1);
  border-radius: 0.68rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.work-type-typeahead--sheet .work-type-typeahead__menu,
.work-type-typeahead__menu--sheet {
  min-width: 10.5rem;
  max-height: 10rem;
}

.work-type-typeahead__option,
.work-type-typeahead__state {
  width: 100%;
  min-width: 0;
  margin: 0;
  color: #475569;
  text-align: left;
}

.work-type-typeahead__option {
  border: 0;
  background: transparent;
  font-family: inherit;
}

.work-type-typeahead__state {
  display: flex;
  align-items: center;
}

.work-type-typeahead--upload .work-type-typeahead__option,
.work-type-typeahead--upload .work-type-typeahead__state,
.work-type-typeahead__menu--upload .work-type-typeahead__option,
.work-type-typeahead__menu--upload .work-type-typeahead__state {
  border-radius: 0.58rem;
  color: var(--ink, #111827);
  font-size: 0.9rem;
  line-height: 1.35;
}

.work-type-typeahead--upload .work-type-typeahead__option,
.work-type-typeahead__menu--upload .work-type-typeahead__option {
  display: block;
  min-height: 2.35rem;
  padding: 0.58rem 0.64rem;
}

.work-type-typeahead--upload .work-type-typeahead__state,
.work-type-typeahead__menu--upload .work-type-typeahead__state {
  padding: 0.68rem 0.72rem;
  color: var(--ink-faint, #64748b);
}

.work-type-typeahead--daily-report .work-type-typeahead__option,
.work-type-typeahead--daily-report .work-type-typeahead__state,
.work-type-typeahead--sheet .work-type-typeahead__option,
.work-type-typeahead--sheet .work-type-typeahead__state,
.work-type-typeahead__menu--daily-report .work-type-typeahead__option,
.work-type-typeahead__menu--daily-report .work-type-typeahead__state,
.work-type-typeahead__menu--sheet .work-type-typeahead__option,
.work-type-typeahead__menu--sheet .work-type-typeahead__state {
  min-height: 2rem;
  padding: 0 0.62rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  line-height: 1;
}

.work-type-typeahead--daily-report .work-type-typeahead__option,
.work-type-typeahead--sheet .work-type-typeahead__option,
.work-type-typeahead__menu--daily-report .work-type-typeahead__option,
.work-type-typeahead__menu--sheet .work-type-typeahead__option {
  font-weight: 650;
}

.work-type-typeahead--daily-report .work-type-typeahead__state,
.work-type-typeahead--sheet .work-type-typeahead__state,
.work-type-typeahead__menu--daily-report .work-type-typeahead__state,
.work-type-typeahead__menu--sheet .work-type-typeahead__state {
  font-weight: 560;
}

.work-type-typeahead__option:hover,
.work-type-typeahead__option:focus-visible {
  background: #f1f5f9;
  color: #111827;
}

.work-type-typeahead__option--highlighted,
.work-type-typeahead__option--highlighted:hover,
.work-type-typeahead__option--highlighted:focus-visible {
  background: rgba(30, 24, 136, 0.1);
  color: var(--primary, #1e1888);
  outline: 2px solid var(--primary, #1e1888);
  outline-offset: -2px;
}

.work-type-typeahead__option:focus-visible {
  outline: 2px solid rgba(100, 116, 139, 0.24);
  outline-offset: -1px;
}

.work-type-typeahead-menu-enter-active,
.work-type-typeahead-menu-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.work-type-typeahead-menu-enter-from,
.work-type-typeahead-menu-leave-to {
  opacity: 0;
  transform: translateY(-0.24rem);
}

.work-type-typeahead--placement-top
  .work-type-typeahead-menu-enter-from,
.work-type-typeahead--placement-top
  .work-type-typeahead-menu-leave-to,
.work-type-typeahead__menu--placement-top.work-type-typeahead-menu-enter-from,
.work-type-typeahead__menu--placement-top.work-type-typeahead-menu-leave-to {
  transform: translateY(0.24rem);
}
</style>
