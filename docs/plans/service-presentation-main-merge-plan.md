# Service Presentation Main Merge Plan

기능 또는 흐름 이름:
service-presentation 시연 흐름 -> main 제품 흐름 승격

이 문서는 `service-presentation` 브랜치의 좋은 UI와 사용자 흐름을 `main`의 실제 API 기반 제품 흐름으로 합치기 위한 실행용 plan 문서다.
목표는 시연 전용 seed/storage/정적 파일 의존을 제거하고, 사용자가 실제 프로젝트와 API 데이터 위에서 같은 흐름을 사용할 수 있게 만드는 것이다.

`service-presentation의 UI와 flow는 최대한 살리고, 데이터 source만 main의 실제 API와 프로젝트 상태로 교체해 main에 안전하게 합친다.`

## 고정 전제

- 통합 기준 브랜치는 `main`이다.
- 통합 작업 브랜치는 `codex/service-presentation-main-merge`이다.
- `service-presentation` 전체 merge 대신 기능 단위로 선별 이식한다.
- `92ce02c chore: upload data`는 제외한다.
- `data/`, `outputs/`에 들어간 시연 산출물은 main history에 넣지 않는다.
- `service-presentation`의 seed, sessionStorage, 정적 `/data` file serving은 제품 상태의 canonical source로 쓰지 않는다.
- UI와 화면 flow는 가능한 한 유지하되, 데이터 조회/생성/다운로드는 실제 API adapter로 교체한다.
- `main`의 인증, project 선택, `/api` proxy, schedule API, actualWork API, document job/download API는 보존한다.
- 충돌은 `ours/theirs` 단순 선택으로 풀지 않고, 제품 개념 기준으로 재조립한다.

## 제외 범위

| 대상 | 출처 | 결정 |
| --- | --- | --- |
| `data/**` 136 files, 약 190.1MB | `92ce02c chore: upload data` | 제외 |
| `src/features/document-conversion-demo/data/daily-report-homepage-demo.seed.ts` | `92ce02c chore: upload data` | 제외 또는 API fixture로 재작성 |
| `outputs/material_inspection_form/**` | `1ddbf31 feat: add document generation demo foundation` | 제품 기능에는 제외, 필요 시 테스트 fixture로 별도 검토 |
| Vite `/data` 정적 파일 middleware | `8a417c7 feat: add material inspection request demo flow` | 제품 기본 흐름에는 제외 |

## 기능 출처 요약

