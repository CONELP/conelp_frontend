# Google Analytics MVP 이벤트 부착 Plan

기능 또는 흐름 이름:
Google Analytics 기반 MVP action event 추적

이 문서는 현재 프로젝트에 최소한의 Google Analytics를 붙일 때, 어떤 사용자 행동을 먼저 볼지와 어떻게 검증할지를 고정하기 위한 실행용 plan 문서다.
목표는 세부 클릭 로그가 아니라 로그인 이후 핵심 기능이 실제로 쓰이는지, 그리고 주요 성공/실패 지점이 어디인지 빠르게 확인하는 것이다.

`GA4에 최소 action event를 붙여 핵심 사용 흐름의 진입, 완료, 실패를 검증한다.`

## MVP 부착 지점 목록

| 우선순위 | 영역 | 파일 후보 | 부착 지점 | 이벤트 |
| --- | --- | --- | --- | --- |
| P0 | 공통 route | `src/app/router/index.ts` | `router.afterEach`에서 인증 후 화면 진입 | `route_view` |
| P0 | 인증 | `src/features/auth/state/useAuthStore.ts` | `login`, `logout` 성공/실패 | `app_action` / `auth.login`, `auth.logout` |
| P0 | 프로젝트 | `src/shared/ui/ProjectPicker.vue` | `selectProject`에서 실제 프로젝트가 바뀔 때 | `app_action` / `project.select_project` |
| P0 | 대시보드 | `src/features/desktop-dashboard/ui/DesktopDashboardPage.vue` | 공정률 탭 변경, TODO 완료 토글 | `app_action` / `dashboard.select_progress_chart`, `dashboard.toggle_todo` |
| P0 | 공정표 버전 | `src/features/desktop-schedule/state/useDesktopScheduleViewModel.ts` | 버전 선택, 복제본 생성, 비교 열기, 기준 반영 모달 confirm, 기준 공정표 반영 | `app_action` / `schedule.select_version`, `schedule.create_draft_version`, `schedule.open_version_review`, `schedule.request_version_promotion`, `schedule.promote_version` |
| P0 | 공정표 편집 | `src/features/desktop-schedule/state/useDesktopScheduleViewModel.ts` | 작업 생성/삭제, 이동/리사이즈 완료, 작업 연결 생성/삭제, 마일스톤 생성/삭제, undo/redo | `app_action` / `schedule.create_item`, `schedule.delete_selection`, `schedule.move_item`, `schedule.resize_item`, `schedule.create_connection`, `schedule.remove_connection`, `schedule.create_milestone`, `schedule.remove_milestone`, `schedule.undo_history`, `schedule.redo_history` |
| P0 | 공정표 update | `src/features/desktop-schedule/state/useDesktopScheduleViewModel.ts` | 분류/공종/세부공종 추가, 공종/세부공종/작업/마일스톤 이름 변경, 색상 변경, 공정 분류 순서 변경 | `app_action` / `schedule.create_reference_draft`, `schedule.create_division`, `schedule.create_work_type`, `schedule.create_sub_work_type`, `schedule.rename_division`, `schedule.rename_work_type`, `schedule.rename_sub_work_type`, `schedule.rename_item`, `schedule.rename_milestone`, `schedule.change_color`, `schedule.reorder_reference` |
| P0 | 공정표 입출력 | `src/features/desktop-schedule/state/useDesktopScheduleViewModel.ts` | 엑셀 내보내기, 엑셀 불러오기 제출 | `app_action` / `schedule.export_excel`, `schedule.import_excel` |
| P0 | 공정표 보조 기능 | `src/features/desktop-schedule/ui/DesktopSchedulePage.vue`, `src/features/desktop-schedule/state/useDesktopScheduleViewModel.ts` | 작업일보 패널 토글, 작업일보 날짜 변경, AI 검증 토글/flag | `app_action` / `schedule.toggle_daily_report_panel`, `schedule.change_daily_report_date`, `schedule.toggle_ai_verification`, `schedule.toggle_ai_flag` |
| P0 | 문서 선택 | `src/features/document-conversion-demo/ui/DocumentSelectionPage.vue` | 문서 종류 선택 후 다음 route 이동 | `app_action` / `document.select_type` |
| P0 | 문서 업로드 | `src/features/document-conversion-demo/ui/DocumentUploadPage.vue` | 이미지 추가/삭제, 생성하기 클릭 | `app_action` / `document.add_upload_files`, `document.remove_upload_file`, `document.request_generation` |
| P0 | 문서 분석/생성 | `src/features/document-conversion-demo/state/useConversionLoadingDemoViewModel.ts`, `src/features/document-conversion-demo/ui/UploadFeedbackPage.vue` | 분석 성공/실패, 검토 후 생성 요청, 생성 성공/실패 | `app_action` / `document.analyze`, `document.submit_review`, `document.create_document` |
| P0 | 문서 결과 | `src/features/document-conversion-demo/ui/ResultPreviewPage.vue`, `src/features/document-conversion-demo/ui/GeneratedDocumentsPage.vue` | 결과 다운로드, 생성 문서 열기/다운로드 | `app_action` / `document.download_result`, `document.open_generated`, `document.download_generated` |
| P0 | 작업일보 작성 | `src/features/document-conversion-demo/ui/DailyReportWritePage.vue` | 작업 항목 생성/수정/삭제, 사진 추가, 저장 CTA 클릭 | `app_action` / `daily_report.create_task`, `daily_report.update_task`, `daily_report.delete_task`, `daily_report.add_image`, `daily_report.save_click` |
| P0 | AI 에이전트 | `src/features/ai-agent/state/useThreadListViewModel.ts`, `src/features/ai-agent/state/useChatViewModel.ts` | thread 생성/삭제, 이름 변경, message 전송, 참여자 초대, 수동 재연결 | `app_action` / `ai_agent.create_thread`, `ai_agent.delete_thread`, `ai_agent.rename_thread`, `ai_agent.send_message`, `ai_agent.invite_user`, `ai_agent.manual_reconnect` |
| P0 | Admin 기존 호출 | `src/shared/analytics/analytics-stub.ts`, `src/features/project-admin/**`, `src/features/system-admin/**` | 이미 들어간 `analyticsClient.trackAction` 호출을 실제 GA adapter로 연결 | 기존 `admin_*` action |
| P1 | 전역 오류 | `src/shared/network/axios-client.ts`, `src/shared/network/api-client.ts` | API 4xx/5xx status group만 집계 | `app_error` |

