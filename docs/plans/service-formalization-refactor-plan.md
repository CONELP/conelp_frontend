# 정식 서비스 전환 및 Feature 리팩터링 Plan

정식 서비스 전환

이 문서는 `preview`, `demo`, `mock`, `sample`처럼 정식 서비스가 아닌 인상을 주는 표현과 구조를 걷어내고, 커진 feature를 관리 가능한 단위로 다시 나누기 위한 실행 계획이다. 현재 코드에는 `document-conversion-demo`, `/preview/*` route, 8,000줄대 view model, 3,000줄대 Vue component처럼 서비스 격상 전에 정리해야 할 구조적 부채가 함께 남아 있다.

`비정식 서비스 표현을 제거하고, 각 feature를 Feature-based Clean Architecture 기준의 작은 제품 모듈로 재구성한다.`

## 현재 기준점

- `src/features/desktop-schedule`: 약 22,635 lines, 23 files
- `src/features/document-conversion-demo`: 약 18,899 lines, 38 files
- `src/features/project-admin`: 약 6,034 lines, 37 files
- `src/features/system-admin`: 약 5,952 lines, 32 files
- `src/features/ai-agent`: 약 5,195 lines, 37 files
- `src/features/desktop-dashboard`: 약 1,956 lines, 6 files
- 최대 파일 후보는 `useDesktopScheduleViewModel.ts` 8,056 lines, `DailyReportEditorPanel.vue` 3,252 lines, `DesktopScheduleChartBody.vue` 2,615 lines, `desktop-schedule.service.ts` 2,445 lines, `DailyReportWritePage.vue` 2,182 lines이다.

## 고정 원칙

- 제품 route, feature folder, exported name, UI copy에서는 비정식 서비스 표현을 제거한다.
- 실제 제품 기능으로서의 문서 미리보기, 이미지 썸네일, 첨부파일 preview 같은 개념은 `viewer`, `thumbnail`, `attachmentUrl`, `documentResult`처럼 제품 의미가 드러나는 이름으로 바꾼다.
- 개발 도구 관례인 `vite preview` 같은 script 이름은 사용자 노출과 제품 구조에 영향이 없을 때만 예외로 둔다.
- feature 구조는 `docs/guidelines/dev_structure.md`의 `Feature-based Clean Architecture`를 기준으로 맞춘다.
- 백엔드 API endpoint, request payload, response DTO, backend enum 값은 기존 계약을 유지한다.
- 프론트 내부 feature 이름, route 이름, view model 이름, 화면 copy는 정식 서비스 용어로 바꾸되 backend API 계약 rename과 섞지 않는다.
- page는 화면 조립만 담당하고, 판단 로직은 `state`와 `services`로 옮긴다.
- 하나의 파일이 600 lines를 넘으면 다음 작업에서 분리 후보로 등록하고, 1,000 lines를 넘으면 해당 stage에서 분리 완료를 목표로 둔다.
- 리팩터링은 rename-only commit과 behavior-change commit을 섞지 않는다.
- route rename은 기존 사용자가 끊기지 않도록 최소 1단계 호환 redirect를 둔 뒤 제거한다.

## Stage 1. 제품 언어와 비정식 표현 인벤토리 고정 [completed]

목표:
서비스 격상 전에 제거할 표현과 유지할 제품 개념을 구분해 rename 범위를 잠근다.

커밋 메시지:
`docs: define production language cleanup scope`

결과물:
- `docs/plans/service-formalization-refactor-plan.md`
- 제품 언어 cleanup 체크리스트

체크포인트:
- [x] `demo`, `preview`, `mock`, `sample`, `prototype`, `beta`, `임시`, `데모`, `프리뷰`, `샘플` 사용처를 제품 노출 여부로 분류한다
- [x] `src/features/document-conversion-demo`를 정식 feature 이름으로 바꿀 후보를 확정한다
- [x] `/preview/*` route를 정식 route로 바꿀 mapping을 확정한다
- [x] `ResultPreviewPage`처럼 제품 미리보기 의미가 있는 이름은 `DocumentResultPage` 또는 `DocumentViewerPage` 중 하나로 정한다
- [x] `UploadSampleFile`처럼 demo residue가 남은 타입명을 실제 domain 이름으로 바꿀 mapping을 만든다
- [x] `ai-agent`의 attachment preview처럼 제품 기능인 preview 표현은 `thumbnail`, `attachmentUrl`, `messageSummary`로 바꿀지 결정한다
- [x] `package.json`의 `preview` script처럼 dev tooling 관례는 제품 cleanup 대상에서 제외할지 결정한다

