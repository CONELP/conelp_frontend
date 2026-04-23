<template>
  <div class="loading-frame">
    <DesktopAppHeader class="loading-page__desktop-header" />

    <main class="loading-page">
      <section class="loading-shell loading-topbar">
        <RouterLink
          class="loading-back"
          :to="loadingBackRoute"
          aria-label="업로드 피드백으로 돌아가기"
        >
          <img
            class="loading-back__icon"
            :src="backIcon"
            alt=""
            aria-hidden="true"
          />
        </RouterLink>
      </section>

      <section class="loading-shell loading-intro">
        <h1 class="loading-intro__title">
          <template v-if="selectedDocument.type === 'material_registration'">
            <span class="loading-intro__title-line">자재를 등록중입니다.</span>
          </template>
          <template v-else>
            <span class="loading-intro__title-line">{{
              selectedDocument.label
            }}</span>
            <span class="loading-intro__title-line">문서를 생성중입니다.</span>
          </template>
        </h1>
      </section>

      <section class="loading-stage">
        <div class="loading-shell loading-stage__inner">
          <div class="loading-visual" aria-hidden="true">
            <span class="loading-visual__glow loading-visual__glow--outer" />
            <span
              class="loading-visual__glow loading-visual__glow--outer loading-visual__glow--phase-b"
            />
            <span class="loading-visual__glow loading-visual__glow--middle" />
            <span
              class="loading-visual__glow loading-visual__glow--middle loading-visual__glow--phase-b"
            />
            <span class="loading-visual__glow loading-visual__glow--inner" />
            <span
              class="loading-visual__glow loading-visual__glow--inner loading-visual__glow--phase-b"
            />
            <span class="loading-visual__wave loading-visual__wave--one" />
            <span class="loading-visual__wave loading-visual__wave--two" />
          </div>

          <p class="loading-description">
            {{ loadingDescription }}
          </p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import backIcon from "@fluentui/svg-icons/icons/chevron_left_24_regular.svg";

import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
import { useConversionLoadingDemoViewModel } from "@/features/document-conversion-demo/state/useConversionLoadingDemoViewModel";

const { selectedDocument, loadingBackRoute, loadingDescription } =
  useConversionLoadingDemoViewModel();
</script>
<style scoped src="./styles/ConversionLoadingPage.css"></style>