## 고정 전제

- 이번 MVP는 GA4 action event 중심이다.
- click heatmap, 세부 hover, 텍스트 입력 내용, 파일명, 채팅 본문, 사용자 이름, 이메일은 보내지 않는다.
- 기존 `src/shared/analytics/analytics-stub.ts`를 버리지 않고, 동일 API를 실제 GA adapter로 확장한다.
- `trackAction(feature, action, result, meta)`는 GA4 event name을 `app_action`으로 보내고 `feature`, `action`, `result`를 parameter로 담는다.
- `trackRouteView`는 화면 진입 baseline 확인용으로만 사용하고, 사용량 판단의 핵심은 `app_action`으로 둔다.
- 로그인 이후 analytics는 auth `user.id`를 GA `user_id`와 event parameter `user_id`로 매핑한다.
- `VITE_GA_MEASUREMENT_ID`가 없으면 analytics는 no-op으로 동작해야 한다.
- 개발 검증을 위해 dev build에서는 console mirror와 GA `debug_mode`를 자동으로 켠다.
- 운영에서 임시 확인이 필요할 때만 브라우저 콘솔에서 `localStorage.setItem("conelp.analytics.debug", "true")`를 실행해 해당 브라우저에서만 debug mirror를 켠다.

## 이벤트 파라미터 계약

공통 파라미터:
- `feature`: `auth`, `project`, `dashboard`, `schedule`, `document`, `daily_report`, `ai_agent`, `admin_document_setting`처럼 기능 단위로 고정한다
- `action`: `select_project`, `create_item`, `send_message`처럼 동사+대상으로 쓴다
- `result`: `success`, `fail`, `attempt` 중 하나를 쓴다
- `user_id`: 로그인한 사용자의 내부 auth `user.id`만 보낸다
- `route_name`: 현재 route name이 있을 때만 보낸다
- `document_type`, `schedule_range`, `has_files`, `file_count`, `mention_count`, `status_group`처럼 원문을 노출하지 않는 작은 값만 meta에 둔다

금지 파라미터:
- 이메일, 사용자명, 회사명, 프로젝트명
- 파일명, 다운로드 URL, object key
- 채팅 본문, thread title, 문서 OCR 텍스트
- raw access token, API key, 내부 에러 stack

## 환경값 계약

- `VITE_GA_MEASUREMENT_ID`: GA4 Web data stream의 Measurement ID를 넣는다. 값이 비어 있으면 analytics는 no-op으로 둔다.
- local 개발에서는 `.env.example`을 기준으로 `.env.local`에 값을 둔다.
- production 배포에서는 hosting provider의 environment variable로 같은 값을 주입한다.
- analytics debug는 env로 관리하지 않는다. dev build에서는 자동으로 켜지고, 운영 임시 디버깅은 `conelp.analytics.debug` localStorage flag로만 켠다.

## GA Measurement ID 준비 절차

