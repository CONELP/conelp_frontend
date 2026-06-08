<script setup lang="ts">
import { SCHEDULE } from "@/features/landing/data/landing.content";
import LandingVideo from "@/features/landing/ui/components/LandingVideo.vue";
</script>

<template>
  <section class="schedule">
    <div class="schedule__inner">
      <p class="schedule__eyebrow">{{ SCHEDULE.eyebrow }}</p>
      <h2 class="schedule__title">{{ SCHEDULE.title }}</h2>
      <p v-for="(line, i) in SCHEDULE.body" :key="i" class="schedule__body">{{ line }}</p>

      <div class="schedule__videos">
        <figure v-for="(item, i) in SCHEDULE.videos" :key="i" class="schedule__figure">
          <LandingVideo :video="item.video" />
          <figcaption class="schedule__caption">{{ item.caption }}</figcaption>
        </figure>
      </div>

      <ul class="schedule__pains">
        <li v-for="pain in SCHEDULE.painPoints" :key="pain.title" class="schedule__pain">
          <span class="schedule__pain-title">{{ pain.title }}</span>
          <span class="schedule__pain-desc">{{ pain.description }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.schedule__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 5.5rem) 1.25rem;
}

.schedule__eyebrow {
  display: inline-block;
  padding: 0.3rem 0.85rem;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
  font-size: 0.85rem;
}

.schedule__title {
  margin-top: 1rem;
  font-size: clamp(1.6rem, 5vw, 2.6rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.25;
}

.schedule__body {
  margin-top: 0.85rem;
  color: var(--ink-muted);
  font-size: clamp(0.95rem, 2.4vw, 1.05rem);
  line-height: 1.6;
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

.schedule__pains {
  margin-top: 2.25rem;
  display: grid;
  gap: 0.85rem;
}

.schedule__pain {
  display: grid;
  gap: 0.3rem;
  padding: 1.1rem 1.25rem;
  border-radius: var(--radius-control);
  background: linear-gradient(160deg, var(--primary-soft), #fff);
  border: 1px solid var(--primary-outline);
}

.schedule__pain-title {
  font-weight: 700;
  color: var(--ink);
}

.schedule__pain-desc {
  font-size: 0.9rem;
  color: var(--ink-muted);
}

@media (min-width: 760px) {
  .schedule__pains {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
