<script setup lang="ts">
import LandingContact from "@/features/landing/ui/components/LandingContact.vue";
import LandingDocCatalog from "@/features/landing/ui/components/LandingDocCatalog.vue";
import LandingDocGen from "@/features/landing/ui/components/LandingDocGen.vue";
import LandingFormFidelity from "@/features/landing/ui/components/LandingFormFidelity.vue";
import LandingHeader from "@/features/landing/ui/components/LandingHeader.vue";
import LandingHero from "@/features/landing/ui/components/LandingHero.vue";
import LandingProblem from "@/features/landing/ui/components/LandingProblem.vue";
import LandingProgress from "@/features/landing/ui/components/LandingProgress.vue";
import LandingSchedule from "@/features/landing/ui/components/LandingSchedule.vue";
</script>

<template>
  <div class="landing">
    <div class="landing__grid" aria-hidden="true" />
    <LandingHeader />
    <main class="landing__main">
      <LandingHero />
      <LandingProblem />
      <LandingDocGen />
      <LandingFormFidelity />
      <LandingDocCatalog />
      <LandingSchedule />
      <LandingProgress />
    </main>
    <LandingContact />
  </div>
</template>

<style scoped>
.landing {
  position: relative;
  min-height: 100dvh;
  background: linear-gradient(180deg, #eef1f7 0%, #f7f9fc 38%, var(--canvas) 100%);
  font-family: var(--font-body);
  overflow-x: hidden;
}

/* PDF 블루프린트 그리드 배경 (랜딩 한정) */
.landing__grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(30, 24, 136, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 24, 136, 0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at 50% 20%, #000 40%, transparent 95%);
  -webkit-mask-image: radial-gradient(circle at 50% 20%, #000 40%, transparent 95%);
}

.landing > :not(.landing__grid) {
  position: relative;
  z-index: 1;
}

.landing__main {
  display: block;
}
</style>
