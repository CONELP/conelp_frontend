<script setup lang="ts">
import { HERO, LOGO_SRC } from "@/features/landing/data/landing.content";
</script>

<template>
  <section class="hero">
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
  font-size: clamp(0.625rem, 2.25vw, 1.05rem);
  font-weight: 700;
  color: var(--ink);
}

.hero__desc {
  margin-top: 0.85rem;
  font-size: clamp(0.95rem, 2.6vw, 1.1rem);
  color: var(--ink-muted);
}

</style>
