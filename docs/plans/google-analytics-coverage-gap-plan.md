# Google Analytics Coverage Gap Plan

작성일: 2026-06-08

기준 문서:
- `docs/plans/google-analytics-mvp-event-plan.md`

목표:
현재 코드에 실제로 부착된 Google Analytics 이벤트를 기존 MVP 이벤트 계획과 비교하고, 추가 작업이 필요한 부분을 실행 가능한 후속 계획으로 정리한다.

## 결론

현재 상태는 `P0 MVP 핵심 흐름은 대부분 부착됨`에 가깝다.
다만 "모든 기능" 기준으로는 아직 완료가 아니다.

추가 작업이 필요한 핵심 영역:
- `P1` 전역 API 오류 이벤트 `app_error`가 아직 공통 network layer에 연결되어 있지 않다.
- 문서 생성 결과 열기 이벤트 `document.open_generated`가 계획에는 있지만 실제 코드에는 없다.
- 문서 분석 이벤트 `document.analyze`는 실패 validation만 있고 성공 이벤트가 없다. 현재 비동기 백그라운드 생성 흐름에서는 `create_document`가 주 성공 지점이므로, `analyze success`를 유지할지 제거할지 결정해야 한다.
- 운영 분석용 GA4 custom dimension, funnel, BigQuery view/query가 아직 정리되어 있지 않다.
- Admin 전체 기능 기준으로 보면 일부 관리 화면에는 action event가 없다.

## 확인 방법

코드 검색:
- `rg -n "analyticsClient\\.trackAction|trackScheduleAction\\(|trackScheduleMutationResult\\(|trackCreateReferenceDraft\\(" src`
- `rg -n "trackRouteView|trackError|setUserId|trackAction\\(" src`
- `rg -n "trackError\\(|app_error" src/shared/network src/features`

확인 결과:
- `analyticsClient.trackAction` 직접 호출과 helper 호출은 다수 존재한다.
- `router.afterEach`에서 `trackRouteView`가 호출된다.
- `analyticsClient.trackError` 구현은 있지만, `src/shared/network/axios-client.ts`와 `src/shared/network/api-client.ts`에서 호출되지 않는다.

## 기존 MVP 계획 대비 현재 부착 상태

| 영역 | 계획 이벤트 | 현재 상태 | 근거 파일 | 추가 작업 |
| --- | --- | --- | --- | --- |
| 공통 route | `route_view` | 부착됨 | `src/app/router/index.ts` | GA DebugView/BigQuery에서 route_name 확인 |
| 인증 | `auth.login`, `auth.logout` | 부착됨 | `src/features/auth/state/useAuthStore.ts` | 없음. `auth.signup`도 추가로 부착되어 있음 |
| 프로젝트 | `project.select_project` | 부착됨 | `src/shared/ui/ProjectPicker.vue` | reload 직전 전송 안정성 운영 확인 |
| 대시보드 | `dashboard.select_progress_chart`, `dashboard.toggle_todo` | 부착됨 | `src/features/desktop-dashboard/ui/DesktopDashboardPage.vue` | 없음 |
| 공정표 버전 | `select_version`, `create_draft_version`, `open_version_review`, `request_version_promotion`, `promote_version` | 부착됨 | `src/features/desktop-schedule/state/workflows/*Version*` | 없음 |
| 공정표 편집 | `create_item`, `delete_selection`, `move_item`, `resize_item`, `create_connection`, `remove_connection`, `create_milestone`, `remove_milestone`, `undo_history`, `redo_history` | 부착됨 | `src/features/desktop-schedule/state/workflows/*`, `src/features/desktop-schedule/state/interactions/*` | 없음 |
| 공정표 update | `create_reference_draft`, `create_division`, `create_work_type`, `create_sub_work_type`, `rename_*`, `change_color`, `reorder_reference` | 부착됨 | `src/features/desktop-schedule/state/workflows/useDesktopScheduleReferenceMutations.ts`, `useDesktopScheduleItemMilestoneWorkflow.ts` | 없음 |
| 공정표 입출력 | `export_excel`, `import_excel` | 부착됨 | `src/features/desktop-schedule/state/workflows/useDesktopScheduleImportExport.ts` | 없음 |
| 공정표 보조 기능 | `toggle_daily_report_panel`, `change_daily_report_date`, `toggle_ai_verification`, `toggle_ai_flag` | 부착됨 | `src/features/desktop-schedule/ui/DesktopSchedulePage.vue`, `src/features/desktop-schedule/state/workflows/useDesktopScheduleAiVerification.ts` | 없음 |
| 문서 선택 | `document.select_type` | 부착됨 | `src/features/document-conversion/ui/DocumentSelectionPage.vue` | 기존 계획의 경로 `document-conversion-demo`를 현행 `document-conversion`으로 정정 필요 |
| 문서 업로드 | `add_upload_files`, `remove_upload_file`, `request_generation` | 부착됨 | `src/features/document-conversion/ui/DocumentUploadPage.vue` | 없음. `rotate_upload_file`도 추가 부착됨 |
| 문서 분석/생성 | `analyze`, `submit_review`, `create_document` | 부분 부착 | `src/features/document-conversion/state/useConversionLoadingDemoViewModel.ts`, `src/features/document-conversion/ui/UploadFeedbackPage.vue` | `analyze success` 의미 결정. 유지한다면 성공 지점 추가 |
| 문서 결과 | `download_result`, `open_generated`, `download_generated` | 부분 부착 | `ResultPreviewPage.vue`, `GeneratedDocumentsPage.vue`, `DocumentSelectionPage.vue`, `BackgroundDocumentJobCenter.vue` | `open_generated` 추가 |
| 작업일보 작성 | `create_task`, `update_task`, `delete_task`, `add_image`, `save_click` | 부착됨 | `src/features/document-conversion/ui/DailyReportWritePage.vue` | 없음 |
| AI 에이전트 | `create_thread`, `delete_thread`, `rename_thread`, `send_message`, `invite_user`, `manual_reconnect` | 부착됨 | `src/features/ai-agent/state/*`, `src/features/ai-agent/ui/AiAgentChatPage.vue` | 없음 |
| Admin 기존 호출 | 기존 `admin_*` action | 부분 부착 | `project-admin/document-setting`, `project-admin/master-data`, `project-admin/holiday`, `system-admin/state/standard` | 아래 Admin gap 참조 |
| 전역 오류 P1 | `app_error` | 미부착 | `src/shared/network/axios-client.ts`, `src/shared/network/api-client.ts` | `trackError` 호출 추가 |

