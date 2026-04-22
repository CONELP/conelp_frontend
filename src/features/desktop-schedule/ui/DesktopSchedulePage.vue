<template>
  <main class="desktop-schedule-page">
    <DesktopAppHeader />

    <div class="desktop-schedule-page__shell">
      <section class="desktop-schedule-page__surface">
        <header class="desktop-schedule-page__header">
          <p class="desktop-schedule-page__eyebrow">공정표</p>
          <h1 class="desktop-schedule-page__title">2D 공정표 이식 준비 중</h1>
          <p class="desktop-schedule-page__description">
            legacy의 <code>schedule-2d-rebuild</code>를 데스크탑 정보 구조와 시각 언어에 맞게
            옮길 자리입니다.
          </p>
        </header>

        <div class="desktop-schedule-page__grid">
          <article class="desktop-schedule-page__card">
            <h2>재사용 가능한 영역</h2>
            <p>snapshot 어댑터, 도메인 모델, 일정 계산 서비스는 대부분 그대로 가져갈 수 있습니다.</p>
          </article>

          <article class="desktop-schedule-page__card">
            <h2>다시 짜야 하는 영역</h2>
            <p>legacy helper UI와 Tailwind 유틸리티에 의존하는 화면 셸은 데스크탑 스타일에 맞게 재구성해야 합니다.</p>
          </article>

          <article class="desktop-schedule-page__card">
            <h2>첫 이식 단위</h2>
            <p>읽기 전용 timeline shell부터 먼저 옮기고, 이후 선택, 드래그, 컨텍스트 메뉴를 순서대로 붙이는 편이 안전합니다.</p>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import DesktopAppHeader from "@/app/ui/DesktopAppHeader.vue";
</script>

<style scoped src="./styles/DesktopSchedulePage.css"></style>
