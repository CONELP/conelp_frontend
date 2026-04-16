<template>
  <main class="loading-page">
    <section class="loading-shell loading-topbar">
      <RouterLink
        class="loading-back"
        to="/preview/upload-feedback"
        aria-label="업로드 피드백으로 돌아가기"
      >
        <img class="loading-back__icon" :src="backIcon" alt="" aria-hidden="true" />
      </RouterLink>
    </section>

    <section class="loading-shell loading-intro">
      <h1 class="loading-intro__title">
        <span class="loading-intro__title-line">콘크리트 반입시험</span>
        <span class="loading-intro__title-line">문서를 생성중입니다.</span>
      </h1>
    </section>

    <section class="loading-shell loading-stage">
      <div class="loading-visual" aria-hidden="true">
        <span class="loading-visual__glow loading-visual__glow--outer" />
        <span class="loading-visual__glow loading-visual__glow--middle" />
        <span class="loading-visual__glow loading-visual__glow--inner" />
        <span class="loading-visual__wave loading-visual__wave--one" />
        <span class="loading-visual__wave loading-visual__wave--two" />
      </div>

      <p class="loading-description">
        이미지에서 텍스트를 읽고 있어요.
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";
</script>

<style scoped>
.loading-page {
  --page-inline: 1.2rem;
  --surface-radius: 0.95rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
  padding: 0 var(--page-inline) 1rem;
  background: var(--surface-1);
}

.loading-shell {
  width: min(100%, 42rem);
  margin: 0 auto;
}

.loading-topbar {
  display: flex;
  align-items: flex-end;
  min-height: 4.15rem;
  margin-left: calc(var(--page-inline) * -0.84);
  padding-bottom: 0.35rem;
}

.loading-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--ink);
}

.loading-back__icon {
  width: 1.5rem;
  height: 1.5rem;
  opacity: 0.84;
}

.loading-intro {
  padding: 3rem 0 1.8rem;
}

.loading-intro__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.52rem, 5vw, 2.05rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.loading-intro__title-line {
  display: block;
}

.loading-intro__title-line + .loading-intro__title-line {
  margin-top: 0.92rem;
}

.loading-stage {
  display: grid;
  justify-items: center;
  gap: 2rem;
  padding-top: 0.2rem;
}

.loading-visual {
  position: relative;
  width: 15.5rem;
  height: 15.5rem;
  border-radius: 999px;
}

.loading-visual__glow {
  position: absolute;
  border-radius: 999px;
  transform-origin: center;
}

.loading-visual__glow--outer {
  inset: 0;
  background: radial-gradient(circle, rgba(75, 68, 212, 0.3) 0, rgba(75, 68, 212, 0.12) 34%, rgba(75, 68, 212, 0) 74%);
  filter: blur(16px);
  animation: halo-pulse 3.4s ease-in-out infinite;
}

.loading-visual__glow--middle {
  inset: 2rem;
  background: radial-gradient(circle, rgba(75, 68, 212, 0.34) 0, rgba(75, 68, 212, 0.16) 40%, rgba(75, 68, 212, 0) 78%);
  filter: blur(10px);
  animation: halo-pulse 2.8s ease-in-out infinite reverse;
}

.loading-visual__glow--inner {
  inset: 4.2rem;
  background: radial-gradient(circle, rgba(255, 255, 255, 1) 0, rgba(226, 224, 255, 0.82) 28%, rgba(75, 68, 212, 0.24) 54%, rgba(75, 68, 212, 0) 78%);
  filter: blur(7px);
  animation: core-breathe 2.4s ease-in-out infinite;
}

.loading-visual__wave {
  position: absolute;
  inset: 2.7rem;
  border-radius: 999px;
  border: 1px solid rgba(75, 68, 212, 0.22);
  opacity: 0;
}

.loading-visual__wave--one {
  animation: wave-expand 2.8s ease-out infinite;
}

.loading-visual__wave--two {
  animation: wave-expand 2.8s ease-out 1.4s infinite;
}

.loading-description {
  margin: 0;
  color: var(--ink-faint);
  font-size: 0.88rem;
  font-weight: 400;
  line-height: 1.6;
  text-align: center;
}

@keyframes halo-pulse {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.84;
  }

  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes core-breathe {
  from {
    transform: scale(0.92);
    opacity: 0.86;
  }

  to {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes wave-expand {
  0% {
    transform: scale(0.76);
    opacity: 0;
  }

  25% {
    opacity: 0.7;
  }

  100% {
    transform: scale(1.36);
    opacity: 0;
  }
}

@media (min-width: 768px) {
  .loading-page {
    --page-inline: 1.6rem;
    padding: 0 var(--page-inline) 1.4rem;
  }

  .loading-shell {
    width: min(100%, 52rem);
  }

  .loading-topbar {
    min-height: 4.45rem;
    margin-left: calc(var(--page-inline) * -1);
    padding-bottom: 0.42rem;
  }

  .loading-back {
    width: 2.15rem;
    height: 2.15rem;
  }

  .loading-back__icon {
    width: 1.6rem;
    height: 1.6rem;
  }

  .loading-intro {
    padding-top: 3.6rem;
    padding-bottom: 2rem;
  }

  .loading-intro__title-line + .loading-intro__title-line {
    margin-top: 1.08rem;
  }

  .loading-stage {
    gap: 2.35rem;
    padding-top: 0.35rem;
  }

  .loading-visual {
    width: 17rem;
    height: 17rem;
  }

  .loading-description {
    font-size: 0.92rem;
  }
}
</style>
