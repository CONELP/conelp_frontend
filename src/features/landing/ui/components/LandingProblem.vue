<script setup lang="ts">
import { PROBLEM } from "@/features/landing/data/landing.content";
</script>

<template>
  <section class="problem">
    <div class="problem__inner">
      <h2 class="problem__title">{{ PROBLEM.title }}</h2>
      <div class="problem__body">
        <p v-for="(line, i) in PROBLEM.body" :key="i">{{ line }}</p>
      </div>

      <div class="problem__grid">
        <ul class="problem__pains">
          <li v-for="pain in PROBLEM.painPoints" :key="pain.title" class="problem__pain">
            <span class="problem__pain-title">{{ pain.title }}</span>
            <span class="problem__pain-desc">{{ pain.description }}</span>
          </li>
        </ul>

        <div class="problem__arrow" aria-hidden="true">→</div>

        <div class="problem__solution">
          <h3 class="problem__solution-title">{{ PROBLEM.solution.title }}</h3>
          <ul class="problem__solution-list">
            <li v-for="line in PROBLEM.solution.lines" :key="line">{{ line }}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.problem__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 5.5rem) 1.25rem;
}

.problem__title {
  font-size: clamp(1.4rem, 4.5vw, 2.2rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.3;
}

.problem__body {
  margin-top: 1.25rem;
  display: grid;
  gap: 0.5rem;
  color: var(--ink-muted);
  font-size: clamp(0.95rem, 2.4vw, 1.05rem);
  line-height: 1.6;
}

.problem__grid {
  margin-top: 2.5rem;
  display: grid;
  gap: 1.25rem;
  align-items: center;
}

.problem__pains {
  display: grid;
  gap: 0.85rem;
}

.problem__pain {
  display: grid;
  gap: 0.3rem;
  padding: 1.1rem 1.25rem;
  border-radius: var(--radius-control);
  background: var(--surface-3);
  border: 1px solid var(--outline-soft);
}

.problem__pain-title {
  font-weight: 700;
  color: var(--ink);
}

.problem__pain-desc {
  font-size: 0.9rem;
  color: var(--ink-muted);
}

.problem__arrow {
  justify-self: center;
  font-size: 1.8rem;
  color: var(--primary);
  font-weight: 700;
}

.problem__solution {
  padding: 1.6rem;
  border-radius: var(--radius-panel);
  background: linear-gradient(160deg, var(--primary-soft), #fff);
  border: 1px solid var(--primary-outline);
}

.problem__solution-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary);
}

.problem__solution-list {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.5rem;
  color: var(--ink);
  font-size: 0.98rem;
}

.problem__solution-list li {
  padding-left: 1rem;
  position: relative;
}

.problem__solution-list li::before {
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
  .problem__grid {
    grid-template-columns: 1fr auto 1fr;
  }
  .problem__arrow {
    font-size: 2.4rem;
  }
}
</style>