## 계획 밖에 이미 추가된 이벤트

기존 MVP 문서에는 없지만 현재 코드에 있는 이벤트:
- `auth.signup`
- `schedule.close_daily_report_panel`
- `schedule.toggle_mobile_left_panel`
- `schedule.run_ai_verification`
- `schedule.cut_items`, `schedule.copy_items`, `schedule.paste_items`
- `schedule.rename_version`, `schedule.delete_version`
- `document.select_period`
- `document.rotate_upload_file`
- `document.delete_generated`
- `daily_report_write.toggle_mobile_left_panel`
- `daily_report_write.toggle_mobile_editor_panel`
- `daily_report_panel.open_resource_row_menu`
- `daily_report_panel.edit_resource_row`
- `daily_report_panel.save_work_content`
- `daily_report_panel.delete_work_content`
- `daily_report_panel.add_work_type`
- `daily_report_panel.remove_work_type`
- `daily_report_panel.enter_work_content`
- `daily_report_panel.select_work_type`
- `daily_report_panel.input_resource_quantity`
- `daily_report_panel.input_resource_field`
- `daily_report_panel.toggle_resource_inclusion`
- `daily_report_panel.add_resource_row`
- `daily_report_panel.create_dr_document`
- `daily_report_panel.save_panel`
- `admin_holiday.toggle_holiday`
- `admin_holiday.apply_holiday_rule`

후속 작업:
- 위 이벤트들을 유지할지, GA custom dimension/funnel에서 제외할지 결정한다.
- 유지한다면 기존 계획 문서나 운영 이벤트 카탈로그에 정식 등록한다.

## Admin gap

현재 Admin 이벤트는 "기존 호출" 범위로 일부만 붙어 있다.

부착 확인:
- `src/features/project-admin/document-setting/state/useDocumentSetting.ts`
- `src/features/project-admin/master-data/state/useComponentCode.ts`
- `src/features/project-admin/master-data/state/useLocationMaster.ts`
- `src/features/project-admin/master-data/state/useMaterialMaster.ts`
- `src/features/project-admin/holiday/state/useHolidayManagement.ts`
- `src/features/system-admin/state/standard/*`

미부착 또는 추가 검토 필요:
- `src/features/system-admin/state/useProjectManagement.ts`
  - 후보: `system_admin.create_project`, `system_admin.update_project`, `system_admin.delete_project`
- `src/features/system-admin/state/useCompanyManagement.ts`
  - 후보: `system_admin.create_company`, `system_admin.update_company`, `system_admin.delete_company`
