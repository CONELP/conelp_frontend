# 개발 방향 문서

이 문서는 이 프로젝트에서 새 feature를 만들 때 참고하는 구조 규칙 문서입니다.

## 기본 결정

- 프론트엔드는 `TypeScript + Vue`로 구현한다.
- 화면은 현재 `데스크톱 + 모바일(phone)` 기준으로 설계한다.
- 구조는 `Feature-based Clean Architecture`를 따른다.
- Vue는 우선 `Composition API + <script setup lang="ts">` 기준으로 작성한다.
- 상태 관리는 우선 `Pinia`로 시작한다.
- 초기에는 use case를 잘게 쪼개지 않고 feature별 `something.service.ts` 한 파일에 모은다.
- 라우트보다 `기능 단위(feature)` 응집을 우선한다.

## 기본 구조

```text
src/
  app/
    providers/
    router/
    styles/
    App.vue
    main.ts
  features/
    execution-home/
      ui/
        ExecutionHomePage.vue
        components/
          StatusRail.vue
          PriorityActionsPanel.vue
      state/
        useExecutionHomeStore.ts
        useExecutionHomeViewModel.ts
      model/
        execution-home.types.ts
      services/
        execution-home.service.ts
      data/
        execution-home.seed.ts
      index.ts
  shared/
    ui/
    lib/
    types/
    constants/
```

## Feature 규칙

하나의 feature는 하나의 사용자 문제를 해결하는 단위로 만든다.

- page 엔트리는 `features/<feature>/ui/` 바로 아래에 둔다.
- `ui/`의 하위 디렉토리는 `components/`만 둔다.
- `src/pages` 같은 상위 공용 page 폴더는 두지 않는다.
- 앱 라우터는 feature 내부 `ui/*Page.vue`를 직접 import해서 연결한다.
- 복잡도가 커질 때만 `api`, `repository`, `adapters`를 추가한다.

## 폴더별 책임

### `app/`

- 앱 초기화
- 라우터 연결
- Pinia 같은 전역 플러그인 등록
- 글로벌 스타일과 디자인 토큰 연결

### `features/<feature>/ui/`

- feature의 엔트리 page 파일을 둔다.
- page는 큰 화면 레이아웃과 섹션 조합을 담당한다.
- page 안에는 복잡한 판단 로직을 두지 않는다.
- 작은 UI 조각은 `ui/components/`로 분리한다.
- 기본적으로 Vue SFC를 사용하고 `script setup` 구문을 따른다.

### `features/<feature>/state/`

- feature 범위의 공유 상태를 둔다.
- `Pinia store`와 viewModel composable을 함께 둔다.
- store는 상태 원본과 액션을 가진다.
- viewModel composable은 store 값과 service 결과를 묶어 page에 전달한다.
- 단순 표시용 계산은 `computed`, 부수효과 연결은 `watch`로 분리한다.

### `features/<feature>/model/`

- feature 전용 타입을 둔다.
- 입력 타입과 화면 출력 타입을 분리한다.
- raw data 타입과 page 출력 타입을 섞지 않는다.

### `features/<feature>/services/`

- feature의 핵심 판단 로직을 둔다.
- 초기에는 feature당 service 파일 하나만 둔다.
- service는 가능한 한 순수 함수 중심으로 유지한다.
- 외부 API 호출, 시드 데이터 변환, page 데이터 생성도 초기에는 한 파일 안에 둘 수 있다.

### `features/<feature>/data/`

- 시드 데이터
- mock 데이터
- 정적 JSON/TS 객체

### `features/<feature>/index.ts`

- feature 바깥으로 공개할 항목만 재노출한다.

### `shared/`

- 여러 feature가 공통으로 쓰는 UI
- 범용 유틸
- 공통 타입
- 디자인 토큰 상수

## 권장 데이터 흐름

기본 흐름은 아래와 같다.

```text
Pinia Store -> useViewModel -> Page -> Components
                           \-> service
```

역할은 다음처럼 나눈다.

- `Pinia Store`: 변경 가능한 상태의 원본과 액션
- `service`: 순수 계산과 판단
- `useViewModel`: `store + service` 조합
- `Page`: viewModel이 준 값으로 화면 조립
- `components`: props와 emit으로 상호작용하며 표시

## 새 feature 시작 템플릿

새 feature를 만들 때는 아래 구조에서 시작한다.

```text
feature-name/
  ui/
    FeaturePage.vue
    components/
      FeatureSection.vue
  state/
    useFeatureStore.ts
    useFeatureViewModel.ts
  model/
    feature-name.types.ts
  services/
    feature-name.service.ts
  data/
    feature-name.seed.ts
  index.ts
```

## 이름 규칙

- feature 폴더명은 `kebab-case`를 사용한다.
  - 예: `execution-home`
- service, types, seed 파일은 `kebab-case`를 사용한다.
  - 예: `execution-home.service.ts`
- Vue 컴포넌트 파일은 `PascalCase`를 사용한다.
  - 예: `ExecutionHomePage.vue`
- store/composable 파일은 exported 이름을 그대로 따른다.
  - 예: `useExecutionHomeStore.ts`

## 레이아웃과 디자인 규칙

- 현재 MVP에서는 모든 feature를 `데스크톱 + 모바일` 범위에서 읽히는 것으로 맞춘다.
- 작은 화면 대응은 `compact desktop` 브레이크포인트 1개로만 처리한다.
- 이 브레이크포인트에서는 정보 밀도와 컬럼 수만 줄이고, 별도 모바일 UI 패턴은 추가하지 않는다.
- `docs/guidelines/design.md`의 톤과 구조를 따른다.
- 뉴트럴 베이스, 프라이머리 블루, AI 영역의 glow/gradation 규칙을 우선한다.

## 나중에 분리할 것

아래 항목은 복잡도가 올라갈 때만 분리한다.

- repository
- api client
- adapter / mapper
- use case 파일 세분화
- global state store

지금은 속도와 명확성을 우선한다.