완료 기준:
어떤 표현을 제거하고 어떤 표현을 제품 용어로 치환할지 파일 단위로 판단할 수 있다.

Stage 1 결과:

제품 정식화 대상:
- `src/features/document-conversion-demo`는 `src/features/document-conversion`으로 변경한다.
- `document-conversion-demo.types.ts`는 `document-conversion.types.ts`로 변경한다.
- `document-conversion-demo.seed.ts`는 실제 제품 catalog 성격이면 `document-catalog.ts`, fixture 성격이면 `document-conversion.fixtures.ts`로 분리한다.
- `useDocumentConversionDemoStore`는 `useDocumentConversionStore`로 변경한다.
- `useDocumentUploadDemoViewModel`은 `useDocumentUploadViewModel`로 변경한다.
- `useConversionLoadingDemoViewModel`은 `useDocumentGenerationViewModel`로 변경한다.
- `useGeneratedDocumentsDemoViewModel`은 `useGeneratedDocumentsViewModel`로 변경한다.
- `useResultPreviewDemoViewModel`은 `useDocumentResultViewModel`로 변경한다.
- `DocumentDemoCard`는 `DocumentCatalogCard`로 변경한다.
- `UploadSampleFile`은 실제 업로드 파일 상태를 뜻하면 `UploadFileItem`, fixture를 뜻하면 `UploadFixtureFile`로 분리한다.

Route 정식화 mapping:
- `/preview/documents`는 `/documents`로 변경한다.
- `/preview/upload`는 `/documents/upload`로 변경한다.
- `/preview/daily-report-write`는 `/documents/daily-report/write`로 변경한다.
- `/preview/upload-feedback`는 `/documents/upload/review`로 변경한다.
- `/preview/loading`은 `/documents/generation`으로 변경한다.
- `/preview/result`는 `/documents/result`로 변경한다.
- `/preview/material-registration-result`는 `/documents/material-registration/result`로 변경한다.
- `/preview/generated-documents`는 `/documents/generated`로 변경한다.
- 기존 `/preview/*` route는 Stage 2에서 redirect로 한 단계 보존한다.

제품 preview 용어 mapping:
- 결과 문서 화면의 `preview`는 사용자에게 문서를 보여 주는 실제 기능이므로 `result`, `viewer`, `documentViewer`로 바꾼다.
- 이미지 첨부의 `preview`는 `thumbnail`, `objectUrl`, `attachmentUrl`로 바꾼다.
- 메시지 본문 일부를 뜻하는 `previewMessageText`는 `getMessageSnippet`으로 바꾼다.
- drag/resize 중 임시 위치 계산을 뜻하는 `previewMoveSession`, `previewResizeSession`은 `draftMoveSession`, `draftResizeSession`으로 바꾼다.
- placeholder row나 synthetic row를 뜻하는 `mock`은 `placeholder` 또는 `synthetic`으로 바꾼다.

제품 copy cleanup 대상:
- dashboard navigation target의 `/preview/*` 값을 정식 route로 바꾼다.
- dashboard seed copy의 `내장 샘플` 표현은 실제 제품 문구로 바꾼다.
- CTA의 `데모 다운로드`, `다시 보기`처럼 시연 뉘앙스가 있는 문구는 실제 사용자 행동 기준으로 바꾼다.
- API 미지원 기능은 demo처럼 보이게 두지 않고 `준비 중`, `권한 없음`, `사용 불가` 중 하나로 명시한다.

정리 대상에서 제외:
- `package.json`의 `vite preview` script는 Vite tooling 관례이므로 유지한다.
- `docs/guidelines/plan_document.md`의 sample section은 문서 작성 예시이므로 제품 cleanup 대상에서 제외한다.
- 과거 plan 문서의 demo/mock 표현은 히스토리 문맥이면 유지하고, 현재 작업 경로를 가리키는 참조만 Stage 10에서 갱신한다.
- `docs/guidelines/dev_structure.md`의 mock data 설명은 static fixture/data 규칙 설명이므로 유지한다.