- `src/features/system-admin/state/useUserManagement.ts`
  - 후보: `system_admin.update_user`
- `src/features/system-admin/state/useRoleManagement.ts`
  - 후보: `system_admin.create_system_role`, `system_admin.create_company_role`
- `src/features/system-admin/state/useMappingManagement.ts`
  - 후보: `system_admin.create_company_to_project`, `system_admin.update_company_to_project`, `system_admin.delete_company_to_project`, `system_admin.create_user_to_project`, `system_admin.update_user_to_project`, `system_admin.delete_user_to_project`
- `src/features/system-admin/state/useApiKeyManagement.ts`
  - 후보: `admin_api_key.create_api_key`, `admin_api_key.delete_api_key`
  - 금지: plaintext key, key prefix, key suffix, 회사명, 프로젝트명
  - 허용 후보 meta: `scope`, `has_expiry`, `has_allowed_ips`, `has_rate_limit`
- `src/features/project-admin/bulk-deployment/state/useBulkDeployment.ts`
  - 후보: `admin_bulk_deployment.submit_attendance`, `admin_bulk_deployment.submit_equipment`
  - 허용 후보 meta: `entry_count`, `date_range_days`
- `src/features/project-admin/homepage-setting/state/useHomepageSetting.ts`
  - 후보: `admin_homepage_setting.save`
  - 금지: id, password, url, safetyCheck 원문
  - 허용 후보 meta: `has_url`, `has_safety_check`, `tomorrow_work_mode`
- `src/features/project-admin/schedule-validation/state/useScheduleValidationRule.ts`
  - 후보: `admin_schedule_validation.select_work_type`, `admin_schedule_validation.save_rule`
  - 금지: 규칙 본문
  - 허용 후보 meta: `has_site_rule`, `has_company_rule`, `is_update`

## 추가 구현 계획

### Stage A. 운영 분석 기반 정리

목표:
이미 전송되는 이벤트가 GA/BigQuery에서 분석 가능한 형태가 되도록 운영 설정을 닫는다.

작업:
- GA4 custom dimension 등록
  - `feature`
  - `action`
  - `result`
  - `route_name`
  - `document_type`
  - `schedule_range`
  - `status_group`
  - `error_kind`
  - `source`
  - `mode`
- BigQuery에서 `app_action`, `route_view`, `app_error`를 쉽게 보는 view 또는 saved query 작성
- 기존 MVP 문서의 Stage 5 funnel을 실제 이벤트명 기준으로 검증
- 계획 밖에 이미 생긴 이벤트를 "유지/제거/운영 제외"로 분류

완료 기준:
GA UI와 BigQuery에서 기능별 action count, success/fail count, route 진입, 주요 funnel이 바로 조회된다.

### Stage B. 누락 이벤트 보강

목표:
기존 MVP 계획 대비 실제 누락된 이벤트를 코드에 붙인다.

작업:
- `app_error` 전역 추적 추가
  - `src/shared/network/axios-client.ts`
  - `src/shared/network/api-client.ts`
  - `status_group`만 기본 수집: `4xx`, `5xx`, `network`, `unknown`
  - URL full path, request body, response body, token, raw stack은 보내지 않는다.
- `document.open_generated` 추가
  - `src/features/document-conversion/ui/components/BackgroundDocumentJobCenter.vue`
  - `src/features/document-conversion/ui/components/BackgroundDocumentJobToast.vue`
  - meta 후보: `document_type`, `source`
- `document.analyze success` 처리 결정
  - 유지: 분석 결과가 준비되어 review/generation 다음 단계로 넘어가는 지점에 `success`를 붙인다.
  - 제거: 현재 구조상 분석과 생성이 백그라운드 `create_document`로 합쳐진 문서 타입은 funnel에서 `analyze`를 제외한다.
- Admin gap 이벤트 추가
  - 우선순위: API Key, bulk deployment, schedule validation, system admin global CRUD, homepage setting

완료 기준:
기존 MVP 계획에 있는 이벤트 중 "부분 부착/미부착" 항목이 사라진다.

### Stage C. QA

목표:
중복 전송, PII, 누락을 수동 QA로 닫는다.

체크리스트:
- `npm run build`
- dev build console mirror에서 action payload 확인
- GA DebugView에서 `app_action`, `route_view`, `app_error` 확인
- BigQuery `events_*`에서 `feature`, `action`, `result` parameter 확인
- 금지 정보 확인
  - 이메일
  - 사용자명
  - 회사명
  - 프로젝트명
  - API key 또는 key prefix/suffix
  - 파일명
  - 다운로드 URL
  - 채팅 본문
  - 문서 OCR 텍스트
  - 규칙 본문
  - raw error stack

