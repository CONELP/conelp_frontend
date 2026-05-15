<script setup lang="ts">
import AdminButton from "@/shared/ui/admin/Button.vue";
import AdminInput from "@/shared/ui/admin/Input.vue";
import AdminLabel from "@/shared/ui/admin/Label.vue";
import { useHomepageSetting } from "@/features/project-admin/homepage-setting/state/useHomepageSetting";

const { id, password, url, safetyCheck, tomorrowWorkMode, save } = useHomepageSetting();
</script>

<template>
  <div class="hp-area">
    <div class="hp-area__field">
      <AdminLabel>아이디</AdminLabel>
      <AdminInput v-model="id" placeholder="홈페이지 로그인 ID" />
    </div>
    <div class="hp-area__field">
      <AdminLabel>비밀번호</AdminLabel>
      <AdminInput
        v-model="password"
        type="password"
        placeholder="홈페이지 로그인 비밀번호"
      />
    </div>
    <div class="hp-area__field">
      <AdminLabel>URL</AdminLabel>
      <AdminInput v-model="url" placeholder="예: https://example.com" />
    </div>
    <div class="hp-area__field">
      <AdminLabel>안전점검</AdminLabel>
      <textarea
        v-model="safetyCheck"
        placeholder="안전점검 내용"
        rows="5"
        class="hp-area__textarea"
      />
    </div>
    <div class="hp-area__field">
      <AdminLabel>내일 작업 기준</AdminLabel>
      <div class="hp-area__radios">
        <label class="hp-area__radio">
          <input type="radio" :value="1" v-model="tomorrowWorkMode" />
          다음 작업일
        </label>
        <label class="hp-area__radio">
          <input type="radio" :value="2" v-model="tomorrowWorkMode" />
          내일
        </label>
      </div>
    </div>
    <div>
      <AdminButton @click="save">저장</AdminButton>
    </div>
  </div>
</template>

<style scoped>
.hp-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}
.hp-area__field {
  display: flex;
  flex-direction: column;
}
.hp-area__textarea {
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  background: var(--surface-1);
  border: 1px solid var(--outline-soft);
  border-radius: 8px;
  outline: none;
  resize: vertical;
}
.hp-area__textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-outline);
}
.hp-area__radios {
  display: flex;
  gap: 16px;
  padding-top: 4px;
}
.hp-area__radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}
</style>