Stage 2 전 확인 필요:
- 정식 route namespace는 `/documents`로 확정한다.
- 정식 feature 이름은 `document-conversion`으로 확정한다.
- 작업일보는 일단 `/documents/daily-report/write`로 유지하고, Stage 5에서 크기와 책임을 본 뒤 `daily-report` feature로 분리할지 결정한다.
- backend API endpoint, request payload, response DTO, backend enum 값은 기존 계약을 유지한다.

## Stage 2. Route와 Feature identity 정식화 [completed]

목표:
사용자와 앱이 만나는 route, navigation, feature folder 이름에서 demo/preview 정체성을 제거한다.

커밋 메시지:
`refactor: formalize service routes and feature names`

결과물:
- 정식 route mapping
- 정식 feature folder mapping
- route compatibility redirect

체크포인트:
- [x] `src/app/router/index.ts`의 `/preview/documents`를 정식 문서 flow route로 교체한다
- [x] `src/app/router/index.ts`의 `/preview/upload`를 정식 업로드 route로 교체한다
- [x] `src/app/router/index.ts`의 `/preview/daily-report-write`를 정식 작업일보 작성 route로 교체한다
- [x] `src/app/router/index.ts`의 `/preview/upload-feedback`를 정식 검토 route로 교체한다
- [x] `src/app/router/index.ts`의 `/preview/loading`을 정식 생성 진행 route로 교체한다
- [x] `src/app/router/index.ts`의 `/preview/result`를 정식 결과 route로 교체한다
- [x] `src/app/router/index.ts`의 `/preview/generated-documents`를 정식 생성 문서 목록 route로 교체한다
- [x] `src/features/desktop-dashboard/data/desktop-dashboard.seed.ts`의 navigation target을 정식 route로 바꾼다
- [x] 기존 `/preview/*` route는 한 stage 동안 redirect로 보존한다
- [x] `src/features/document-conversion-demo` import alias를 정식 feature path로 옮긴다
- [x] `src/shared/ui/ProjectPicker.vue`의 demo store import를 정식 store import로 바꾼다

완료 기준:
앱의 주요 navigation과 route 이름에서 정식 서비스가 아닌 표현이 보이지 않고, 기존 route 진입은 redirect로 안전하게 흡수된다.

Stage 2 결과:
- `src/features/document-conversion-demo` folder를 `src/features/document-conversion`으로 이동했다.
- `@/features/document-conversion-demo` import path를 `@/features/document-conversion`으로 변경했다.
- `/documents`, `/documents/upload`, `/documents/daily-report/write`, `/documents/upload/review`, `/documents/generation`, `/documents/result`, `/documents/material-registration/result`, `/documents/generated`를 정식 route로 사용한다.
- 기존 `/preview/*` route는 정식 route로 redirect되도록 보존했다.
- dashboard quick link와 문서 flow 내부 route target을 정식 route로 변경했다.
- backend API endpoint, request payload, response DTO, backend enum 값은 변경하지 않았다.

## Stage 3. Feature 구조 계약 정리

목표:
각 feature가 같은 폴더 구조와 책임 분리를 따르도록, 리팩터링 중 반복해서 적용할 구조 계약을 고정한다.

커밋 메시지:
`docs: define feature refactor structure contract`

결과물:
- 이 plan 안의 feature 구조 계약
- 필요 시 `docs/guidelines/dev_structure.md` 업데이트

