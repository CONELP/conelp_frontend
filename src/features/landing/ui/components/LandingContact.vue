<script setup lang="ts">
import { CONTACT, LOGO_SRC } from "@/features/landing/data/landing.content";
</script>

<template>
  <footer class="contact">
    <div class="contact__glow" aria-hidden="true" />
    <div class="contact__inner">
      <img class="contact__logo" :src="LOGO_SRC" :alt="CONTACT.brand" />
      <p class="contact__tagline">{{ CONTACT.tagline }}</p>

      <div class="contact__info">
        <p class="contact__label">CONTACT US</p>
        <a class="contact__link" :href="`mailto:${CONTACT.email}`">{{ CONTACT.email }}</a>
        <a class="contact__link" :href="`tel:+${CONTACT.phone.replace(/[^0-9]/g, '')}`">{{ CONTACT.phone }}</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.contact {
  position: relative;
  overflow: hidden;
  border-top: 1px solid var(--outline-soft);
}

.contact__glow {
  position: absolute;
  bottom: -40%;
  left: 50%;
  width: min(760px, 95vw);
  height: 520px;
  transform: translateX(-50%);
  background: radial-gradient(circle, var(--primary-glow), transparent 70%);
  opacity: 0.4;
  pointer-events: none;
}

.contact__inner {
  position: relative;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: clamp(4rem, 11vw, 7rem) 1.25rem;
  text-align: center;
}

.contact__logo {
  width: clamp(200px, 38vw, 360px);
  height: auto;
  margin-inline: auto;
}

.contact__tagline {
  margin-top: 0.5rem;
  letter-spacing: 0.35em;
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.contact__info {
  margin-top: 2.5rem;
  display: grid;
  gap: 0.4rem;
}

.contact__label {
  letter-spacing: 0.3em;
  font-size: 0.78rem;
  color: var(--ink-faint);
}

.contact__link {
  color: var(--ink);
  font-size: 1rem;
  text-decoration: none;
}

.contact__link:hover {
  color: var(--primary);
}
</style>
