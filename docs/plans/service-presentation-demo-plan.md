# 본사 시연회 서비스 데모 Plan

기능 또는 흐름 이름:
현장 선택 -> 문서 생성 -> 공정표 생성 -> git 공유 시연 결과 확인

이 문서는 본사 시연회에서 백엔드 의존 없이 Conelp 서비스의 핵심 흐름을 보여 주기 위한 실행용 plan 문서다.
목표는 사용자가 현장을 바꾸고, 현장별 자료로 서류와 공정표를 생성한 뒤, 결과와 현장 식별 기준이 git에서 공유되는 전체 경험을 빠르게 구현하고 검토하는 것이다.

`사용자는 선혜원/청운교회 중 현장을 선택하고, 해당 현장의 자료로 문서와 공정표를 생성한 뒤, git으로 공유되는 같은 현장 id와 데모 상태로 결과를 다시 확인할 수 있다.`

## 고정 전제

- 이번 브랜치는 본사 시연회용 서비스 데모 브랜치로 본다.
- 실제 backend API, 인증, 파일 업로드 서버 저장, 실제 Excel 생성 엔진은 필수 범위가 아니다.
- 입력 자료와 최종 Excel 산출물은 project root의 `data/`를 기준 source로 삼는다.
- 현재 `data/`는 git 추적 대상이 아니므로, 공유되어야 하는 현장 id와 demo state는 `data/` 안에만 두지 않는다.
- 현장은 `선혜원`, `청운교회` 두 개로 시작한다.
- 각 현장 폴더 아래에는 문서별 폴더가 있고, 그 안에 최종 Excel 파일과 생성에 필요한 원본 자료가 함께 있다고 본다.
- 브라우저에서는 실제 파일 시스템을 직접 탐색하지 않고, git tracked demo manifest와 seed data로 `data/` 구조를 참조한다.
- 공유되어야 하는 값은 `src/features/service-presentation-demo/data/` 같은 git tracked seed 파일에 둔다.
- `siteId`, 문서 manifest, 공정표 seed id, 시연용 생성 결과 state는 git tracked seed가 canonical source다.
- localStorage 또는 IndexedDB는 canonical source로 쓰지 않는다. 필요할 경우 현재 선택 현장 같은 세션 편의 상태에만 제한적으로 쓴다.
- 데모에서는 결과 파일을 실제로 새로 만드는 것보다, 현장별 최종 Excel을 생성 결과처럼 연결하고 미리보기/다운로드 CTA를 제공하는 것이 우선이다.
- 문서 생성 범위는 아래 4종으로 고정한다.
  - 홈페이지 fetch 작업일보 생성
  - 자재반입검수요청서
  - 콘크리트 받아들이기 시험
  - 콘크리트 압축강도 시험
- 공정표 생성은 `기준 공정표`와 `작업본`을 구분하고, 작업본을 만들어 수정한 뒤 기준으로 반영하는 흐름까지 보여 주는 것을 1차 목표로 한다.
- 화면과 상태 구조는 `docs/guidelines/dev_structure.md`의 feature-based 구조를 따른다.
- UI 톤은 `docs/guidelines/design.md`의 뉴트럴 베이스, 명확한 CTA, AI 처리 구역만 제한적으로 강조하는 원칙을 따른다.

## Stage 1. 시연 범위와 데모 데이터 계약 고정 [completed]

목표:
본사 시연회에서 보여 줄 현장, 문서, 공정표 흐름과 backend 없이 저장할 최소 데이터를 먼저 고정한다.

커밋 메시지:
`docs: define service presentation demo scope`

결과물:
- `docs/plans/service-presentation-demo-plan.md`
- git tracked 현장/문서/공정표 demo manifest 설계 기준

체크포인트:
- [x] 현장 목록을 `선혜원`, `청운교회`로 고정한다
- [x] 문서 생성 범위를 4종으로 고정한다
- [x] 결과는 `data/`의 최종 Excel을 생성 결과처럼 연결한다고 정의한다
- [x] 공유되어야 하는 현장 id와 데모 결과 상태는 git tracked seed에 저장한다고 정의한다
- [x] 공정표는 `기준 공정표`와 `작업본` 흐름을 시연 범위에 포함한다
- [x] 실제 Excel 셀 매핑과 변환 정확도 검증은 문서별 구현 시 하나씩 맞춘다고 정의한다

완료 기준:
구현자가 이번 시연에서 무엇을 실제 연동하지 않고, 무엇을 화면 흐름으로 반드시 보여 줘야 하는지 바로 구분할 수 있다.

## Stage 2. 현장 변경 흐름 구현 [completed]