- Google Analytics 권한은 대상 property 기준 `Editor` 이상이어야 한다.
- 새로 만드는 경우 [Google Analytics](https://analytics.google.com/)에서 account/property를 만든 뒤 `Admin -> Data streams -> Add stream -> Web`을 선택한다.
- Web stream 생성 화면에서 production site URL과 stream name을 입력하고 stream을 만든다.
- 이미 Web stream이 있으면 `Admin -> Data streams -> Web`에서 대상 stream을 연다.
- Stream details 첫 줄의 Measurement ID를 복사한다. GA4 Measurement ID는 보통 `G-`로 시작한다.
- 복사한 값을 local `.env.local`과 배포 환경의 `VITE_GA_MEASUREMENT_ID`에 넣는다.

## Stage 1. 이벤트 계약과 환경값 고정 [completed]

목표:
GA에 어떤 이름과 어떤 parameter로 보낼지 먼저 고정해서, 기능별 구현자가 임의 이벤트를 늘리지 않게 한다.

커밋 메시지:
`docs: define google analytics mvp event contract`

결과물:
- `docs/plans/google-analytics-mvp-event-plan.md`
- `src/env.d.ts`
- `.env.example`

체크포인트:
- [x] `app_action`, `route_view`, `app_error` 세 event name만 MVP 기본 이벤트로 고정한다
- [x] `feature`, `action`, `result` 공통 parameter를 고정한다
- [x] PII와 raw business data 금지 목록을 구현 전 체크리스트로 둔다
- [x] `VITE_GA_MEASUREMENT_ID`가 없으면 no-op인 동작을 명시한다
- [x] 개발 중 console mirror와 GA `debug_mode`는 env 없이 dev build에서 자동으로 켠다고 정의한다
- [x] `src/env.d.ts`에 analytics 환경값 타입을 추가한다
- [x] `.env.example`에 analytics 환경값 자리를 추가한다

완료 기준:
구현자가 새 이벤트를 추가하지 않고도 이 문서의 부착 지점과 parameter만 보고 MVP analytics 작업을 시작할 수 있다.

## Stage 2. GA adapter와 route view 연결 [completed]

목표:
현재 no-op analytics stub을 실제 GA4 전송 계층으로 바꾸고, route 진입 baseline을 자동 수집한다.

커밋 메시지:
`feat: add google analytics adapter`

결과물:
- `src/shared/analytics/analytics-stub.ts` 또는 새 `src/shared/analytics/analytics.ts`
- `src/app/router/index.ts`
- `src/env.d.ts`

체크포인트:
- [x] GA script를 `VITE_GA_MEASUREMENT_ID`가 있을 때만 lazy load한다
- [x] `analyticsClient.trackAction`을 `gtag("event", "app_action", params)`로 연결한다
- [x] `analyticsClient.trackRouteView`를 `router.afterEach`에서 호출한다
- [x] `analyticsClient.trackError`를 `app_error` event로 연결한다
- [x] GA가 차단되거나 로드 실패해도 앱 화면이 깨지지 않게 한다
- [x] dev build일 때 전송 payload를 console에 남기고 GA `debug_mode`를 붙인다
- [x] 운영 임시 디버깅은 env가 아니라 `conelp.analytics.debug` localStorage flag로만 켠다

완료 기준:
dev 환경에서 route 이동과 수동 `trackAction` 호출이 console mirror에 찍히고, measurement id가 없을 때는 GA 전송 없이 앱이 정상 동작한다.

## Stage 3. P0 action event 부착 [completed]

목표:
핵심 기능별로 사용자가 의미 있는 행동을 시작했는지, 성공했는지, 실패했는지만 얇게 기록한다.

커밋 메시지:
`feat: track mvp product analytics events`

결과물:
- 인증/프로젝트 action event
- 대시보드 action event
- 공정표 action event
- 문서 생성 action event
- AI 에이전트 action event
- 기존 admin action event의 GA 연결

체크포인트:
- [x] `useAuthStore.login/logout`에 `success/fail` event를 붙인다
- [x] `ProjectPicker.selectProject`에 프로젝트 전환 event를 붙인다
- [x] `DesktopDashboardPage`에 공정률 탭 변경과 TODO 토글 event를 붙인다
- [x] `useDesktopScheduleViewModel`의 async mutation 함수에 성공/실패 event를 붙인다
- [x] 기준 공정표 반영 요청 event는 모달 confirm 시점에만 붙인다
- [x] 공정표 이동/리사이즈처럼 pointer interaction은 `end*Session` 완료 시점에만 event를 보낸다
- [x] 공정표 undo/redo 완료 시점에 성공/실패 event를 붙인다
- [x] 공정표 우측 작업일보 날짜 변경 event를 붙인다
- [x] 공정표 분류/공종/세부공종 추가 event를 붙인다
- [x] 공정표 이름 변경, 색상 변경, 공정 분류 순서 변경 같은 update event를 붙인다
- [x] 문서 선택, 업로드 추가, 생성 요청, 분석 성공/실패, 생성 성공/실패, 다운로드 event를 붙인다
- [x] 작업일보 작성에서 작업 항목 생성/수정/삭제, 사진 추가, 저장 CTA event를 붙인다
- [x] AI thread 생성/삭제, 이름 변경, message 전송, 초대, 수동 재연결 event를 붙인다
- [x] 기존 admin `trackAction` 호출이 GA adapter를 통해 같은 `app_action`으로 전송되는지 확인한다
- [x] 실패 event에는 `status_group` 또는 `error_kind`처럼 민감하지 않은 분류만 담는다

완료 기준:
로그인 후 대시보드, 공정표, 문서 생성, AI 에이전트의 대표 행동을 한 번씩 수행하면 각 기능별 `app_action`이 최소 1개 이상 남는다.

## Stage 4. MVP 이벤트 검증 [completed]

목표:
실제 분석 화면에 들어가기 전에 event 중복, 누락, PII 포함 여부를 수동 QA로 닫는다.

커밋 메시지:
`test: verify mvp analytics events`

결과물:
- 수동 QA 체크리스트
- GA DebugView 확인 기록

체크포인트:
- [x] `npm run build`로 타입과 번들 오류가 없는지 확인한다
- [x] analytics 호출 인자에 민감 정보 source가 없는지 확인한다
- [x] 로그인 이후 event payload와 GA config에 내부 `user_id`가 매핑되는지 확인한다
- [x] logout 이후 analytics `user_id`가 clear되는지 확인한다
- [x] dev server에서 route 이동과 action payload가 console mirror에 찍히는지 확인한다
- [x] 운영 임시 확인이 필요하면 브라우저 콘솔에서 `localStorage.setItem("conelp.analytics.debug", "true")` 후 payload mirror를 확인하고, 끝난 뒤 `localStorage.removeItem("conelp.analytics.debug")`를 실행한다
- [x] 로그인 성공/실패 event가 각각 한 번만 찍히는지 확인한다
- [x] 프로젝트 전환 후 reload 전 event가 전송되는지 확인한다
- [x] 공정표에서 복제본 생성, 작업 생성, 엑셀 내보내기, 기준 반영 confirm/promote event를 확인한다
- [x] 공정표에서 분류/공종/세부공종 추가, 공종/작업/마일스톤 이름 변경, 색상 변경, undo/redo event를 확인한다
- [x] 공정표 우측 작업일보 영역에서 날짜 변경 event를 확인한다
- [x] 문서 생성 흐름에서 선택 -> 업로드 -> 분석 -> 검토 제출 -> 생성 -> 다운로드 event를 확인한다
- [x] 작업일보 작성에서 작업 항목 생성/수정/삭제와 사진 추가 event를 확인한다
- [x] AI 에이전트에서 thread 생성, message 전송, 초대 event를 확인한다
- [x] event parameter에 파일명, 채팅 본문, 사용자명, 프로젝트명이 없는지 확인한다
- [x] GA DebugView에서 `app_action`, `route_view`, `app_error`가 들어오는지 확인한다

완료 기준:
DebugView와 console mirror에서 MVP event가 누락 없이 보이고, 민감 정보가 들어가지 않으며, 같은 사용자 행동에 중복 event가 발생하지 않는다.

## Stage 5. 운영 확인과 후속 범위 정리

목표:
MVP 부착 후 1차 데이터를 보고, 더 붙일 이벤트와 제거할 이벤트를 분리한다.

커밋 메시지:
`chore: tune analytics event coverage`

결과물:
- GA custom dimension 등록 목록
- 유지/제거/후속 이벤트 목록
- funnel 초안

체크포인트:
- [ ] GA4 custom dimension에 `feature`, `action`, `result`, `route_name`, `document_type`, `schedule_range`, `status_group`를 등록한다
- [ ] 문서 생성 funnel을 `select_type -> request_generation -> analyze success -> submit_review -> create_document success -> download_result`로 본다
- [ ] 공정표 funnel을 `select_version -> create_draft_version -> create_item/edit -> open_version_review -> promote_version`으로 본다
- [ ] AI funnel을 `create_thread -> send_message -> invite_user`로 본다
- [ ] 작업일보 funnel을 `create_task/update_task -> add_image -> save_click`으로 본다
- [ ] 사용량이 낮거나 해석이 어려운 P0 event를 제거 후보로 표시한다
- [ ] P1 전역 API 오류 추적을 붙일지 결정한다

완료 기준:
운영자가 GA에서 기능별 사용량과 대표 funnel을 볼 수 있고, 다음 analytics iteration에서 추가할 항목이 P1 목록으로 정리되어 있다.
