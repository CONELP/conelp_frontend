# 문서 생성 Header 작업함 및 Ripple 큐 Plan

기능 또는 흐름 이름:
문서 생성 백그라운드 작업함과 Header ripple 큐

이 문서는 문서 생성 요청 후 사용자가 로딩 화면이나 팝업에 붙잡히지 않고 다른 업무를 계속할 수 있게 만드는 실행 계획이다.
Header에 문서 작업 아이콘을 추가하고, 생성 요청 시 해당 아이콘에 ripple effect를 주어 진행 상황을 어디에서 볼 수 있는지 직관적으로 알려준다.

`문서 생성 요청은 즉시 Header 작업함으로 들어가고, 사용자는 진행 상태와 완료 알림을 전역에서 확인한다.`

## 고정 UX 원칙

- 문서 생성 요청 후 사용자를 전용 대기 화면에 오래 머무르게 하지 않는다.
- 생성 시작 시 Header 문서 작업 아이콘에 ripple effect를 보여준다.
- Header 아이콘은 현재 처리 중인 문서 작업의 존재를 항상 알려주는 전역 진입점이다.
- 진행 상황 패널은 간단한 리스트로 구성하고, 사용자가 지금 무엇이 처리 중인지 한눈에 볼 수 있어야 한다.
- 완료와 실패는 토스트로 알려주되, 상세 확인과 재시도는 Header 작업 패널에서 한다.
- 작업 패널은 사용자가 명시적으로 닫기 전까지 완료/실패 항목을 잠깐 보관한다.
- 문서 생성이 실제로 동기 API에 묶여 있는 구간은 프론트에서 백그라운드 작업처럼 보이게 하되, 완전한 즉시 이탈은 별도 backend job API가 필요하다는 전제를 남긴다.

## 대상 파일 후보

- `src/app/ui/DesktopAppHeader.vue`
- `src/app/ui/styles/DesktopAppHeader.css`
- `src/app/App.vue`
- `src/features/document-conversion/state/useBackgroundDocumentJobsStore.ts`
- `src/features/document-conversion/state/useConversionLoadingDemoViewModel.ts`
- `src/features/document-conversion/ui/components/BackgroundDocumentJobToast.vue`
- `src/features/document-conversion/ui/components/BackgroundDocumentJobDialog.vue`
- `src/features/document-conversion/ui/components/DailyReportEditorPanel.vue`
- 신규 후보: `src/features/document-conversion/ui/components/BackgroundDocumentJobCenter.vue`

## Header 작업 아이콘 상태 계약

| 상태 | 아이콘 표현 | 패널 요약 | 사용자 행동 |
| --- | --- | --- | --- |
| 작업 없음 | 문서 아이콘만 표시 | "진행 중인 문서 작업이 없어요" | 없음 |
| 시작됨 | 아이콘 pulse 또는 얇은 링 | "작업을 준비 중입니다" | 패널 열기 |
| 진행 중 | 작은 spinner와 숫자 배지 | 진행 중 리스트 | 상세 확인 |
| 완료 있음 | 초록 점 또는 완료 배지 | 완료 리스트와 결과 보기 | 결과 보기, 목록에서 지우기 |
| 실패 있음 | 빨간 점 또는 실패 배지 | 실패 사유와 재시도 | 재시도, 닫기 |

## 작업 리스트 항목 계약

각 작업 항목은 아래 정보를 기준으로 표시한다.

- 문서명: `공사일보`, `자재 반입 검수요청서`, `콘크리트 반입시험` 등
- 설명: 날짜, 사진 수, 분석 대상 같은 짧은 보조 정보
- 상태: `준비 중`, `분석 중`, `생성 중`, `완료`, `실패`
- 시작 시각 또는 경과 시간: 짧게 표시하되 필수 정보는 아니다
- 완료 액션: `결과 보기`
- 실패 액션: `다시 시도`, `닫기`

## Header Ripple 큐 계약

생성 요청이 들어오면 아래 순서로 Header 아이콘에 시각적인 큐를 준다.

1. 작업이 등록되면 Header 문서 작업 아이콘 주변에 ripple ring을 1회 보여준다.
2. 동시에 진행 중 배지 또는 상태 점을 갱신한다.
3. ripple은 1초 이내로 끝나고, 다른 작업을 방해하지 않는다.
4. 사용자가 `prefers-reduced-motion: reduce`를 켠 경우 강한 움직임 없이 배지만 갱신한다.
5. Header가 화면에 없거나 아직 mount되지 않은 경우 ripple은 생략하고 작업 상태만 갱신한다.