체크포인트:
- [ ] 모든 feature의 page entry를 `features/<feature>/ui/*Page.vue` 바로 아래로 맞춘다
- [ ] page 내부 조건문과 데이터 조립 로직을 `state/use*ViewModel.ts` 또는 작은 state composable로 옮긴다
- [ ] 순수 계산과 변환 로직을 `services/*.service.ts`로 옮긴다
- [ ] API 호출 파일은 이미 존재하는 feature만 `api/`를 유지하고 없는 feature에는 불필요하게 만들지 않는다
- [ ] feature 밖에 공개할 항목만 `index.ts`에서 export한다
- [ ] `ui/` 하위에는 `components/`만 두는 기존 규칙을 유지한다
- [ ] 단일 service가 1,000 lines를 넘는 feature는 하위 service 파일로 분리하는 예외 규칙을 문서화한다
- [ ] seed/mock fixture는 제품 데이터와 섞이지 않도록 `data/`에 남기거나 테스트 fixture로 이동하는 기준을 정한다

완료 기준:
이후 stage 구현자가 feature별로 같은 기준의 파일 위치, 책임, export 범위를 적용할 수 있다.

## Stage 4. Desktop Schedule 대형 view model 분해

목표:
`desktop-schedule`의 8,000줄대 view model과 2,000줄대 service/component를 기능 축별로 나눠 일정 관리 feature를 유지보수 가능한 크기로 만든다.

커밋 메시지:
`refactor: split desktop schedule view model`

결과물:
- `src/features/desktop-schedule/state/useDesktopScheduleViewModel.ts`
- `src/features/desktop-schedule/state/useDesktopScheduleData.ts`
- `src/features/desktop-schedule/state/useDesktopScheduleSelection.ts`
- `src/features/desktop-schedule/state/useDesktopScheduleEditing.ts`
- `src/features/desktop-schedule/state/useDesktopScheduleDragSession.ts`
- `src/features/desktop-schedule/state/useDesktopScheduleVersionHistory.ts`
- `src/features/desktop-schedule/services/*`
- `src/features/desktop-schedule/ui/components/*`

체크포인트:
- [ ] data loading과 project/version 초기화 로직을 `useDesktopScheduleData.ts`로 옮긴다
- [ ] 선택 상태와 focus 상태를 `useDesktopScheduleSelection.ts`로 옮긴다
- [ ] row/bar 수정 액션을 `useDesktopScheduleEditing.ts`로 옮긴다
- [ ] `previewMoveSession`과 `previewResizeSession` 계열을 `useDesktopScheduleDragSession.ts`로 옮기고 제품 용어로 rename한다
- [ ] schedule version/history 계산을 `useDesktopScheduleVersionHistory.ts`로 옮긴다
- [ ] `desktop-schedule.service.ts`의 row build, hierarchy, validation, mock id 생성 책임을 별도 service 파일로 나눈다
- [ ] `DesktopScheduleChartBody.vue`를 grid, lane, bar, dependency, overlay component로 나눈다
- [ ] `DesktopScheduleShell.vue`와 `DesktopScheduleRowPanel.vue`의 데이터 판단 로직을 view model로 밀어낸다
- [ ] `mock` kind가 실제 placeholder domain이면 `placeholder` 또는 `synthetic`으로 rename한다
- [ ] 분리 후 page와 shell은 조립 역할만 남긴다

완료 기준:
`desktop-schedule`의 핵심 파일이 기능별로 열리고, view model은 orchestration entry 역할만 하며, 1,000 lines 이상 파일이 더 이상 feature 중심 로직을 독점하지 않는다.

## Stage 5. Document Conversion 정식 feature 전환과 하위 flow 분리

목표:
`document-conversion-demo`를 정식 문서 서비스 feature로 바꾸고, 업로드, 생성 진행, 결과, 작업일보 작성 flow를 작은 단위로 분리한다.

커밋 메시지:
`refactor: promote document conversion to production feature`

결과물:
- `src/features/document-conversion`
- `src/features/document-conversion/ui/*`
- `src/features/document-conversion/state/*`
- `src/features/document-conversion/model/*`
- `src/features/document-conversion/services/*`
- 필요 시 `src/features/daily-report`

