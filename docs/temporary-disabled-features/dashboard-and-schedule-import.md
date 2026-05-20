# 임시 비활성화 기능 복구 가이드

작성일: 2026-05-20

## 대상

- 상단 주요 메뉴의 `대시보드` 탭
- 상단 CONELP 로고의 대시보드 진입 링크
- 공정표 화면에서 작업본을 선택했을 때 표시되던 `공정표 불러오기` 버튼

두 기능 모두 코드를 삭제하지 않고 주석 처리했다. UI에서는 보이지 않지만, 복구할 때는 아래 위치의 주석만 제거하면 된다.

## 1. 상단 `대시보드` 탭

파일:

- `src/app/ui/DesktopAppHeader.vue`

위치:

- `navItems` 배열 안의 `id: "dashboard"` 항목

현재 상태:

- `대시보드` 탭 항목 전체가 블록 주석 처리되어 상단 주요 메뉴에 렌더링되지 않는다.
- `/dashboard` 라우트와 대시보드 화면 파일은 그대로 남아 있다.
- 상단 CONELP 로고 링크는 `/dashboard` 대신 `/schedule`을 가리킨다.

복구 방법:

1. `DesktopAppHeader.vue`에서 `navItems` 배열을 찾는다.
2. `id: "dashboard"` 항목을 감싼 `/* ... */` 주석을 제거한다.
3. 같은 파일 상단의 CONELP 로고 `RouterLink`를 필요에 따라 `to="/dashboard"`와 `aria-label="대시보드로 이동"`으로 되돌린다.
4. 상단 메뉴에 `대시보드` 탭이 다시 표시되는지 확인한다.

## 2. 작업본 `공정표 불러오기` 버튼

파일:

- `src/features/desktop-schedule/ui/components/DesktopScheduleShell.vue`

위치:

- `schedule-shell__schedule-actions` 영역 안의 `공정표 불러오기` 버튼

현재 상태:

- 아래 조건과 액션을 가진 버튼 블록이 HTML 주석 처리되어 렌더링되지 않는다.
- 기존 조건은 `v-if="!isMainScheduleVersionSelected"`이다. 즉 기준 공정표가 아닌 작업본 선택 상태에서만 보이던 버튼이었다.
- 기존 클릭 액션은 `@click="emitImportSchedule"`이고, 내부적으로 `open-import-dialog` 이벤트를 발생시킨다.
- 불러오기 다이얼로그와 import 관련 상태/이벤트는 삭제하지 않았다.

복구 방법:

1. `DesktopScheduleShell.vue`에서 `공정표 불러오기` 텍스트를 검색한다.
2. 버튼 블록을 감싼 `<!-- ... -->` 주석을 제거한다.
3. 작업본을 선택했을 때 버튼이 보이고, 클릭 시 `공정표 불러오기` 다이얼로그가 열리는지 확인한다.

## 복구 후 확인

- 상단 주요 메뉴에 `대시보드` 탭이 표시된다.
- `대시보드` 탭 클릭 시 `/dashboard`로 이동한다.
- 필요 시 CONELP 로고 클릭 시 `/dashboard`로 이동한다.
- 공정표에서 작업본을 선택하면 `공정표 불러오기` 버튼이 표시된다.
- 기준 공정표 선택 상태에서는 기존 조건대로 `공정표 불러오기` 버튼이 표시되지 않는다.