## Stage 1. 전역 작업 상태 계약 정리

목표:
문서 생성 작업이 Header 패널과 토스트, ripple 큐에서 같은 상태를 바라보도록 store 계약을 확장한다.

커밋 메시지:
`docs: define document generation job center contract`

결과물:
- `docs/plans/document-generation-header-job-center-plan.md`
- `src/features/document-conversion/state/useBackgroundDocumentJobsStore.ts`

체크포인트:
- [ ] `BackgroundJobStatus`를 `queued`, `analyzing`, `generating`, `succeeded`, `failed` 기준으로 확장한다
- [ ] 작업 항목에 `documentType`, `documentTypeLabel`, `summary`, `resultRoute`, `retryKey`, `startedAt`, `updatedAt` 후보를 둔다
- [ ] 완료/실패 작업을 즉시 제거하지 않고 패널에서 확인 가능한 보관 상태로 둔다
- [ ] `activeJobs`, `completedJobs`, `failedJobs`, `visibleJobs`, `unreadCompletedCount` computed 값을 만든다
- [ ] 생성 시작 토스트와 완료 토스트를 분리한다
- [ ] 기존 `completionSignal` 기반 생성 문서 목록 refresh 동작은 유지한다

완료 기준:
Header, 토스트, 생성 문서 목록 화면이 같은 store 상태를 사용해 진행 중/완료/실패를 일관되게 표현할 수 있다.

## Stage 2. Header 문서 작업 아이콘 추가

목표:
모든 주요 데스크톱 화면에서 문서 작업 상태를 확인할 수 있는 Header 진입점을 만든다.

커밋 메시지:
`feat: add document job indicator to header`

결과물:
- `src/app/ui/DesktopAppHeader.vue`
- `src/app/ui/styles/DesktopAppHeader.css`
- 신규 `BackgroundDocumentJobCenter.vue`

체크포인트:
- [ ] `DesktopAppHeader`의 프로젝트 선택과 설정 버튼 사이에 문서 작업 아이콘 버튼을 추가한다
- [ ] Fluent UI 문서 아이콘을 사용하고 버튼에는 `aria-label="문서 작업"`을 둔다
- [ ] 진행 중 작업 수를 작은 배지로 표시한다
- [ ] 완료 또는 실패 미확인 항목이 있을 때 점 배지를 표시한다
- [ ] 버튼 클릭 시 Header 아래에 작업 패널을 연다
- [ ] Header 밖 클릭과 Escape 입력으로 패널을 닫는다
- [ ] 모바일 Header에서는 메뉴가 열렸을 때도 아이콘과 패널이 깨지지 않게 배치한다

완료 기준:
사용자가 어느 주요 화면에 있든 Header의 문서 아이콘을 보고 진행 중인 작업이 있는지 알 수 있고, 클릭해서 작업 리스트를 열 수 있다.

## Stage 3. 작업 패널 리스트와 액션 설계

목표:
진행 중인 문서 생성 상태를 팝업이 아니라 작고 예측 가능한 리스트 패널에서 확인하게 한다.

커밋 메시지:
`feat: show background document jobs in header panel`

결과물:
- `BackgroundDocumentJobCenter.vue`
- `src/features/document-conversion/ui/components/BackgroundDocumentJobDialog.vue` 제거 또는 비활성화
- `src/app/App.vue`

체크포인트:
- [ ] 패널 상단 제목을 `문서 작업`으로 둔다
- [ ] 진행 중 작업은 spinner, 문서명, 설명, 상태 텍스트로 표시한다
- [ ] 완료 작업은 완료 표시와 `결과 보기` 버튼을 제공한다
- [ ] 실패 작업은 실패 사유와 `다시 시도`, `닫기` 버튼 영역을 제공한다
- [ ] 작업이 없을 때는 빈 상태 문구만 조용히 보여준다
- [ ] 기존 중앙 modal 방식의 `BackgroundDocumentJobDialog` 자동 노출을 제거한다
- [ ] 완료/실패 항목을 개별 삭제하거나 모두 정리할 수 있게 한다

완료 기준:
팝업 없이도 진행 중, 완료, 실패 작업을 Header 패널에서 모두 확인하고 필요한 후속 행동을 할 수 있다.

## Stage 4. Header Ripple 큐 구현

목표:
생성 요청 후 Header 작업 아이콘에 ripple effect를 주어 사용자가 작업 위치를 바로 이해하게 한다.