목표:
사용자가 데모 첫 화면이나 상단 컨텍스트에서 현장을 바꾸면, 이후 문서 생성과 공정표 생성 화면이 같은 현장 기준으로 이어지게 만든다.

커밋 메시지:
`feat: add demo site switching flow`

결과물:
- 헤더 현장 dropdown 선택 UI
- selected site store
- git tracked 현장별 demo manifest
- 선택 현장 session state

체크포인트:
- [x] `선혜원`, `청운교회` 현장 dropdown 항목을 만든다
- [x] 현재 선택 현장을 전역 demo context로 저장한다
- [x] 현장 id는 git tracked manifest에서만 가져오게 한다
- [x] 새로고침 시 기본 현장은 git tracked seed의 `defaultSiteId`로 복원한다
- [x] 현장 변경 시 문서 목록과 공정표 seed가 선택 현장 기준으로 바뀌게 한다
- [x] 현장 변경 후 이전 현장의 생성 결과와 섞이지 않게 demo state를 `siteId` 기준으로 분리한다
- [x] 별도 `/sites` 화면 없이 헤더 dropdown에서 현장을 전환한다

진행 메모:
- `src/features/service-presentation-demo/data/site-manifest.seed.ts`를 git 공유 현장 manifest로 추가했다.
- `useServicePresentationDemoStore`에서 `defaultSiteId`, selected site, site-scoped documents, schedule seed id를 제공한다.
- 헤더의 현장 chip은 아래 chevron이 있는 dropdown으로 동작하며, 같은 화면 안에서 현장을 바꾼다.
- 현장을 바꾸면 선택 현장을 session state에 반영하고, `현장 정보를 불러오고 있어요.` overlay를 보여 준 뒤 전체 화면을 한 번 refresh한다.
- dropdown 항목은 현장명만 보여 주고, 선택 현장은 Conelp primary blue의 두꺼운 border로만 표시한다.
- 문서 선택 화면은 선택 현장의 manifest를 기준으로 기존 문서 카탈로그를 필터링한다.

완료 기준:
사용자가 `선혜원`과 `청운교회`를 전환하면 이후 모든 데모 화면의 문서 자료, 생성 이력, 공정표 상태가 선택한 현장 기준으로 바뀐다.

## Stage 3. 문서 생성 카탈로그와 결과 저장 흐름 구현

목표:
현장별 문서 폴더의 입력 자료와 최종 Excel을 데모 manifest로 연결하고, 사용자가 문서를 생성하면 결과가 git 공유 가능한 demo state 구조에 남게 만든다.

커밋 메시지:
`feat: add git seeded document generation demo`

결과물:
- 문서 생성 카탈로그
- 문서별 입력/결과 파일 manifest
- 생성 진행 상태 UI
- git seed 기반 생성 이력 store
- 생성 결과 화면

체크포인트:
- [ ] 문서 타입 키를 `daily_report`, `material_inspection_request`, `concrete_receiving_test`, `concrete_compressive_strength_test`로 고정한다
- [ ] 현장별 `data/` 폴더 구조를 참조하는 git tracked manifest를 만든다
- [ ] 각 문서 카드에 입력 자료 종류와 최종 Excel 파일명을 보여 준다
- [ ] `홈페이지 fetch 작업일보 생성`은 홈페이지 자료를 가져와 작업일보를 만드는 시퀀스로 표현한다
- [ ] `자재반입검수요청서`는 송장/사진/기존 자료에서 검수 요청서를 만드는 시퀀스로 표현한다
- [ ] `콘크리트 받아들이기 시험`은 레미콘 송장과 시험 자료를 정리하는 시퀀스로 표현한다
- [ ] `콘크리트 압축강도 시험`은 7일/28일 강도 자료를 결과 문서로 정리하는 시퀀스로 표현한다
- [ ] 생성 완료 상태는 `siteId` 기준 demo state model에 반영한다
- [ ] 공유가 필요한 기본 생성 이력은 git tracked seed로 관리한다
- [ ] 생성 이력에서 같은 문서를 다시 열 수 있게 한다

완료 기준:
사용자가 선택한 현장에서 4종 문서 중 하나를 실행하면, 입력 자료 확인 -> 생성 중 -> 최종 Excel 결과 확인 -> git seed 기준 이력 확인 흐름이 끊기지 않는다.

## Stage 4. 문서별 생성 화면을 하나씩 맞추기

목표:
각 문서의 실제 자료와 최종 Excel 형태를 보면서, 화면 카피와 필요한 입력 확인 단계를 하나씩 데모에 맞게 조정한다.

커밋 메시지:
`feat: tune document generation demos by document type`

결과물:
- 문서별 생성 step 정의
- 문서별 결과 요약
- 현장별 대표 예시 연결