체크포인트:
- [ ] `document-conversion-demo` folder를 `document-conversion`으로 rename한다
- [ ] `document-conversion-demo.types.ts`를 정식 domain types 파일명으로 rename한다
- [ ] `document-conversion-demo.seed.ts`에서 제품 데이터와 fixture 데이터를 분리한다
- [ ] `useDocumentConversionDemoStore`를 정식 store 이름으로 rename한다
- [ ] `useDocumentUploadDemoViewModel`을 정식 upload view model 이름으로 rename한다
- [ ] `useConversionLoadingDemoViewModel`을 정식 generation progress view model 이름으로 rename한다
- [ ] `useGeneratedDocumentsDemoViewModel`을 정식 generated documents view model 이름으로 rename한다
- [ ] `useResultPreviewDemoViewModel`을 정식 document result view model 이름으로 rename한다
- [ ] `DailyReportWritePage.vue`에서 page layout, editor state, API save flow를 분리한다
- [ ] `DailyReportEditorPanel.vue`를 header, task list, photo section, metadata section, footer action component로 분리한다
- [ ] 작업일보가 독립 사용자 문제로 커졌다고 판단되면 `daily-report` feature로 분리한다
- [ ] `DocumentUploadPage.vue`에서 document type manifest, upload files, validation, API submit 로직을 분리한다
- [ ] `UploadFeedbackPage.vue`에서 분석 결과 표시와 생성 요청 액션을 분리한다
- [ ] `ResultPreviewPage.vue`를 정식 결과 viewer 또는 result page로 rename한다
- [ ] `previewImage`, `previewType`, `UploadSampleFile` 같은 이름을 실제 제품 의미로 바꾼다

완료 기준:
문서 기능은 demo feature가 아니라 정식 feature path와 정식 route에서 동작하며, 각 화면은 독립 flow 단위로 읽히고 수정할 수 있다.

## Stage 6. Desktop Dashboard와 공통 shell 정식화

목표:
dashboard가 preview route launcher가 아니라 정식 서비스 진입점으로 작동하게 만들고, 공통 shell에서 feature 의존을 줄인다.

커밋 메시지:
`refactor: connect dashboard to production service routes`

결과물:
- `src/features/desktop-dashboard/data/desktop-dashboard.seed.ts`
- `src/features/desktop-dashboard/ui/*`
- `src/app/ui/DesktopAppHeader.vue`
- `src/shared/ui/ProjectPicker.vue`

체크포인트:
- [ ] dashboard card의 `to` 값을 정식 route로 바꾼다
- [ ] dashboard copy에서 sample, demo, preview 인상을 주는 문구를 제거한다
- [ ] `ProjectPicker.vue`가 특정 demo store를 직접 import하지 않게 만든다
- [ ] project context는 app shell 또는 shared state 계약으로 주입한다
- [ ] `DesktopAppHeader.vue`는 현재 프로젝트 선택과 user action만 담당하게 한다
- [ ] dashboard seed가 실제 API 연동 전 임시 데이터라면 fixture 표시가 UI에 노출되지 않게 한다

완료 기준:
dashboard에서 진입하는 모든 주요 액션이 정식 서비스 route로 연결되고, shared shell이 특정 demo feature에 묶이지 않는다.

## Stage 7. Admin feature 구조 균일화

목표:
`project-admin`과 `system-admin`의 대형 area component를 같은 패턴으로 분리해 admin feature도 동일한 유지보수 규칙을 따른다.

커밋 메시지:
`refactor: normalize admin feature modules`

결과물:
- `src/features/project-admin/*`
- `src/features/system-admin/*`
- admin shared component 정리

체크포인트:
- [ ] `ComponentCodeArea.vue`를 search/filter, table, editor dialog, bulk action 영역으로 분리한다
- [ ] `HolidayCalendarArea.vue`를 calendar grid, holiday form, import/export action 영역으로 분리한다
- [ ] `MappingManagementArea.vue`를 mapping table, rule editor, sync action 영역으로 분리한다
- [ ] `ApiKeyManagementArea.vue`를 list, create form, revoke action 영역으로 분리한다
- [ ] admin API response type과 화면 출력 type을 분리한다
- [ ] `_shared`에 있는 항목 중 실제 여러 admin feature가 쓰는 것만 shared로 유지한다
- [ ] admin feature별 state, service, model 이름 규칙을 통일한다

완료 기준:
admin 화면들은 area component 하나에 기능이 몰리지 않고, feature별 하위 component와 state/service 책임이 같은 방식으로 나뉜다.

## Stage 8. AI Agent와 attachment/product preview 용어 정리

