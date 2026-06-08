<script setup lang="ts">
import { HERO, LOGO_SRC } from "@/features/landing/data/landing.content";
</script>

<template>
  <section class="hero">
    <div class="hero__glow" aria-hidden="true" />
    <div class="hero__inner">
      <img class="hero__logo" :src="LOGO_SRC" :alt="HERO.title" />
      <h1 class="hero__subtitle">{{ HERO.subtitle }}</h1>
      <p class="hero__desc">{{ HERO.description }}</p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
}

.hero__glow {
  position: absolute;
  top: -30%;
  left: 50%;
  width: min(720px, 90vw);
  height: 480px;
  transform: translateX(-50%);
  background: radial-gradient(circle, var(--primary-glow), transparent 70%);
  opacity: 0.5;
  pointer-events: none;
}

.hero__inner {
  position: relative;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(4rem, 12vw, 8rem) 1.25rem clamp(3rem, 8vw, 5rem);
  text-align: center;
}

.hero__logo {
  width: clamp(300px, 50vw, 520px);
  height: auto;
  margin-inline: auto;
}

.hero__subtitle {
  margin-top: 1rem;
  font-size: clamp(1.25rem, 4.5vw, 2.1rem);
  font-weight: 700;
  color: var(--ink);
}

.hero__desc {
  margin-top: 0.85rem;
  font-size: clamp(0.95rem, 2.6vw, 1.1rem);
  color: var(--ink-muted);
}

</style>