## BigQuery에 2일치 데이터만 있는 이유

현재 내가 로컬에서 BigQuery project/dataset에 접근할 수 없기 때문에, 실제 export job 로그를 직접 확인하지는 못했다.
다만 Google 공식 문서 기준으로는 아래가 가장 가능성이 높다.

가장 유력한 원인:
- GA4 BigQuery Export는 과거 데이터를 소급 적재하지 않는다.
- 링크 완료 후 데이터가 BigQuery로 흐르기 시작하며, daily export는 전날 데이터를 하루 1개 `events_YYYYMMDD` 테이블로 내보낸다.
- 따라서 BigQuery link를 만든 지 약 2일밖에 지나지 않았다면 `events_YYYYMMDD`가 2일치만 보이는 것은 정상이다.

공식 문서 근거:
- Google Analytics BigQuery Export 문서는 GA4 export의 general backfill을 `no backfill`로 설명한다.
- Set up BigQuery Export 문서는 링크 완료 후 24시간 내 데이터가 흐르기 시작하고, daily export는 전날 데이터를 하루 1개 파일/테이블로 export한다고 설명한다.
- BigQuery Export schema 문서는 daily export가 켜져 있으면 `events_YYYYMMDD`, streaming export가 켜져 있으면 `events_intraday_YYYYMMDD`가 만들어진다고 설명한다.

확인할 SQL:

```sql
SELECT
  table_name,
  creation_time
FROM `PROJECT_ID.analytics_PROPERTY_ID.INFORMATION_SCHEMA.TABLES`
WHERE table_name LIKE 'events%'
ORDER BY table_name;
```

```sql
SELECT
  _TABLE_SUFFIX AS table_suffix,
  COUNT(*) AS row_count,
  MIN(event_timestamp) AS min_event_timestamp,
  MAX(event_timestamp) AS max_event_timestamp
FROM `PROJECT_ID.analytics_PROPERTY_ID.events_*`
GROUP BY table_suffix
ORDER BY table_suffix;
```

```sql
SELECT
  event_name,
  COUNT(*) AS event_count
FROM `PROJECT_ID.analytics_PROPERTY_ID.events_*`
WHERE event_name IN ('app_action', 'route_view', 'app_error')
GROUP BY event_name
ORDER BY event_count DESC;
```

링크 생성일 확인:
- GA Admin -> Product Links -> BigQuery Links -> 대상 link
- BigQuery dataset `analytics_PROPERTY_ID`의 creation time
- `events_*` table 중 가장 이른 suffix

2일치만 있는 것이 정상인 경우:
- BigQuery link 생성일이 2026-06-06 또는 2026-06-07 전후다.
- daily export만 켜져 있고 streaming export는 꺼져 있다.
- 현재 날짜 데이터는 아직 `events_YYYYMMDD`로 확정되지 않았거나, streaming 미사용으로 `events_intraday_YYYYMMDD`가 없다.

2일치만 있는 것이 비정상인 경우:
- BigQuery link를 만든 지 3일 이상 지났는데도 새 daily table이 더 이상 생기지 않는다.
- 이 경우 확인할 것:
  - export frequency에서 Daily가 켜져 있는지
  - Data streams/events filter에서 웹 스트림이나 `app_action` 등이 제외되지 않았는지
  - `firebase-measurement@system.gserviceaccount.com` service account 권한이 유지되어 있는지
  - BigQuery billing 또는 sandbox quota 문제가 없는지
  - Standard property의 daily export 1M events limit 초과 알림이 있었는지
  - GA property timezone 변경이 있었는지
  - BigQuery link를 삭제/재생성하거나 region을 바꾸면서 gap이 생겼는지

주의:
- GA4 native BigQuery Export만으로는 link 생성 전 raw event history를 backfill할 수 없다.
- 과거 기간이 꼭 필요하면 GA UI/API의 집계 데이터 export, 별도 ETL, 또는 앞으로의 원천 로그 수집을 검토해야 한다. 이 경우 GA4 BigQuery 원본 raw event와 동일한 품질의 과거 raw event는 기대하지 않는 편이 안전하다.

## 우선순위

1. `app_error` 공통 network layer 연결
2. `document.open_generated` 추가
3. `document.analyze success` 유지 여부 결정 및 funnel 수정
4. GA4 custom dimension 등록과 BigQuery 기본 query/view 작성
5. Admin gap 이벤트 부착
6. 계획 밖 기존 이벤트를 공식 이벤트 카탈로그로 정리

