<script setup lang="ts">
import type { VideoAsset } from "@/features/landing/model/landing.types";

defineProps<{ video: VideoAsset }>();
</script>

<template>
  <div class="landing-video">
    <video
      class="landing-video__el"
      :src="video.src"
      :poster="video.poster"
      :aria-label="video.label"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
    >
      <img class="landing-video__fallback" :src="video.poster" :alt="video.label" />
    </video>
  </div>
</template>

<style scoped>
.landing-video {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius-panel);
  background: var(--surface-3);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--outline-soft);
}

.landing-video__el,
.landing-video__fallback {
  width: 100%;
  height: auto;
  display: block;
}
</style>
