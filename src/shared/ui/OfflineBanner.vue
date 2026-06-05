<template>
  <div class="offline-banner" role="status" aria-live="polite">
    <span class="offline-banner__icon" aria-hidden="true">⚠</span>
    <span class="offline-banner__text">
      오프라인 — 연결이 복구되면 자동으로 다시 사용할 수 있습니다. 조회·저장·업로드는 제한됩니다.
    </span>
  </div>
</template>

<script setup lang="ts">
// 비차단 배너: 앱 셸은 캐시에서 계속 동작하므로 화면을 가리지 않고 상단에만 알린다.
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--surface-inverse);
  color: #fff;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  box-shadow: var(--shadow-soft);
  /* 배너 자체는 정보 표시용 — 아래 앱 클릭을 막지 않는다. */
  pointer-events: none;
}

.offline-banner__icon {
  flex: none;
  font-size: 14px;
}

.offline-banner__text {
  max-width: 640px;
}
</style>
