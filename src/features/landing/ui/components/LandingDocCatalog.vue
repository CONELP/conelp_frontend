<script setup lang="ts">
import { DOC_CATALOG } from "@/features/landing/data/landing.content";
</script>

<template>
  <section class="catalog">
    <div class="catalog__inner">
      <h2 class="catalog__title">{{ DOC_CATALOG.title }}</h2>
      <p class="catalog__subtitle">{{ DOC_CATALOG.subtitle }}</p>

      <div class="catalog__grid">
        <div v-for="col in DOC_CATALOG.columns" :key="col.heading" class="catalog__col">
          <h3 class="catalog__col-head">{{ col.heading }}</h3>
          <ul class="catalog__list">
            <li
              v-for="item in col.items"
              :key="item.label"
              class="catalog__item"
              :class="{ 'is-highlighted': item.highlighted }"
            >
              {{ item.label }}
              <span v-if="item.highlighted" class="catalog__badge">지원</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.catalog__inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 5.5rem) 1.25rem;
}

.catalog__title {
  font-size: clamp(1.6rem, 5vw, 2.6rem);
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.25;
}

.catalog__subtitle {
  margin-top: 0.9rem;
  color: var(--ink-muted);
  font-size: clamp(0.95rem, 2.4vw, 1.05rem);
  line-height: 1.6;
}

.catalog__grid {
  margin-top: 2.25rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

.catalog__col {
  border: 1px solid var(--outline-soft);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  overflow: hidden;
}

.catalog__col-head {
  padding: 0.85rem 1rem;
  background: var(--surface-3);
  font-weight: 700;
  color: var(--ink);
  font-size: 0.98rem;
  border-bottom: 1px solid var(--outline-soft);
}

.catalog__list {
  display: grid;
}

.catalog__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  font-size: 0.92rem;
  color: var(--ink-muted);
  border-bottom: 1px solid var(--outline-soft);
}

.catalog__item:last-child {
  border-bottom: none;
}

.catalog__item.is-highlighted {
  color: var(--ink-strong);
  font-weight: 700;
  background: var(--primary-soft);
}

.catalog__badge {
  flex: none;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--primary);
  background: #fff;
  border: 1px solid var(--primary-outline);
  border-radius: var(--radius-pill);
  padding: 0.1rem 0.5rem;
}

@media (min-width: 560px) {
  .catalog__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 960px) {
  .catalog__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
