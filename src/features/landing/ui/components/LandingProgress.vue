<script setup lang="ts">
import { PROGRESS } from "@/features/landing/data/landing.content";
</script>

<template>
  <section class="progress">
    <div class="progress__inner">
      <h2 class="progress__title">{{ PROGRESS.title }}</h2>

      <div class="progress__grid">
        <div class="progress__shot">
          <img :src="PROGRESS.image.src" :alt="PROGRESS.image.alt" loading="lazy" />
        </div>
        <ul class="progress__list">
          <li v-for="line in PROGRESS.lines" :key="line">{{ line }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.progress__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 5.5rem) 1.25rem;
}

.progress__title {
  font-size: clamp(1.6rem, 5vw, 2.6rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.25;
  text-align: center;
}

.progress__grid {
  margin-top: 2.25rem;
  display: grid;
  gap: 1.75rem;
  align-items: center;
}

.progress__shot {
  border-radius: var(--radius-panel);
  overflow: hidden;
  border: 1px solid var(--outline-soft);
  box-shadow: var(--shadow-soft);
  background: var(--surface-1);
}

.progress__shot img {
  width: 100%;
  display: block;
}

.progress__list {
  list-style: none;
  padding: 1.6rem;
  border-radius: var(--radius-panel);
  background: linear-gradient(160deg, var(--primary-soft), #fff);
  border: 1px solid var(--primary-outline);
  display: grid;
  gap: 0.6rem;
}

.progress__list li {
  position: relative;
  padding-left: 1rem;
  color: var(--ink);
  font-size: 1rem;
  line-height: 1.5;
}

.progress__list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
}

@media (min-width: 860px) {
  .progress__grid {
    grid-template-columns: 1.4fr 1fr;
  }
}
</style>
