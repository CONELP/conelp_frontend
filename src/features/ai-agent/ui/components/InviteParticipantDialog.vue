<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="invite-dialog__backdrop"
      @click.self="handleClose"
    >
      <div
        class="invite-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="copy.title"
      >
        <header class="invite-dialog__header">
          <h2 class="invite-dialog__title">{{ copy.title }}</h2>
          <p class="invite-dialog__description">{{ copy.description }}</p>
        </header>

        <div class="invite-dialog__body">
          <input
            ref="searchRef"
            v-model="query"
            class="invite-dialog__search"
            type="text"
            :placeholder="copy.searchPlaceholder"
            :disabled="loading"
          />

          <div v-if="loading" class="invite-dialog__state">
            {{ copy.loading }}
          </div>
          <div
            v-else-if="filtered.length === 0"
            class="invite-dialog__state"
          >
            {{ copy.empty }}
          </div>
          <ul v-else class="invite-dialog__list">
            <li
              v-for="member in filtered"
              :key="member.userId"
              class="invite-dialog__item"
            >
              <div class="invite-dialog__avatar" aria-hidden="true">
                <img
                  v-if="member.profileImageUrl"
                  :src="member.profileImageUrl"
                  :alt="member.userName ?? ''"
                />
                <span v-else>{{ initialOf(member) }}</span>
              </div>
              <div class="invite-dialog__info">
                <div class="invite-dialog__name">
                  {{ member.userName ?? member.userEmail ?? "이름 미상" }}
                </div>
                <div class="invite-dialog__meta">
                  <span v-if="member.jobTitle">{{ member.jobTitle }}</span>
                  <span v-if="member.companyName">
                    {{ member.companyName }}
                  </span>
                  <span
                    v-if="member.userEmail"
                    class="invite-dialog__email"
                  >
                    {{ member.userEmail }}
                  </span>
                </div>
              </div>
              <button
                class="invite-dialog__invite"
                type="button"
                :disabled="invitingId !== null"
                @click="handleInvite(member.userId)"
              >
                {{
                  invitingId === member.userId ? copy.inviting : copy.invite
                }}
              </button>
            </li>
          </ul>
        </div>

        <div class="invite-dialog__actions">
          <button
            class="invite-dialog__close"
            type="button"
            :disabled="invitingId !== null"
            @click="handleClose"
          >
            {{ copy.close }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import { aiAgentCopy } from "@/features/ai-agent/data/ai-agent.copy";
import type { ProjectMember } from "@/features/ai-agent/model/ai-agent.types";

const props = defineProps<{
  open: boolean;
  members: ProjectMember[];
  loading: boolean;
  invitingId: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  invite: [userId: string];
}>();

const copy = aiAgentCopy.inviteDialog;
const query = ref("");
const searchRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      query.value = "";
      await nextTick();
      searchRef.value?.focus();
    }
  },
);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.members;
  return props.members.filter((m) => {
    const haystack = [
      m.userName,
      m.userEmail,
      m.companyName,
      m.jobTitle,
    ]
      .filter((v): v is string => !!v)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
});

function initialOf(member: ProjectMember): string {
  const source = member.userName ?? member.userEmail ?? "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

function handleClose() {
  if (props.invitingId !== null) return;
  emit("update:open", false);
}

function handleInvite(userId: string) {
  if (props.invitingId !== null) return;
  emit("invite", userId);
}
</script>

<style scoped src="../styles/InviteParticipantDialog.css"></style>
