<script setup lang="ts">
import { onMounted, ref } from "vue";

import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminButton from "@/shared/ui/admin/Button.vue";
import ConfirmDialog from "@/shared/ui/admin/ConfirmDialog.vue";
import SortableReferenceList from "@/features/project-admin/_shared/ui/components/SortableReferenceList.vue";
import { useLocationMaster } from "@/features/project-admin/master-data/state/useLocationMaster";

const {
  zones,
  floors,
  newZone,
  newFloor,
  isCreating,
  isDeleting,
  loadAll,
  addZone,
  addFloor,
  deleteZone,
  deleteFloor,
  updateZoneName,
  updateFloorName,
  reorderZones,
  reorderFloors,
} = useLocationMaster();

onMounted(() => {
  void loadAll();
});

const showDeleteDialog = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref("");
const deleteAction = ref<((id: number) => Promise<void>) | null>(null);

function openDeleteDialog(id: number, name: string, fn: (id: number) => Promise<void>) {
  deleteTargetId.value = id;
  deleteTargetName.value = name;
  deleteAction.value = fn;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value != null && deleteAction.value) {
    await deleteAction.value(deleteTargetId.value);
  }
}

function onZoneEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addZone();
}
function onFloorEnter(e: KeyboardEvent) {
  if (!e.isComposing) void addFloor();
}
</script>

<template>
  <section class="location-area">
    <h3 class="location-area__title">위치분류</h3>
    <div class="location-area__grid">
      <div class="location-area__col">
        <p class="location-area__col-label">Zone</p>
        <div class="location-area__row">
          <AdminInput v-model="newZone" placeholder="이름 입력" @keydown="onZoneEnter" />
          <AdminButton
            size="sm"
            :disabled="isCreating.zone || !newZone.trim()"
            @click="addZone"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="zones"
          :selectable="false"
          :disabled="isDeleting.zone"
          @delete="(id, name) => openDeleteDialog(id, name, deleteZone)"
          @update-name="({ id, name }) => updateZoneName(id, name)"
          @reorder="reorderZones"
        />
      </div>

      <div class="location-area__col">
        <p class="location-area__col-label">Floor</p>
        <div class="location-area__row">
          <AdminInput v-model="newFloor" placeholder="이름 입력" @keydown="onFloorEnter" />
          <AdminButton
            size="sm"
            :disabled="isCreating.floor || !newFloor.trim()"
            @click="addFloor"
          >
            추가
          </AdminButton>
        </div>
        <SortableReferenceList
          :items="floors"
          :selectable="false"
          :disabled="isDeleting.floor"
          @delete="(id, name) => openDeleteDialog(id, name, deleteFloor)"
          @update-name="({ id, name }) => updateFloorName(id, name)"
          @reorder="reorderFloors"
        />
      </div>
    </div>

    <ConfirmDialog
      :open="showDeleteDialog"
      title="삭제 확인"
      :message="`'${deleteTargetName}' 항목을 삭제하시겠습니까?`"
      confirm-label="삭제"
      destructive
      @update:open="showDeleteDialog = $event"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.location-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.location-area__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.location-area__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.location-area__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.location-area__col-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted);
}
.location-area__row {
  display: flex;
  gap: 6px;
}
@media (max-width: 720px) {
  .location-area__grid {
    grid-template-columns: 1fr;
  }
}
</style>