목표:
AI agent의 preview 표현을 비정식 서비스 의미와 분리하고, message, attachment, summary 책임을 작게 나눈다.

커밋 메시지:
`refactor: clarify ai agent preview naming`

결과물:
- `src/features/ai-agent/services/ai-agent.service.ts`
- `src/features/ai-agent/ui/components/MessageBubble.vue`
- `src/features/ai-agent/state/useAiAgentStore.ts`

체크포인트:
- [ ] `previewMessageText`를 `summarizeMessageText` 또는 `getMessageExcerpt`로 rename한다
- [ ] image/file preview URL은 `attachmentObjectUrl` 또는 `thumbnailUrl`로 rename한다
- [ ] `MessageBubble.vue`에서 attachment 표시 영역을 별도 component로 분리한다
- [ ] attachment object URL lifecycle을 composable로 분리한다
- [ ] message rendering과 file download 판단 로직을 분리한다
- [ ] user-facing copy에 demo/preview 인상이 있는지 확인한다

완료 기준:
AI agent feature에서 preview는 시연 의미가 아니라 실제 제품 UI의 thumbnail/viewer 개념으로 명확히 표현된다.

## Stage 9. Legacy와 demo-only asset 정리

목표:
정식 서비스 코드와 legacy/demo-only 코드가 섞이지 않게 분리하고, 남길 것과 제거할 것을 결정한다.

커밋 메시지:
`chore: isolate legacy and demo-only assets`

결과물:
- `src/legacy/*`
- demo-only seed와 fixture 정리 결과
- 삭제 또는 보존 목록

체크포인트:
- [ ] `src/legacy`에서 현재 정식 feature가 참조하는 코드가 있는지 확인한다
- [ ] 참조되지 않는 legacy code는 삭제 후보 또는 archive 후보로 분류한다
- [ ] demo-only output, static data, seed가 제품 build에 포함되는지 확인한다
- [ ] 실제 API fallback으로 필요한 fixture와 제거 가능한 mock 데이터를 분리한다
- [ ] 제품 화면에서 fixture data가 실제 데이터처럼 오해되지 않도록 loading, empty, unavailable 상태를 정의한다
- [ ] 오래된 plan 문서의 demo 전제는 완료 기록으로 두고 새 제품 plan에서 참조하지 않는다

완료 기준:
정식 서비스 build 경로에서 legacy/demo-only 자산이 우발적으로 사용되지 않는다고 판단할 수 있다.

## Stage 10. API, analytics, 문서 참조 rename migration

목표:
route와 feature 이름 변경 이후 API payload, analytics event, docs reference가 깨지지 않도록 참조를 한 번 더 정리한다.

커밋 메시지:
`refactor: migrate production service references`

결과물:
- analytics event source path 업데이트
- plan 문서 참조 업데이트
- API adapter naming 업데이트

체크포인트:
- [ ] `docs/plans/google-analytics-mvp-event-plan.md`의 `document-conversion-demo` 경로를 새 feature 경로로 바꾼다
- [ ] analytics event 이름에 demo/preview 전제가 숨어 있으면 제품 event 이름으로 바꾼다
- [ ] backend API integration plan의 mock/demo 표현은 현재 상태에 맞게 completed 또는 removed로 정리한다
- [ ] route name 변경이 analytics page tracking에 반영되는지 확인한다
- [ ] API service 이름이 제품 domain을 표현하는지 확인한다
- [ ] user-facing error와 empty copy에서 임시/데모 뉘앙스를 제거한다

완료 기준:
코드, analytics, docs가 같은 정식 feature 이름과 route 이름을 바라본다.

## Stage 11. 디자인/UX 서비스 격상 마감

목표:
이름만 바꾼 상태에서 끝나지 않고, 화면 경험도 정식 서비스처럼 신뢰감 있게 정돈한다.

커밋 메시지:
`style: harden production service experience`

결과물:
- 주요 feature 화면 copy
- empty/error/loading state
- responsive layout cleanup