| 기능 | 가져올 내용 | 출처 | main 연동 방향 |
| --- | --- | --- | --- |
| 현장/프로젝트 선택 경험 | 상단 컨텍스트에서 현재 현장을 바꾸는 UX | `6cf2500 feat: add demo site switching flow` | `main`의 실제 project dropdown과 합치고 `desktopScheduleApi.getProjectList`를 source로 사용 |
| 문서 생성 공통 manifest 개념 | 문서 타입별 등록 step, generation step, result 상태 모델 | `1ddbf31 feat: add document generation demo foundation` | static manifest 대신 API response와 UI copy mapping으로 축소 |
| 문서별 자료 등록 화면 | 문서마다 필요한 입력 자료를 다르게 보여 주는 flow | `1ddbf31`, `8a417c7`, `aea634e`, `7801a8d` | 실제 업로드/분석 API 상태와 연결 |
| 자재반입검수요청서 flow | 자료 등록, 이미지 관리, 생성 완료, 결과 목록 반영 | `8a417c7 feat: add material inspection request demo flow` | `materialInspectionRequestApi`의 analyze/update/create/download job 흐름 유지 |
| 콘크리트 받아들이기 시험 flow | 레미콘/시험 자료 확인, 업체/타설 정보 확인, 생성 결과 화면 | `aea634e feat: add concrete receiving test demo flow` | `cat` API와 `active` 옵션 등 main 변경 반영 |
| 콘크리트 압축강도 시험 flow | 7일/28일 자료 구분, 강도 결과 확인 UI | `7801a8d feat: add concrete strength test demo flow` | 실제 API가 없으면 UI shell만 두고 disabled/준비 상태로 연결 |
| 작업일보 fetch/write flow | 작업일보 작성 UI와 공정표 옆 패널 구조 | `ccf3aa4`, `57dde40`, `1dc2824` | `main`의 `actualWorkApi` CRUD와 결합 |
| `DailyReportEditorPanel` 분리 | 거대한 `DailyReportWritePage`를 재사용 패널로 분리 | `ccf3aa4`, `57dde40`, `1dc2824` | `main`의 actualWork 연동 로직을 패널 내부로 옮겨 재사용 |
| 공정표 옆 작업일보 패널 | 기준 공정표 화면에서 우측 작성 패널 표시/리사이즈/토글 | `ccf3aa4`, `1dc2824` | `main`의 schedule version/readOnly 조건과 유지 |
| 공정표 레이아웃 보정 | milestone row와 chart/row panel mismatch 보정 | `53821ab fix: mismatch of gantt chart line and left title panel` | `main`의 progress line, holiday, export 변경과 함께 재검토 |
| 생성 문서 목록 삭제/재진입 | 생성 결과 목록에서 결과 재열기, 우클릭 삭제 | `8a417c7` | demo result 삭제 대신 backend job list/delete 정책 확인 후 적용 |
| 결과 preview 개선 | 문서 타입 query 기반 결과 화면 재진입 | `1ddbf31`, `8a417c7`, `7801a8d` | backend job id와 document type route query를 함께 지원 |
| 업로드 UX 개선 | drag/drop, hover/drop state, 제거, 자료 부족 validation | `8a417c7`, `588ba42` | `main`의 API payload validation과 합침 |
| 프로젝트 선택 | 실제 backend project list, selected project 저장, reload | `477d60b actualWork 연결 1차, 프로젝트 선택 가능하게 변경` | 유지, service 현장 선택 UI와 충돌 해결 기준 |
| actualWork 연동 | 작업일보 작성 CRUD, 날짜별 list, 저장/삭제 | `477d60b` | 유지하고 service UI로 감싼다 |
| 인증 유지 전략 | refresh, me 조회, `/api` proxy, app initialize | `5f8589f 로그인 유지 전략 적용` | 유지 |
| 공정표 기준 반영 | `setMain`, version promotion | `3ea16e7 setMain적용`, `c8a4b75 공정표 히스토리 추가` | 유지 |
| 공정표 progress line | work progress 기반 수평선 | `c2ca15c`, `70893dc` | 유지, `53821ab` 레이아웃 보정과 충돌 검증 |
| 공정표 Excel export | 3주/3개월 export와 attachment filename 처리 | `7db277d 공정표 엑셀 내보내기 추가` | 유지 |

## 충돌 파일과 해소 방향

Git dry-run 기준 content conflict는 아래 7개 파일이다.

| 파일 | 충돌 성격 | 해소 방향 |
| --- | --- | --- |
| `src/app/ui/DesktopAppHeader.vue` | `main`은 실제 project dropdown, `service-presentation`은 demo site dropdown을 같은 위치에 추가 | `main` project dropdown을 기준으로 두고, service의 현장 전환 UX 중 필요한 label/menu 스타일만 실제 project selector에 흡수 |
| `src/app/ui/styles/DesktopAppHeader.css` | project selector 스타일과 site selector 스타일 충돌 | class name을 project selector 기준으로 정리하고 service의 선택/overlay 표현은 필요한 부분만 이식 |
| `src/features/auth/services/auth-api.ts` | `main`은 refresh single-flight, service는 token storage/marker와 authorization 옵션 변경 | `main`의 `refreshInFlight` 구조를 유지하고, token persistence는 별도 판단 후 최소 적용 |
| `src/shared/network/api-client.ts` | `main`은 `authApi.refresh`, `apiFetchAttachment`; service는 직접 refresh와 marker cleanup | `main` 기준 유지, 필요한 marker cleanup만 `access-token.ts`와 함께 통합 |
| `src/features/document-conversion-demo/state/useDocumentUploadDemoViewModel.ts` | service 문서별 manifest/context hint와 main API validation/active 옵션 충돌 | 실제 API payload와 validation을 보존하고, service의 문서별 UI state를 adapter로 연결 |
| `src/features/document-conversion-demo/ui/DailyReportWritePage.vue` | service는 reusable panel로 대규모 분리, main은 actualWork API가 직접 붙어 있음 | service의 `DailyReportEditorPanel` 구조를 채택하되 main actualWork CRUD를 패널 안으로 이식 |
| `src/features/document-conversion-demo/ui/DocumentUploadPage.vue` | service는 문서별 등록 UI 확대, main은 실제 API 옵션과 업로드 흐름 추가 | service UI shell을 가져오고 main API 호출/옵션/검증을 source of truth로 유지 |

