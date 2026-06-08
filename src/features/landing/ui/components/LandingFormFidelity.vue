<script setup lang="ts">
import { FORM_FIDELITY } from "@/features/landing/data/landing.content";
</script>

<template>
  <section class="fidelity">
    <div class="fidelity__inner">
      <h2 class="fidelity__title">{{ FORM_FIDELITY.title }}</h2>

      <div class="fidelity__grid">
        <div class="fidelity__samples">
          <img
            v-for="(sample, i) in FORM_FIDELITY.samples"
            :key="i"
            class="fidelity__sample"
            :class="`fidelity__sample--${i}`"
            :src="sample.src"
            :alt="sample.alt"
            loading="lazy"
          />
        </div>

        <div class="fidelity__cards">
          <article v-for="card in FORM_FIDELITY.cards" :key="card.title" class="fidelity__card">
            <h3 class="fidelity__card-title">{{ card.title }}</h3>
            <ul class="fidelity__card-list">
              <li v-for="(line, i) in card.lines" :key="i" :class="{ 'is-lead': i === 0 }">{{ line }}</li>
            </ul>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fidelity__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 5.5rem) 1.25rem;
}

.fidelity__title {
  font-size: clamp(1.6rem, 5vw, 2.6rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.25;
}

.fidelity__grid {
  margin-top: 2.5rem;
  display: grid;
  gap: 2rem;
  align-items: center;
}

.fidelity__samples {
  position: relative;
  min-height: 240px;
  display: grid;
  place-items: center;
}

.fidelity__sample {
  width: 58%;
  border-radius: 6px;
  border: 1px solid var(--outline-soft);
  box-shadow: var(--shadow-soft);
  background: #fff;
  grid-area: 1 / 1;
}

.fidelity__sample--0 {
  transform: translate(-18%, -10%) rotate(-5deg);
  z-index: 1;
}
.fidelity__sample--1 {
  transform: translate(0, 4%) rotate(0deg);
  z-index: 3;
}
.fidelity__sample--2 {
  transform: translate(20%, 12%) rotate(5deg);
  z-index: 2;
}

.fidelity__cards {
  display: grid;
  gap: 1.25rem;
}

.fidelity__card {
  padding: 1.6rem;
  border-radius: var(--radius-panel);
  background: linear-gradient(160deg, var(--primary-soft), #fff);
  border: 1px solid var(--primary-outline);
}

.fidelity__card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ink-strong);
}

.fidelity__card-list {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.5rem;
  color: var(--ink-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.fidelity__card-list li {
  padding-left: 1rem;
  position: relative;
}

.fidelity__card-list li::before {
  content: "-";
  position: absolute;
  left: 0;
  color: var(--primary);
}

.fidelity__card-list li.is-lead {
  color: var(--ink);
  font-weight: 600;
  padding-left: 0;
}

.fidelity__card-list li.is-lead::before {
  content: "";
}

@media (min-width: 860px) {
  .fidelity__grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