체크포인트:
- [ ] 문서 서비스의 CTA를 `데모 다운로드`, `다시 보기` 같은 임시 표현에서 실제 작업 표현으로 바꾼다
- [ ] dashboard card title과 agenda copy에서 샘플/내장/시연 뉘앙스를 제거한다
- [ ] loading 화면은 fake progress가 아니라 실제 job state 또는 명시적 처리 상태를 보여 준다
- [ ] API 미지원 기능은 demo처럼 꾸미지 않고 disabled, 준비 중, 권한 없음 중 하나로 표현한다
- [ ] desktop과 compact 화면에서 정식 route 흐름이 모두 읽히는지 확인한다
- [ ] 디자인 톤은 `docs/guidelines/design.md`의 제품 톤을 따른다

완료 기준:
사용자가 화면과 문구만 보아도 이 앱을 시연물이 아니라 실제 서비스로 인식한다.

## Stage 12. QA와 수용 기준 검증

목표:
정식 서비스 rename과 feature 분해가 기능 회귀 없이 완료되었는지 검증하고, 정식 오픈에서 잠시 숨길 기능을 코드 삭제 없이 임시 비활성화한다.

커밋 메시지:
`test: verify production service refactor`

결과물:
- route smoke test 결과
- feature별 수용 기준 체크 결과
- 제거 대상 표현 잔여 목록
- `docs/dev/temporary_disabled_features.md`
- dashboard 임시 비활성화 주석 처리
- 공정표 내부 `공정표 불러오기` 임시 비활성화 주석 처리
- 공정표 내부 `AI 검증` 임시 비활성화 주석 처리

체크포인트:
- [ ] 정식 오픈에서 잠시 숨길 기능 목록을 `docs/dev/temporary_disabled_features.md`에 작성한다
- [ ] 임시 비활성화 문서에 대상 기능, 사용자 영향, 관련 파일, 다시 켜는 조건을 적는다
- [ ] dashboard 진입점은 코드를 삭제하지 않고 임시 주석 처리한다
- [ ] dashboard 임시 비활성화 위치에 문서 경로와 복구 조건을 주석으로 남긴다
- [ ] 공정표 내부 `공정표 불러오기` UI와 action 연결부는 코드를 삭제하지 않고 임시 주석 처리한다
- [ ] 공정표 내부 `공정표 불러오기` 비활성화 위치에 문서 경로와 복구 조건을 주석으로 남긴다
- [ ] 공정표 내부 `AI 검증` UI와 action 연결부는 코드를 삭제하지 않고 임시 주석 처리한다
- [ ] 공정표 내부 `AI 검증` 비활성화 위치에 문서 경로와 복구 조건을 주석으로 남긴다
- [ ] 임시 비활성화 기능의 route 또는 button이 사용자에게 노출되지 않는지 확인한다
- [ ] 임시 비활성화된 기능의 내부 코드, 타입, API adapter는 복구 가능하게 유지한다
- [ ] 제품 route에서 `/preview/*` 없이 주요 flow에 진입한다
- [ ] 기존 `/preview/*` route는 redirect 또는 제거 정책대로 동작한다
- [ ] user-facing UI copy에서 demo/preview/mock/sample 표현이 사라졌는지 확인한다
- [ ] feature folder와 exported name에서 demo identity가 사라졌는지 확인한다
- [ ] `desktop-schedule` 주요 작업인 조회, 선택, 수정, drag, resize, version 전환이 유지되는지 확인한다
- [ ] 문서 업로드, 분석, 생성, 결과, 생성 문서 목록, 작업일보 작성 flow가 유지되는지 확인한다
- [ ] dashboard card가 정식 route로 이동하는지 확인한다
- [ ] admin 주요 CRUD 화면이 분리 이후에도 동일하게 동작하는지 확인한다
- [ ] analytics event가 새 route와 feature path 기준으로 발행되는지 확인한다
- [ ] 1,000 lines 이상 파일이 남아 있으면 다음 plan의 명시적 refactor 대상으로 등록한다

완료 기준:
정식 서비스 표현, route, feature 구조, 주요 사용자 flow, analytics 참조가 서로 일관되고, dashboard, 공정표 불러오기, AI 검증은 코드 삭제 없이 문서화된 조건으로 임시 비활성화되어 있으며, 남은 대형 파일은 의도된 예외 또는 다음 작업으로 분명히 관리된다.