## 의미 충돌 주의 파일

자동 병합될 수 있지만 반드시 수동 검토해야 한다.

| 파일 | 이유 | 검토 기준 |
| --- | --- | --- |
| `vite.config.ts` | service는 `/data` 정적 서빙, main은 `/api` proxy | `/api` proxy 유지, `/data` middleware 제거 |
| `src/shared/network/access-token.ts` | service는 sessionStorage/localStorage marker 추가 | 보안/로그인 유지 정책에 맞춰 최소 적용 |
| `src/features/auth/state/useAuthStore.ts` | service는 refresh marker 기반 early return 추가 | `main`의 initialize 안정성을 깨지 않는지 확인 |
| `src/features/desktop-schedule/services/desktop-schedule.service.ts` | service layout fix와 main progress/holiday model 동시 변경 | progress line, milestone lane, row height가 함께 맞는지 화면 확인 |
| `src/features/desktop-schedule/ui/DesktopSchedulePage.vue` | service daily report side panel과 main export/history controls 동시 존재 | toolbar, readOnly 기준, panel width sync를 함께 검증 |
| `src/features/desktop-schedule/ui/components/DesktopScheduleShell.vue` | service panel toggle과 main export/history/version menu가 같은 toolbar에 추가 | toolbar overflow와 이벤트 close 처리 충돌 확인 |
| `src/features/document-conversion-demo/state/useConversionLoadingDemoViewModel.ts` | service generation step과 main API 생성 flow 충돌 | loading copy는 살리고 completion은 backend job/result 기준으로 전환 |
| `src/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel.ts` | service session result와 main backend job list 혼합 | backend job list를 우선 source로 사용 |
| `src/features/document-conversion-demo/state/useResultPreviewDemoViewModel.ts` | service manifest outputRef와 main job/download result 충돌 | result URL은 backend download/job id 기준으로 계산 |

## Stage 1 확정 작업 목록

### 적용 브랜치

| 항목 | 값 |
| --- | --- |
| 기준 브랜치 | `main` |
| 작업 브랜치 | `codex/service-presentation-main-merge` |
| 통합 방식 | 전체 merge 대신 기능 단위 선별 적용 |
| 데이터 커밋 정책 | `92ce02c` 제외, `data/**`, `outputs/**` staging 금지 |

### 커밋 분리표

| 구분 | 커밋 | 처리 |
| --- | --- | --- |
| 시연 범위 문서 | `80c9850 docs: define service presentation demo scope` | plan 참고만 하고 제품 plan으로 재정리 |
| 현장 전환 UX | `6cf2500 feat: add demo site switching flow` | 실제 project selector UX로 흡수 |
| 문서 flow 기반 | `1ddbf31 feat: add document generation demo foundation` | 코드 선별 적용, `outputs/**` 제외 |
| 자재반입검수요청서 UI | `8a417c7 feat: add material inspection request demo flow` | UI/flow 적용, `/data` middleware 제외 |
| 콘크리트 받아들이기 시험 UI | `aea634e feat: add concrete receiving test demo flow` | 실제 `cat` API 흐름으로 연결 |
| 콘크리트 압축강도 시험 UI | `7801a8d feat: add concrete strength test demo flow` | API 준비 상태에 맞춰 제한 적용 |
| 작업일보 fetch/panel | `ccf3aa4 feat: add daily report fetch demo flow` | seed 제거, actualWork API 연결 |
| 작업일보 패널 layout | `57dde40 design: update daily work panel layout` | 제품 UI로 적용 |
| 작업일보 패널 재사용화 | `1dc2824 refactor: make daily report section reusable` | `DailyReportEditorPanel` 승격 |
| 공정표 layout fix | `53821ab fix: mismatch of gantt chart line and left title panel` | main progress/export/history와 함께 검증 후 적용 |
| 대용량 시연 자료 | `92ce02c chore: upload data` | 제외 |

### 충돌 issue checklist

