<script setup lang="ts">
import { DOC_GEN } from "@/features/landing/data/landing.content";
import LandingVideo from "@/features/landing/ui/components/LandingVideo.vue";
</script>

<template>
  <section class="docgen">
    <div class="docgen__glow" aria-hidden="true" />
    <div class="docgen__inner">
      <div class="docgen__text">
        <p class="docgen__eyebrow">{{ DOC_GEN.eyebrow }}</p>
        <h2 class="docgen__title">{{ DOC_GEN.title }}</h2>
        <div class="docgen__body">
          <p v-for="(line, i) in DOC_GEN.body" :key="i">{{ line }}</p>
        </div>
      </div>

      <div class="docgen__video">
        <LandingVideo :video="DOC_GEN.video" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.docgen {
  position: relative;
  overflow: hidden;
}

.docgen__glow {
  position: absolute;
  top: 10%;
  right: -10%;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, var(--primary-glow), transparent 70%);
  opacity: 0.35;
  pointer-events: none;
}

.docgen__inner {
  position: relative;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(3.5rem, 9vw, 6rem) 1.25rem;
  display: grid;
  gap: 2.5rem;
  align-items: center;
}

.docgen__eyebrow {
  display: inline-block;
  padding: 0.3rem 0.85rem;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
  font-size: 0.85rem;
}

.docgen__title {
  margin-top: 1rem;
  font-size: clamp(1.7rem, 5.5vw, 3rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.25;
}

.docgen__body {
  margin-top: 1.1rem;
  display: grid;
  gap: 0.45rem;
  color: var(--ink-muted);
  font-size: clamp(0.98rem, 2.5vw, 1.12rem);
  line-height: 1.6;
}

.docgen__video {
  max-width: 380px;
  margin-inline: auto;
  width: 100%;
}

@media (min-width: 860px) {
  .docgen__inner {
    grid-template-columns: 1fr auto;
  }
  .docgen__video {
    margin-inline: 0;
  }
}
</style>