체크포인트:
- [ ] 작업일보 생성 화면에서 홈페이지 fetch 느낌이 나는 입력 확인 상태를 만든다
- [ ] 자재반입검수요청서 화면에서 자재명, 반입일, 첨부 자료 요약을 보여 준다
- [ ] 콘크리트 받아들이기 시험 화면에서 타설 위치, 시험일, 송장 자료 요약을 보여 준다
- [ ] 콘크리트 압축강도 시험 화면에서 7일/28일 자료 구분과 결과 요약을 보여 준다
- [ ] 선혜원과 청운교회 중 자료가 부족한 조합은 `데모 준비 중` 또는 대표 예시 fallback으로 처리한다
- [ ] 각 문서별 결과 화면에서 최종 Excel 파일명이 바로 보이게 한다

완료 기준:
4종 문서가 모두 같은 골격을 쓰되, 문서별로 실제로 어떤 자료를 읽고 어떤 결과를 만드는지 시연자가 설명하기 쉬운 화면이 된다.

## Stage 5. 공정표 생성과 작업본 관리 흐름 연결

목표:
선택한 현장 기준으로 기준 공정표를 보여 주고, 사용자가 작업본을 만들어 수정/검토/기준 반영까지 진행하는 시연 흐름을 만든다.

커밋 메시지:
`feat: add git seeded schedule generation demo`

결과물:
- 현장별 공정표 seed
- 기준 공정표 생성 CTA
- 작업본 만들기 flow
- 작업본 demo state seed
- 기준 공정표로 반영 flow

체크포인트:
- [ ] 선택 현장 기준의 공정표 seed를 불러온다
- [ ] 공정표가 없을 때 `공정표 생성` CTA를 보여 준다
- [ ] 생성 완료 후 `기준 공정표 · 읽기 전용` 상태로 표시한다
- [ ] 기준 공정표에서 `작업본 만들기`를 실행하면 수정 가능한 작업본으로 이동한다
- [ ] 작업본 수정 내역은 `siteId` 기준 demo state model에 반영한다
- [ ] 공유가 필요한 기본 작업본 상태는 git tracked seed로 관리한다
- [ ] 작업본과 기준 공정표를 비교하는 요약을 보여 준다
- [ ] 작업본을 `기준 공정표로 반영`하면 새 기준 상태로 바뀌게 한다
- [ ] 기존 `docs/plans/schedule-version-workflow-plan.md`의 UI 용어를 유지한다

완료 기준:
사용자가 공정표를 생성하고, 기준 공정표를 보존한 채 작업본을 만든 뒤, 작업본을 기준 공정표로 반영하는 흐름을 backend 없이 끝까지 볼 수 있다.

## Stage 6. 시연 홈과 통합 walkthrough 구성

목표:
현장 변경, 문서 생성, 공정표 생성을 하나의 서비스 시연 순서로 묶어서 본사 시연자가 길을 잃지 않고 진행할 수 있게 만든다.

커밋 메시지:
`feat: connect service presentation walkthrough`

결과물:
- 시연 홈 화면
- 현장별 진행 상태 요약
- 문서 생성 entry point
- 공정표 생성 entry point
- 생성 결과 보관함

체크포인트:
- [ ] 시연 홈에 현재 현장과 전환 CTA를 둔다
- [ ] 시연 홈에서 문서 생성과 공정표 생성으로 바로 이동하게 한다
- [ ] 최근 생성 문서와 공정표 작업본 상태를 요약해서 보여 준다
- [ ] 생성 결과 보관함에서 현장별 결과를 다시 열 수 있게 한다
- [ ] 통합 flow를 `현장 선택 -> 문서 생성 -> 결과 저장 -> 공정표 생성 -> 작업본 반영` 순서로 연결한다
- [ ] 새로고침 후에도 git tracked seed 기준의 시연 상태가 복원되는지 확인한다

완료 기준:
시연자가 별도 설명 자료 없이 앱 안에서 현장 선택부터 문서/공정표 결과 확인까지 한 번에 이어서 보여 줄 수 있다.

## Stage 7. QA와 시연 수용 기준 검증

목표:
본사 시연회에서 보여 줄 핵심 흐름이 깨지지 않고, backend가 없어도 결과가 저장된 것처럼 자연스럽게 보이는지 검증한다.

커밋 메시지:
`test: verify service presentation demo flow`

결과물:
- 수동 QA 체크 결과
- 데모 수용 기준 체크리스트
- 필요한 경우 store/service 단위 테스트