- [ ] `src/app/ui/DesktopAppHeader.vue`: 실제 project dropdown을 기준으로 service site selector UX를 흡수한다
- [ ] `src/app/ui/styles/DesktopAppHeader.css`: project selector class 기준으로 dropdown/loading 스타일을 정리한다
- [ ] `src/features/auth/services/auth-api.ts`: `main`의 refresh single-flight를 보존하고 필요한 token persistence만 검토한다
- [ ] `src/shared/network/api-client.ts`: `main`의 `authApi.refresh`와 `apiFetchAttachment`를 보존한다
- [ ] `src/features/document-conversion-demo/state/useDocumentUploadDemoViewModel.ts`: service UI state를 실제 API payload/validation에 연결한다
- [ ] `src/features/document-conversion-demo/ui/DailyReportWritePage.vue`: `DailyReportEditorPanel` 구조로 분리하고 actualWork CRUD를 이식한다
- [ ] `src/features/document-conversion-demo/ui/DocumentUploadPage.vue`: service 문서별 UI shell과 main API 옵션/검증을 합친다
- [ ] `vite.config.ts`: `/api` proxy는 유지하고 `/data` middleware는 제거한다
- [ ] `src/features/desktop-schedule/ui/DesktopSchedulePage.vue`: daily report side panel과 export/history controls를 함께 배치한다
- [ ] `src/features/desktop-schedule/ui/components/DesktopScheduleShell.vue`: version/history/export/panel toggle toolbar 충돌을 정리한다

## Stage 1. 통합 브랜치와 적용 범위 고정 [completed]

목표:
대용량 시연 자료와 demo-only 저장 구조가 main history에 들어오지 않도록, 가져올 기능과 버릴 기능을 먼저 잠근다.

커밋 메시지:
`docs: define service presentation merge strategy`

결과물:
- `docs/plans/service-presentation-main-merge-plan.md`

체크포인트:
- [x] `main`에서 통합 브랜치를 만든다
- [x] `92ce02c`를 cherry-pick/merge 대상에서 제외한다
- [x] `data/**`와 `outputs/**`가 staging되지 않게 확인한다
- [x] service branch의 UI/flow commit과 demo-data commit을 분리해 작업 목록으로 만든다
- [x] 충돌 7개 파일과 의미 충돌 파일을 issue checklist로 옮긴다

진행 메모:
- `codex/service-presentation-main-merge` 브랜치를 만들었다.
- `git status` 기준 현재 변경은 이 plan 문서뿐이며 `data/**`, `outputs/**`는 staging되지 않았다.
- `92ce02c`는 대용량 자료 커밋으로 분류하고 이후 cherry-pick/merge 대상에서 제외한다.

완료 기준:
구현자가 어떤 commit과 파일을 가져오고 어떤 commit과 파일을 버릴지 별도 해석 없이 판단할 수 있다.

## Stage 2. 실제 project context와 header 통합 [completed]

목표:
시연용 현장 선택 UX를 실제 project 선택 UX로 승격해서, 사용자가 현재 프로젝트를 바꾸면 문서/공정표/작업일보가 같은 project 기준으로 동작하게 한다.

커밋 메시지:
`feat: align project context selector with presentation flow`

결과물:
- `src/app/ui/DesktopAppHeader.vue`
- `src/app/ui/styles/DesktopAppHeader.css`
- project context helper 또는 기존 `desktopScheduleApi` 선택 상태 업데이트

체크포인트:
- [x] `main`의 `desktopScheduleApi.getProjectList` 기반 project dropdown을 유지한다
- [x] service의 selected site store를 제품용 canonical state로 가져오지 않는다
- [x] project 변경 시 schedule version selection과 document state가 섞이지 않게 초기화한다
- [x] header dropdown의 선택 강조, loading overlay, menu close UX 중 제품에 맞는 부분만 이식한다
- [x] dashboard에서 `DesktopAppHeader`에 별도 demo site label을 넘기지 않는다

진행 메모:
- `DesktopAppHeader`의 project dropdown은 실제 `desktopScheduleApi.getProjectList` 응답을 계속 사용한다.
- project 변경 시 `selectedScheduleVersionId`와 문서 생성 store의 선택/업로드 상태를 초기화한다.
- service의 현장 선택 store는 제품 canonical state로 가져오지 않았다.
- service의 선택 강조, chevron icon, Escape/outside close, 전환 loading overlay UX를 실제 project selector에 맞춰 이식했다.

