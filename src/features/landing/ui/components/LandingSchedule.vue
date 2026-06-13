<script setup lang="ts">
import { SCHEDULE } from "@/features/landing/data/landing.content";
import LandingVideo from "@/features/landing/ui/components/LandingVideo.vue";
</script>

<template>
  <section class="schedule">
    <div class="schedule__inner">
      <h2 class="schedule__title">{{ SCHEDULE.title }}</h2>

      <div class="schedule__videos">
        <figure v-for="(item, i) in SCHEDULE.videos" :key="i" class="schedule__figure">
          <LandingVideo :video="item.video" />
          <figcaption class="schedule__caption">{{ item.caption }}</figcaption>
        </figure>
      </div>

    </div>
  </section>
</template>

<style scoped>
.schedule__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 5.5rem) 1.25rem;
}

.schedule__title {
  margin-top: 1rem;
  font-size: clamp(1.6rem, 5vw, 2.6rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.25;
  text-align: center;
}

.schedule__videos {
  margin-top: 2.25rem;
  display: grid;
  gap: 2.5rem;
}

.schedule__caption {
  margin-top: 0.75rem;
  text-align: center;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ink);
}

</style>