체크포인트:
- [ ] 첫 진입 시 현장 선택이 명확히 보이는지 확인한다
- [ ] 현장 변경 후 문서 자료와 생성 이력이 바뀌는지 확인한다
- [ ] 4종 문서가 모두 선택 가능하거나 준비 중 상태로 명확히 구분되는지 확인한다
- [ ] 문서 생성 완료 후 결과 Excel 참조가 `siteId` 기준 demo state에 남는지 확인한다
- [ ] 새로고침 후에도 git tracked seed 기준 생성 이력이 복원되는지 확인한다
- [ ] 공정표 생성 후 기준 공정표가 읽기 전용으로 보이는지 확인한다
- [ ] 작업본 생성, 수정, 기준 반영 흐름이 현장별로 분리되는지 확인한다
- [ ] 모바일과 데스크톱에서 시연 홈, 문서 생성, 공정표 화면의 핵심 CTA가 잘리지 않는지 확인한다
- [ ] backend network가 없어도 시연 핵심 flow가 중단되지 않는지 확인한다

완료 기준:
본사 시연회에서 `현장을 고르고, 실제 현장 자료 기반으로 문서와 공정표를 만들고, 그 결과가 서비스 안에 남는다`는 메시지가 끊기지 않고 전달된다.

## 고정 계약 A. Git 공유 demo seed

공유되어야 하는 demo seed는 git tracked source에 둔다.

초기 후보 경로:

```text
src/features/service-presentation-demo/data/site-manifest.seed.ts
src/features/service-presentation-demo/data/document-manifest.seed.ts
src/features/service-presentation-demo/data/generated-results.seed.ts
src/features/service-presentation-demo/data/schedule-state.seed.ts
```

`data/` 폴더는 실제 Excel, PDF, 이미지 자료의 상대 경로 대상일 뿐이며, 현장 id와 상태의 canonical source가 아니다.

## 고정 계약 B. 현장 manifest

현장 manifest는 아래 필드를 기준으로 시작한다.

| 필드 | 설명 |
| --- | --- |
| `siteId` | 내부 현장 키 |
| `siteName` | 사용자에게 보여 줄 현장명 |
| `dataRoot` | project root `data/` 안의 현장 폴더 경로 |
| `documents` | 문서별 manifest 배열 |
| `scheduleSeedId` | 공정표 seed 식별자 |

초기 현장:

| siteId | siteName | dataRoot |
| --- | --- | --- |
| `sunhyewon` | 선혜원 | `data/선혜원` |
| `cheongun_church` | 청운교회 | `data/청운교회` |

## 고정 계약 C. 문서 manifest

문서 manifest는 아래 필드를 기준으로 시작한다.

| 필드 | 설명 |
| --- | --- |
| `documentType` | 문서 타입 키 |
| `label` | 화면 문서명 |
| `sourceFolder` | 입력 자료가 있는 현장별 문서 폴더 |
| `inputFiles` | 시연에서 보여 줄 주요 입력 자료 |
| `outputExcel` | 생성 결과로 연결할 최종 Excel 파일 |
| `generationSteps` | 생성 중 화면에 보여 줄 단계 문구 |
| `status` | `available`, `needs_review`, `demo_ready` 중 하나 |

초기 문서 타입:

| documentType | label |
| --- | --- |
| `daily_report` | 홈페이지 fetch 작업일보 |
| `material_inspection_request` | 자재반입검수요청서 |
| `concrete_receiving_test` | 콘크리트 받아들이기 시험 |
| `concrete_compressive_strength_test` | 콘크리트 압축강도 시험 |

## 고정 계약 D. Git 공유 데모 상태 모델

생성 결과와 공정표 상태는 아래 필드를 기준으로 git tracked seed에 저장한다.

| 필드 | 설명 |
| --- | --- |
| `id` | 생성 결과 식별자 |
| `siteId` | 현장 키 |
| `type` | `document` 또는 `schedule` |
| `documentType` | 문서 결과일 때 문서 타입 |
| `title` | 결과 목록에 보여 줄 이름 |
| `sourceRefs` | 입력 자료 참조 배열 |
| `outputRef` | 최종 Excel 또는 공정표 결과 참조 |
| `createdAt` | 생성 시각 |
| `status` | `generated`, `draft`, `promoted` 등 결과 상태 |

runtime store는 이 seed를 읽어 화면 상태로 만든다. 브라우저 저장소 key는 공유 계약이 아니며, 사용하더라도 임시 캐시로만 취급한다.

```text
siteId -> generatedResults[]
siteId -> scheduleState
```

## 고정 계약 E. 공정표 버전 용어

공정표 화면 용어는 기존 계획과 동일하게 유지한다.

| 내부 개념 | 화면 용어 |
| --- | --- |
| `main` | 기준 공정표 |
| `sub` | 작업본 |
| `fork` | 작업본 만들기 |
| `promote` | 기준 공정표로 반영 |

기준 공정표는 읽기 전용이고, 작업본은 수정 가능해야 한다.