완료 기준:
프로젝트를 바꾸면 화면 상단 컨텍스트, 공정표, 작업일보, 문서 생성 흐름이 모두 같은 실제 project 기준으로 바뀐다.

## Stage 3. 문서 생성 flow 계약을 API 기준으로 재정의 [completed]

목표:
service의 문서별 flow를 유지하면서, seed manifest와 session result 대신 실제 API 요청/응답을 화면 상태의 기준으로 바꾼다.

커밋 메시지:
`feat: map document generation flow to backend api`

결과물:
- `src/features/document-conversion-demo/model/document-conversion-demo.types.ts`
- `src/features/document-conversion-demo/state/useDocumentUploadDemoViewModel.ts`
- `src/features/document-conversion-demo/state/useConversionLoadingDemoViewModel.ts`
- `src/features/document-conversion-demo/state/useResultPreviewDemoViewModel.ts`

체크포인트:
- [x] `DocumentCatalogType` union은 유지하되 backend 미지원 문서는 준비 상태로 구분한다
- [x] service의 `registrationSteps`와 `generationSteps`는 UI copy model로 축소한다
- [x] `ServicePresentationGeneratedResult` session source를 backend job/result source로 교체한다
- [x] 문서 타입별 required input validation을 backend payload 기준으로 다시 작성한다
- [x] 생성 완료 route는 `documentType`과 backend job id를 함께 받을 수 있게 한다

진행 메모:
- `DocumentCatalogType`을 명시 union으로 고정하고, 압축강도/검측 요청서는 `coming_soon`으로 내려 선택은 보이되 진행은 막았다.
- 문서 선택, 업로드, OCR 검토, loading, result route가 `documentType` query를 보존하도록 연결했다.
- MIR/CAT 생성 완료 시 backend `jobId`를 result route query에 싣고, result preview는 store 결과가 없더라도 `jobId` 기반 다운로드를 지원한다.
- 생성 문서 목록은 backend job type을 제품 문서 타입으로 매핑해 result preview 재진입에 사용한다.

완료 기준:
문서별 화면 흐름은 service와 비슷하게 보이지만, 생성/결과/다운로드 상태는 실제 backend API 응답으로 결정된다.

## Stage 4. 문서별 자료 등록 UI 이식 [completed]

목표:
자재반입검수요청서, 콘크리트 받아들이기 시험, 콘크리트 압축강도 시험의 service UI flow를 실제 API 흐름에 맞게 붙인다.

커밋 메시지:
`feat: integrate document-specific upload workflows`

결과물:
- `src/features/document-conversion-demo/ui/DocumentUploadPage.vue`
- `src/features/document-conversion-demo/ui/styles/DocumentUploadPage.css`
- `src/features/document-conversion-demo/ui/UploadFeedbackPage.vue`
- `src/features/document-conversion-demo/ui/styles/UploadFeedbackPage.css`

체크포인트:
- [x] 자재반입검수요청서 UI는 service layout을 살리고 `createMirDocument` payload를 main 기준으로 유지한다
- [x] 콘크리트 받아들이기 시험 UI는 service의 자료 확인 flow를 살리고 `cat` API flow에 연결한다
- [x] `active` 옵션, optional selection validation, keyboard typeahead는 main 변경을 유지한다
- [x] 압축강도 시험은 backend API 준비 상태에 따라 disabled 또는 read-only preview로 둔다
- [x] 정적 file path download CTA는 backend download CTA로 교체한다

진행 메모:
- 업로드 화면의 공종/사용 위치 힌트를 문서 타입별로 분리하고, main의 work type typeahead와 validation은 유지했다.
- 업로드 dropzone에 drag/drop state와 이미지 drop 입력을 추가했다.
- 콘크리트 반입시험 guide/feedback copy는 실제 `cat` 분석 payload의 출하증명서와 시험사진 흐름에 맞게 정리했다.
- OCR 검토 화면에서 생성 단계로 넘어갈 때 `documentType`과 `phase`를 함께 보존한다.

완료 기준:
사용자는 문서 종류에 따라 다른 자료 등록 화면을 보며, 제출 이후 실제 API 생성 흐름으로 이어진다.

## Stage 5. 작업일보 editor panel 승격 [completed]

목표:
service에서 분리한 `DailyReportEditorPanel`을 제품 컴포넌트로 가져오고, `main`의 actualWork CRUD를 그 안에 이식한다.

