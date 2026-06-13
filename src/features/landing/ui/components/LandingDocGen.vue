<script setup lang="ts">
import { DOC_GEN } from "@/features/landing/data/landing.content";
</script>

<template>
  <section class="docgen">
    <div class="docgen__glow" aria-hidden="true" />
    <div class="docgen__inner">
      <div class="docgen__text">
        <h2 class="docgen__title">{{ DOC_GEN.title }}</h2>
      </div>

      <ol class="docgen__steps">
        <template v-for="(step, i) in DOC_GEN.steps" :key="i">
          <li class="docgen__step">
            <img class="docgen__step-img" :src="step.image.src" :alt="step.image.alt" loading="lazy" />
            <p class="docgen__step-caption">
              <span class="docgen__step-num">{{ i + 1 }}</span>{{ step.caption }}
            </p>
          </li>
          <li v-if="i < DOC_GEN.steps.length - 1" class="docgen__arrow" aria-hidden="true">→</li>
        </template>
      </ol>
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

.docgen__title {
  margin-top: 1rem;
  font-size: clamp(1.7rem, 5.5vw, 3rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.25;
  text-align: center;
}

.docgen__steps {
  list-style: none;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.docgen__step {
  width: 100%;
  max-width: 240px;
  flex: none;
}

.docgen__arrow {
  flex: none;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--primary);
  line-height: 1;
  transform: rotate(90deg);
}

.docgen__step-img {
  width: 100%;
  height: auto;
  display: block;
  background: transparent;
}

.docgen__step-caption {
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.4;
}

.docgen__step-num {
  flex: none;
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
}

@media (min-width: 720px) {
  .docgen__steps {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: clamp(1rem, 3vw, 2.5rem);
  }
  .docgen__step {
    width: 240px;
    max-width: none;
    align-self: flex-start;
  }
  .docgen__arrow {
    transform: none;
    margin-top: 5.5rem;
  }
}
</style>