커밋 메시지:
`feat: highlight document job indicator on enqueue`

결과물:
- `src/features/document-conversion/state/useBackgroundDocumentJobsStore.ts`
- `src/features/document-conversion/ui/components/BackgroundDocumentJobCenter.vue`

체크포인트:
- [ ] 작업 enqueue 시 Header 아이콘 ripple signal을 store에 기록한다
- [ ] Header 문서 아이콘 버튼에 ripple ring animation을 붙인다
- [ ] ripple 중에도 배지와 클릭 영역이 밀리거나 흔들리지 않게 한다
- [ ] 동시에 여러 작업이 들어오면 ripple을 자연스럽게 다시 시작한다
- [ ] `prefers-reduced-motion`에서는 ring 확산 대신 배지 갱신만 수행한다

완료 기준:
문서 생성 요청 직후 Header 문서 아이콘에 ripple이 보이고, 아이콘 배지가 갱신되어 "이 작업은 Header에서 볼 수 있다"는 신호가 명확해진다.

## Stage 5. 문서 생성 흐름의 대기 제거

목표:
문서 생성 시 중앙 팝업을 기다리는 흐름을 없애고, 사용자가 바로 다른 화면으로 이동하거나 현재 작업을 계속할 수 있게 한다.

커밋 메시지:
`feat: run document generation as background jobs`

결과물:
- `src/features/document-conversion/state/useConversionLoadingDemoViewModel.ts`
- `src/features/document-conversion/ui/components/DailyReportEditorPanel.vue`
- `src/features/document-conversion/ui/components/BackgroundDocumentJobToast.vue`

체크포인트:
- [ ] `enqueueJob` 호출 시 자동으로 dialog를 열지 않는다
- [ ] 생성 시작 직후 `문서 생성을 시작했어요. 다른 작업을 계속하셔도 됩니다.` 토스트를 띄운다
- [ ] 완료 시 `문서 생성이 완료됐어요.` 토스트와 `결과 보기` 액션을 제공한다
- [ ] 실패 시 실패 토스트를 띄우고 Header 패널에 실패 항목을 남긴다
- [ ] `DailyReportEditorPanel`의 생성 버튼은 background job 등록 직후 버튼 잠금을 풀 수 있게 한다
- [ ] 동기 분석 API가 필요한 문서는 현재 API 한계와 실제 백그라운드 전환 필요 범위를 코드 주석 또는 후속 TODO로 분리한다
- [ ] 분석까지 백그라운드 job으로 넘길 backend API가 생기면 loading page 의존을 제거할 수 있게 route 전환 지점을 한 곳으로 모은다

완료 기준:
사용자는 문서 생성 요청 후 팝업 확인을 기다리지 않고 다른 업무를 계속할 수 있으며, 완료와 실패는 Header 작업함과 토스트로 확인한다.

## Stage 6. QA와 수용 기준 검증

목표:
새 Header 작업함이 기존 문서 생성, 작업일보 생성, 생성 문서 목록 refresh를 깨지 않는지 수동으로 검증한다.

커밋 메시지:
`test: verify document job center interactions`

결과물:
- 수동 QA 체크리스트
- `npm run build` 결과
- 데스크톱/모바일 Header 화면 확인

체크포인트:
- [ ] `npm run build`가 통과한다
- [ ] 공사일보 생성 요청 시 Header 아이콘 ripple이 보인다
- [ ] 자재 반입 검수요청서 생성 요청 시 작업 패널에 진행 중 항목이 보인다
- [ ] 콘크리트 반입시험 생성 요청 시 작업 패널에 진행 중 항목이 보인다
- [ ] 완료 후 토스트가 뜨고 Header에 완료 상태가 남는다
- [ ] 생성 문서 목록 화면이 완료 signal 후 refresh된다
- [ ] 실패를 강제로 만들었을 때 Header 패널에 실패 사유가 남는다
- [ ] Header 밖 클릭과 Escape로 작업 패널이 닫힌다
- [ ] 모바일 폭에서 아이콘, 배지, 패널 텍스트가 겹치지 않는다
- [ ] `prefers-reduced-motion` 환경에서 강한 움직임 없이 상태 변화가 보인다

완료 기준:
문서 생성 시작, 진행 확인, 완료 확인, 실패 확인, 생성 문서 목록 refresh가 모두 Header 작업함 중심으로 동작하고, 중앙 대기 팝업 없이도 사용자가 다음 행동을 자연스럽게 이해한다.