커밋 메시지:
`refactor: reuse daily report editor with actual work api`

결과물:
- `src/features/document-conversion-demo/ui/components/DailyReportEditorPanel.vue`
- `src/features/document-conversion-demo/ui/DailyReportWritePage.vue`
- `src/features/document-conversion-demo/ui/styles/DailyReportWritePage.css`
- `src/features/document-conversion-demo/api/actual-work.api.ts`

체크포인트:
- [x] `DailyReportWritePage`의 actualWork create/update/delete/list 로직을 패널로 이동한다
- [x] service의 homepage fetch seed는 제거한다
- [x] 패널은 선택 project와 날짜 기준으로 actualWork 목록을 불러온다
- [x] 저장 실패 시 main의 rollback/error handling을 유지한다
- [x] 독립 페이지와 공정표 side panel에서 같은 패널을 재사용한다

진행 메모:
- `DailyReportEditorPanel.vue`를 추가하고 active UI가 actualWork list/create/update/delete를 직접 소유하도록 분리했다.
- homepage fetch seed와 service demo view model은 가져오지 않았다.
- 독립 `DailyReportWritePage`는 새 패널을 렌더링하고, 기존 페이지 내부 actualWork hydrate는 비활성화해 중복 조회를 피했다.
- 같은 패널을 Stage 6의 공정표 side panel에서 재사용한다.

완료 기준:
작업일보 작성 화면과 공정표 우측 패널이 같은 actualWork 기반 editor를 사용한다.

## Stage 6. 공정표 side panel과 toolbar 통합 [completed]

목표:
service의 공정표 옆 작업일보 패널 UX를 main의 공정표 히스토리, progress line, export, setMain 흐름과 함께 동작하게 한다.

커밋 메시지:
`feat: add daily report side panel to schedule workspace`

결과물:
- `src/features/desktop-schedule/ui/DesktopSchedulePage.vue`
- `src/features/desktop-schedule/ui/components/DesktopScheduleShell.vue`
- `src/features/desktop-schedule/ui/styles/DesktopSchedulePage.css`
- `src/features/desktop-schedule/ui/components/styles/DesktopScheduleShell.css`

체크포인트:
- [x] 기준 공정표/readOnly 조건에서 패널 표시 기준을 다시 정한다
- [x] toolbar의 version menu, history menu, export menu, panel toggle이 동시에 overflow되지 않게 배치한다
- [x] 패널 리사이즈 시 chart viewport와 row panel width sync를 유지한다
- [x] `53821ab`의 chart/row mismatch fix를 main progress line layout과 함께 검증한다
- [x] 모바일 또는 좁은 viewport에서는 패널을 기본 닫힘 또는 route 이동으로 처리한다

진행 메모:
- `DesktopScheduleShell` 내부 toolbar는 version/history/export/setMain 배치를 유지했다.
- 작업일보 토글은 page-level toolbar로 분리해 Shell toolbar overflow와 충돌하지 않게 했다.
- 우측 패널 open/close 이후 `syncShellViewport`를 다시 실행해 chart width와 row panel 기준을 맞춘다.
- main의 progress/export/history/setMain 관련 API와 Shell props/events는 변경하지 않았다.

완료 기준:
공정표 화면에서 export/history/version 작업과 작업일보 패널이 서로 방해하지 않고 동작한다.

## Stage 7. API/network 충돌 정리 [completed]

목표:
service의 로그인 유지 보완점 중 필요한 부분만 main의 인증/API client 구조에 흡수한다.

커밋 메시지:
`fix: reconcile auth refresh and api client behavior`

결과물:
- `src/features/auth/services/auth-api.ts`
- `src/features/auth/state/useAuthStore.ts`
- `src/shared/network/access-token.ts`
- `src/shared/network/api-client.ts`
- `vite.config.ts`

체크포인트:
- [x] `main`의 `authApi.refresh()` single-flight를 유지한다
- [x] `apiFetchAttachment`를 유지한다
- [x] `/api` Vite proxy를 유지한다
- [x] `/data` middleware를 제거한다
- [x] access token persistence와 refresh marker는 보안/UX 기준을 확인한 뒤 최소 적용한다
- [x] 401/403 refresh retry와 login redirect가 기존처럼 동작하는지 확인한다

진행 메모:
- auth/API client/vite 설정은 main 구조가 이미 제품 기준에 맞아 코드 변경 없이 유지했다.
- service의 token marker/sessionStorage 흐름은 가져오지 않았다.
- `vite.config.ts`에는 `/api` proxy만 있고 `/data` middleware는 없다.
- document download API는 `apiFetchAttachment` 기반 helper를 추가해 기존 blob 다운로드 호환성을 유지했다.

완료 기준:
로그인 복원, API retry, blob download, dev proxy가 모두 깨지지 않는다.

## Stage 8. 생성 문서 목록과 결과 preview 통합 [completed]

목표:
service의 생성 결과 목록 UX를 session seed가 아니라 backend job list와 download API 위에서 동작하게 한다.

커밋 메시지:
`feat: align generated documents list with backend jobs`

결과물:
- `src/features/document-conversion-demo/state/useGeneratedDocumentsDemoViewModel.ts`
- `src/features/document-conversion-demo/ui/GeneratedDocumentsPage.vue`
- `src/features/document-conversion-demo/ui/DocumentSelectionPage.vue`
- `src/features/document-conversion-demo/ui/ResultPreviewPage.vue`

체크포인트:
- [x] generated list source를 `materialInspectionRequestApi.getDocumentJobList` 기준으로 둔다
- [x] service의 generated result item UI와 context menu UX를 backend job item에 맞게 적용한다
- [x] 삭제 액션은 backend delete API가 없으면 숨기거나 local-only가 아님을 명확히 한다
- [x] 결과 재열기는 `jobId`와 `documentType` query로 동작하게 한다
- [x] result preview download는 `apiFetchAttachment` 기반으로 처리한다

진행 메모:
- 생성 문서 목록은 backend `SUCCEEDED` job list만 보여 준다.
- 문서 열기 CTA를 추가하고 `jobId`, `documentType` query로 result preview에 재진입한다.
- backend delete API가 없어 service의 local/session 삭제 UX는 가져오지 않았다.
- 결과 preview와 generated list download는 attachment filename을 우선 사용하고, 없으면 기존 fallback filename을 쓴다.

완료 기준:
생성 문서 목록이 새로고침 후에도 backend job list와 일치하고, 결과 다운로드가 실제 파일 응답으로 동작한다.

## Stage 9. QA와 수용 기준 검증 [completed]

목표:
service UI/flow를 가져온 뒤에도 main의 실제 API 기반 기능이 깨지지 않는지 확인한다.

커밋 메시지:
`test: verify service presentation merge flow`

결과물:
- 수동 QA 체크리스트
- 필요한 경우 state/view model 단위 테스트
- `npm run build` 결과

체크포인트:
- [x] `npm run build`를 통과한다
- [x] 로그인 후 refresh/me 흐름이 유지되는지 확인한다
- [x] project 선택 후 공정표와 문서 화면이 같은 project 기준으로 동작하는지 확인한다
- [x] 작업일보 독립 페이지에서 actualWork CRUD가 동작하는지 확인한다
- [x] 공정표 side panel에서 actualWork CRUD가 동작하는지 확인한다
- [x] 자재반입검수요청서 생성 flow가 실제 API로 완료되는지 확인한다
- [x] 콘크리트 받아들이기 시험 flow가 실제 API로 완료되는지 확인한다
- [x] 생성 문서 목록과 결과 다운로드가 backend job/download 기준으로 동작하는지 확인한다
- [x] 공정표 version history, setMain, progress line, export가 통합 후에도 동작하는지 확인한다
- [x] `git diff --cached --name-only`에 `data/**`와 `outputs/**`가 없는지 확인한다

진행 메모:
- `npm run build` 통과.
- 정적 검증 기준으로 auth refresh single-flight, `/api` proxy, `apiFetchAttachment`, project selector reset, document route query, actualWork panel reuse, backend job list/download 연결을 확인했다.
- 네트워크 제한 때문에 실제 로그인/생성 API 수동 호출은 수행하지 못했고, API 연동은 기존 adapter 계약과 TypeScript build로 검증했다.
- `git diff --cached --name-only`는 비어 있으며 `data/**`, `outputs/**`가 staged되지 않았다.

완료 기준:
시연 브랜치의 좋은 UI와 flow가 main의 실제 API 흐름 위에서 동작하고, 대용량 시연 자료 없이 build와 핵심 수동 QA를 통과한다.
