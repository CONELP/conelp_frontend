# Backend Source Based API Integration Plan

기능 또는 흐름 이름:
Backend source guide 추출 -> API 계약 검증 -> 기존 frontend 코드 연동

이 문서는 `dev.conelp.kr`의 API guide 호출이 현재 `HTTP 403`으로 막혀 있는 상태에서, 로컬에 들어온 `backend/constructionHelperBackendMain` 코드와 guide 파일을 기준으로 frontend 연동을 진행하기 위해 만든 실행용 plan 문서다.
핵심은 backend source 안의 `docs/GUIDE/API_ENDPOINTS.md`와 `docs/GUIDE/**/*.json`을 반복 가능한 산출물로 추출하고, 그 계약을 기준으로 frontend의 mock/demo 흐름을 실제 API 흐름으로 바꾸는 것이다.

`backend source guide를 frontend용 JSON 산출물로 추출한 뒤, method/path 기준 API 계약으로 현재 frontend와 backend를 연결한다.`

## 고정 전제

- 1차 API 계약 source는 `backend/constructionHelperBackendMain/docs/GUIDE`다.
- endpoint 목록 source는 `backend/constructionHelperBackendMain/docs/GUIDE/API_ENDPOINTS.md`다.
- 상세 guide source는 `backend/constructionHelperBackendMain/docs/GUIDE/**/*.json`이다.
- frontend에서 사용할 추출 산출물은 `backend/api/api-list` 아래에 저장한다.
- 원격 guide endpoint인 `GET https://dev.conelp.kr/api/guide/endpoints`는 현재 `HTTP 403`이므로, 지금 단계에서는 필수 경로로 쓰지 않는다.
- backend `GuideController`는 index 기반 상세 조회를 제공하지만, 로컬 추출에서는 중복 index 위험 때문에 `method + path`를 1차 매칭 기준으로 둔다.
- 기존 mock/demo 코드는 즉시 제거하지 않고, 실제 API 연동이 확인된 흐름부터 점진적으로 교체한다.
- 인증 header는 `Authorization: Bearer {accessToken}`, 프로젝트 header는 `X-Project-Id: {projectId}`를 기준으로 준비한다.

## Stage 1. Backend guide 추출 작업대 만들기 [completed]

목표:
원격 API guide 호출 없이도 backend source에서 endpoint 목록과 상세 guide를 반복 생성할 수 있는 작업 구조를 만든다.

커밋 메시지:
`chore: extract api guides from backend source`

결과물:
- `backend/api/scripts/extract_backend_api_guides.py`
- `backend/api/api-list/endpoints.json`
- `backend/api/api-list/api-guide-index.json`
- `backend/api/api-list/extraction-report.json`
- `backend/api/api-list/details/`

체크포인트:
- [x] `backend/api/scripts` 디렉터리를 만든다
- [x] `backend/api/api-list` 디렉터리를 만든다
- [x] `API_ENDPOINTS.md`에서 section, index, method, endpoint를 파싱한다
- [x] `docs/GUIDE/**/*.json` 상세 guide를 `backend/api/api-list/details`로 복사한다
- [x] endpoint와 상세 guide를 `method + path` 우선으로 연결한다
- [x] 중복 index, 누락 detail, 미사용 detail을 `extraction-report.json`에 기록한다
- [x] 스크립트 실행 방법을 argparse help로 남긴다
- [x] 스크립트를 실행해 산출물을 생성한다

진행 메모:
- `python3 backend/api/scripts/extract_backend_api_guides.py` 실행 결과 endpoint 195개를 파싱했다.
- 상세 guide JSON 194개를 복사했다.
- `method + path` 기준 상세 매칭 184개를 확인했다.
- 중복 index는 `299`, `301` 두 개다.
- 누락 detail과 ambiguous detail은 없다.
- 미사용 detail은 `reference/118_deleteWorkComponentType.json` 1개다.

완료 기준:
한 번의 Python 명령으로 backend source guide에서 frontend용 API 목록, 상세 guide 복사본, 추출 리포트를 생성할 수 있다.

## Stage 2. Backend guide 불일치와 연동 기준 정리

목표:
backend source guide 안의 index 중복과 문서/상세 guide 차이를 먼저 정리해서, frontend 구현이 잘못된 index에 의존하지 않게 한다.

커밋 메시지:
`docs: define backend guide matching rules`

결과물:
- `docs/plans/backend-api-integration-plan.md`
- `backend/api/api-list/extraction-report.json`
- `backend/api/api-list/api-guide-index.json`

체크포인트:
- [ ] `299`, `301` 중복 index가 어떤 endpoint 쌍에서 발생하는지 확인한다
- [ ] frontend 연동에서는 index 대신 `method + endpoint`를 API 식별자로 쓴다고 고정한다
- [ ] `api-guide-index.json`에서 `detailMatch`가 `method-and-path` 또는 `index-and-action`인 항목을 우선 사용한다고 정의한다
- [ ] `reference/118_deleteWorkComponentType.json`이 현재 endpoint list에서 빠진 이유를 확인한다
- [ ] backend에 전달할 guide 정리 질문 목록을 만든다

완료 기준:
frontend 구현자가 index 중복이나 상세 guide 파일명 차이에 흔들리지 않고, 어떤 API 계약을 신뢰해야 하는지 바로 판단할 수 있다.

## Stage 3. 로그인과 인증 요청 기반 만들기 [completed]

목표:
backend API 호출 전에 사용자가 로그인하고, 이후 API 요청에 `Authorization` header가 붙도록 인증 기반을 먼저 만든다.

커밋 메시지:
`feat: add login flow for backend api calls`

결과물:
- `src/features/auth/`
- `src/shared/network/` 또는 공통 API client 위치
- login route
- auth store
- route guard

참고 source:
- `legacy/constructionHelperFrontend/src/features/auth/infra/auth-api.ts`
- `legacy/constructionHelperFrontend/src/features/auth/infra/auth-client.ts`
- `legacy/constructionHelperFrontend/src/features/auth/view-model/auth-store.ts`
- `legacy/constructionHelperFrontend/src/features/auth/ui/LoginPage.vue`
- `legacy/constructionHelperFrontend/src/shared/network-core/access-token.ts`
- `legacy/constructionHelperFrontend/src/shared/utils/rsa-encrypt.ts`

체크포인트:
- [x] legacy login flow를 `getPublicKey -> RSA encrypt -> login -> accessToken 저장 -> me 조회` 순서로 확인한다
- [x] 현재 프로젝트에 맞는 `User`, `TokenResponse`, `FieldErrors` 타입을 만든다
- [x] access token을 메모리에 보관하는 helper를 만든다
- [x] Web Crypto 기반 RSA encrypt helper를 현재 프로젝트로 옮긴다
- [x] `GET /api/auth/getPublicKey` 호출 함수를 만든다
- [x] `POST /api/auth/login` 호출 함수를 만든다
- [x] `POST /api/auth/refresh` 호출 함수를 만든다
- [x] `GET /api/auth/me` 호출 함수를 만든다
- [x] `POST /api/auth/logout` 호출 함수를 만든다
- [x] Pinia auth store에 `login`, `logout`, `initialize`, `isAuthenticated`를 구현한다
- [x] 앱 초기 진입 시 refresh와 me 조회로 로그인 상태를 복원한다
- [x] `/login` route와 로그인 화면을 추가한다
- [x] 보호 route 접근 시 미로그인 상태면 `/login?redirect=...`로 보낸다
- [x] 로그인 성공 시 redirect query 또는 기본 화면으로 이동한다
- [x] 공통 API 요청에서 access token이 있으면 `Authorization: Bearer {accessToken}`을 붙인다
- [x] 401/403 응답에서 refresh를 한 번 시도하고 실패하면 login으로 보낸다

진행 메모:
- 현재 프로젝트에는 `axios`가 없어 legacy 구조를 `fetch` 기반으로 구현했다.
- 기본 API base URL은 `https://dev.conelp.kr/api`이고, `VITE_API_BASE_URL`로 override할 수 있다.
- `npm run build`로 typecheck와 production build를 통과했다.

완료 기준:
dev 서버에서 로그인 후 보호 화면에 접근할 수 있고, 이후 backend API 요청에 access token이 포함되어 인증 오류 없이 호출 준비가 된다.

## Stage 4. 현재 frontend 흐름과 backend API 매핑 [completed]

목표:
현재 frontend의 화면, state, mock data가 backend source guide의 어떤 endpoint와 연결되어야 하는지 먼저 표로 고정한다.

커밋 메시지:
`docs: map frontend flows to backend source apis`

결과물:
- `docs/plans/backend-api-integration-plan.md`
- 연동 후보 endpoint 목록

체크포인트:
- [x] 현재 route와 feature 디렉터리 구조를 확인한다
- [x] 로그인과 사용자 확인 흐름에 `auth` API 후보를 연결한다
- [x] 프로젝트 선택과 `X-Project-Id` 설정 흐름에 `project` API 후보를 연결한다
- [x] 문서 설정 흐름에 `docConfig` API 후보를 연결한다
- [x] 작업일보 생성 흐름에 `dailyReport` API 후보를 연결한다
- [x] 자재 검수요청서 생성 흐름에 `materialInspectionRequest` API 후보를 연결한다
- [x] 콘크리트 인수시험 흐름에 `cat` API 후보를 연결한다
- [x] 콘크리트 압축강도 흐름에 `ccst` API 후보를 연결한다
- [x] 문서 job 조회와 다운로드 흐름에 `document` API 후보를 연결한다
- [x] frontend에 아직 화면이 없는 API는 backlog로 분리한다

상태 기준:
- `지원`: 현재 frontend 요구를 backend API 하나 또는 명확한 조합으로 바로 충족한다
- `부분 지원`: backend raw API는 있으나 frontend 집계/가공 또는 추가 확인이 필요하다
- `Gap`: 현재 backend guide에서 대응 endpoint를 찾지 못했다
- `Frontend-only`: 화면 전환, 선택 상태, 로컬 UI 상태라 backend API가 필요 없다

### 비교표 A. 공통 인증과 프로젝트

| Frontend 필요 항목 | 현재 frontend 위치 | Backend 지원 | 후보 API | 상태 | 메모 |
|--------------------|-------------------|--------------|----------|------|------|
| 로그인 public key 조회 | `src/features/auth` | public key 제공 | `GET /api/auth/getPublicKey` | 지원 | Stage 3에서 구현 완료 |
| 로그인 토큰 발급 | `src/features/auth` | RSA 암호화 login 지원 | `POST /api/auth/login` | 지원 | `accessToken`은 메모리 저장 |
| 새로고침 후 인증 복원 | route guard, auth store | refresh cookie 기반 토큰 재발급 | `POST /api/auth/refresh`, `GET /api/auth/me` | 지원 | dev backend 502/쿠키 상태에 따라 런타임 확인 필요 |
| 로그아웃 | header 또는 auth store | logout endpoint 제공 | `POST /api/auth/logout` | 지원 | header logout UI는 아직 없음 |
| 사용자 표시 | header 또는 account area | me endpoint 제공 | `GET /api/auth/me` | 지원 | 현재 header에는 user 표시가 없음 |
| 프로젝트 목록/선택 | 전체 API 요청의 project context | 사용자의 프로젝트 목록 제공 | `GET /api/project/getProjectList` | 지원 | 선택한 project id를 `X-Project-Id`로 주입해야 함 |
| 현재 현장명 chip | `DesktopAppHeader.siteLabel` | projectName 제공 | `GET /api/project/getProjectList` | 부분 지원 | 기본 project 선택 규칙 필요 |

### 비교표 B. Desktop Schedule / Gantt

| Frontend 필요 항목 | 현재 frontend 위치 | Backend 지원 | 후보 API | 상태 | 메모 |
|--------------------|-------------------|--------------|----------|------|------|
| 공정표 버전 목록 | schedule toolbar/state 후보 | version 목록 제공 | `GET /api/scheduleVersion/getScheduleVersionList` | 지원 | main version 선택 로직 필요 |
| 공정표 버전 생성 | schedule version UI 후보 | version 생성 제공 | `POST /api/scheduleVersion/createScheduleVersion` | 지원 | 최대 5개 rule 반영 필요 |
| 공정표 버전명/main 수정 | schedule version UI 후보 | version update 제공 | `PUT /api/scheduleVersion/updateScheduleVersion/{scheduleVersionId}` | 지원 | main 변경 시 다른 버전 자동 false |
| 공정표 버전 복제 | schedule version UI 후보 | work/dependency 복제 제공 | `POST /api/scheduleVersion/duplicateScheduleVersion/{scheduleVersionId}` | 지원 | 복제 후 새 version reload 필요 |
| 공정표 버전 삭제 | schedule version UI 후보 | cascade delete 제공 | `DELETE /api/scheduleVersion/deleteScheduleVersion/{scheduleVersionId}` | 지원 | 마지막 1개 삭제 불가 |
| 간트 row/bar용 work 목록 | `desktop-schedule.service.ts`, seed bundle | version별 work 목록 제공 | `GET /api/work/getWorkListByVersion` | 지원 | `workName/startDate/completionDate/positionY` 등 매핑 가능 |
| 기간 단위 work lazy load | timeline viewport 후보 | 기간+버전 work 조회 제공 | `GET /api/work/getWorkListByPeriodAndVersion` | 지원 | 대형 공정표 최적화에 사용 가능 |
| work 단건 상세 | context menu/detail panel 후보 | 단건 조회 제공 | `GET /api/work/getWork/{workId}` | 지원 | 현재 상세 panel은 없음 |
| work 생성 | context menu `create parent/child` 후보 | work 생성 제공 | `POST /api/work/createWork` | 지원 | 현재 local 생성 모델과 backend 필수값 차이 있음 |
| work 수정/drag/resize/rename | `useDesktopScheduleViewModel.ts` | partial update 제공 | `PUT /api/work/updateWork/{workId}` | 부분 지원 | 이름 직접 수정은 backend가 관련 필드 기반 자동 생성 |
| work 삭제 | context menu remove 후보 | 삭제 제공 | `DELETE /api/work/deleteWork/{workId}` | 지원 | response의 `updatedWorkPaths` 매핑 확인 필요 |
| 선후행 연결 목록 | schedule connection rendering | version별 dependency 제공 | `GET /api/workDep/getWorkDepListByVersion` | 지원 | backend response는 pathName/color/critical 없음 |
| 선후행 연결 생성 | drag connection 후보 | dependency 생성 제공 | `POST /api/workDep/createWorkDep` | 지원 | `lagDays` 규칙을 UI에 반영 필요 |
| 선후행 lag 수정 | context menu/change property 후보 | lagDays update 제공 | `PUT /api/workDep/updateWorkDep/{workDepId}` | 지원 | cascade response를 화면에 반영해야 함 |
| 선후행 삭제 | context menu remove 후보 | delete 제공 | `DELETE /api/workDep/deleteWorkDep/{workDepId}` | 지원 | successor가 앞으로 당겨질 수 있음 |
| 프로젝트 캘린더/휴일/비활성일 | timeline day rendering 후보 | project calendar 제공 | `GET /api/project/getProjectCalendar/{projectId}` | 지원 | 현재 weekend 계산을 backend calendar로 교체 가능 |
| 작업일/휴일 수정 | calendar edit 후보 | update work date 제공 | `PUT /api/project/updateWorkDate` | 지원 | 변경 시 completion date cascade |
| 3주/3개월 공정표 Excel export | export button 후보 | binary xlsx 응답 제공 | `POST /api/schedule/create3WeekSchedule`, `POST /api/schedule/create3MonthSchedule` | 지원 | blob download 처리 필요 |
| milestone 생성/이동/수정/삭제 | `DesktopScheduleMilestone` UI | guide에서 milestone API 없음 | 없음 | Gap | 현재는 frontend local state로만 유지 가능 |
| critical path color/name/path group | `criticalPaths`, `links.pathName/color` | WorkDependency는 있으나 path metadata API 없음 | `GET /api/workDep/getWorkDepListByVersion` | 부분 지원 | backend response는 `id/sourceWorkId/targetWorkId/lagDays` 중심 |

### 비교표 C. Desktop Dashboard

| Frontend 필요 항목 | 현재 frontend 위치 | Backend 지원 | 후보 API | 상태 | 메모 |
|--------------------|-------------------|--------------|----------|------|------|
| 현장명/현장 기간 | `desktop-dashboard.seed.ts` | project list 제공 | `GET /api/project/getProjectList` | 지원 | selected project 적용 필요 |
| 월간 calendar 표시 | dashboard calendar | project calendar 제공 | `GET /api/project/getProjectCalendar/{projectId}` | 지원 | agenda/issue/milestone 문구는 별도 source 필요 |
| 오늘 작업내용 | `todayWorkRawText` | 날짜별 work 조회 제공 | `GET /api/work/getWorkListByDate` | 부분 지원 | 현재 raw text 섹션 형태로 변환 필요 |
| 전체/공종별 계획 공정률 | progress chart | work/task 기반 raw data 일부 제공 | `GET /api/work/getWorkListByVersion`, `GET /api/task/getTaskList` | 부분 지원 | progress 계산식 또는 aggregate API 필요 |
| 실제 공정률 | progress chart | actualWork API 존재 | `GET /api/actualWork/getActualWorkListByDate`, `GET /api/actualWork/getActualWorkListBetween` | 부분 지원 | 현재 Stage 4 후보 범위에는 포함하지 않았지만 backend guide에 존재 |
| 출력 현황 | workforce table | attendance summary/list 제공 | `GET /api/attendance/getAttendanceSummary`, `GET /api/attendance/getAttendanceListByDate` | 지원 | dashboard 형태로 group mapping 필요 |
| 장비 투입현황 | resource table equipment group | equipment API 제공 | `GET /api/equipment/getEquipmentDeploymentListByDate`, `GET /api/equipment/getEquipmentCumulativeList` | 지원 | current UI는 material/equipment 통합 table |
| 자재 투입현황 | resource table material group | delivery/order API 제공 | `GET /api/materialDelivery/getTotalDeliveryQuantityByDate`, `GET /api/materialDelivery/getMaterialDeliveryList`, `GET /api/materialOrder/getMaterialOrderList` | 부분 지원 | 현재 UI 지표에 맞는 집계 기준 필요 |
| TODO / 활성 이슈 | dashboard todo/summary | guide에서 issue/todo API 없음 | 없음 | Gap | 별도 issue/todo domain 필요 |
| quick links | dashboard quick links | route 이동만 필요 | 없음 | Frontend-only | API 불필요 |

### 비교표 D. Document Conversion Demo

| Frontend 필요 항목 | 현재 frontend 문서 타입 | Backend 지원 | 후보 API | 상태 | 메모 |
|--------------------|------------------------|--------------|----------|------|------|
| 문서 종류 catalog 표시 | `documentCatalog` | catalog list API 없음 | 없음 | Frontend-only | 현재는 frontend 고정 catalog로 유지 가능 |
| 작업일보 생성 | `daily_report` | DR 생성 지원 | `POST /api/dailyReport/createDailyReport` | 지원 | `date` query와 optional frontend data JSON 필요 |
| 반입 자재 등록 | `material_registration` | LLM image 기반 MaterialDelivery 생성 지원 | `POST /api/materialDelivery/createMaterialDelivery` | 지원 | multipart images, `application`, `workTypeName` |
| 자재 반입 검수요청 | `material_inspection_rebar` | MaterialDelivery 기반 MIR 생성 지원 | `POST /api/materialInspectionRequest/createMir/{materialDeliveryId}` | 부분 지원 | 먼저 MaterialDelivery 생성/선택 필요 |
| 콘크리트 반입시험 | `concrete_delivery_csi` | CAT 생성 지원 | `POST /api/cat/createCat` | 지원 | multipart `testDate`, `data`, `images` |
| 콘크리트 압축강도 | `concrete_strength_csi` | CCST 생성 지원 | `POST /api/ccst/createCcst` | 지원 | CAT와 동일 패턴 |
| 검측 요청서 | `inspection_request` | guide에서 대응 API 없음 | 없음 | Gap | backend에 Inspection Request domain 필요 여부 확인 |
| 변환 진행 상태 | loading/result flow | document job 조회 제공 | `GET /api/document/getDocumentJob/{jobId}` | 지원 | polling 구현 필요 |
| 결과 다운로드 | result/generated documents | document download 제공 | `GET /api/document/downloadDocument/{jobId}` | 지원 | xlsx/pdf URL 또는 binary 처리 확인 |
| 생성 문서 목록 | generated documents page | 문서별 list API 일부 제공 | `GET /api/dailyReport/getDailyReportList`, `GET /api/materialInspectionRequest/getMirList`, `GET /api/cat/getCatList`, `GET /api/ccst/getCcstList` | 부분 지원 | 통합 document list API는 없음 |
| 템플릿/셀 매핑 설정 | 아직 현재 UI 없음 | docConfig API 제공 | `/api/docConfig/*` | 지원 | 관리자/설정 화면 후보 |

우선순위:
- 1차 연동은 `Auth -> Project -> ScheduleVersion -> Work -> WorkDep -> ProjectCalendar` 순서로 진행한다.
- dashboard는 raw API 조합으로 일부 가능하지만, progress/issue/todo는 backend aggregate 또는 새 domain 확인이 필요하다.
- document demo는 `DR`, `MaterialDelivery`, `MIR`, `CAT`, `CCST`, `DocumentJob`를 먼저 연결하고 `inspection_request`는 gap으로 둔다.

완료 기준:
핵심 frontend 흐름마다 사용할 backend endpoint 후보와 필요한 request/response detail file이 한 문서 안에서 구분된다.

## Stage 5. API client와 공통 요청 계약 추가

목표:
화면 컴포넌트가 직접 fetch를 흩뿌리지 않도록, base URL, 인증, project header, error 처리를 먼저 고정한다.

커밋 메시지:
`feat: add backend api client`

결과물:
- frontend API client 모듈
- frontend 환경 변수 예시
- API error/loading 타입

체크포인트:
- [ ] 기본 API base URL을 설정한다
- [ ] 환경 변수로 API base URL을 override할 수 있게 만든다
- [ ] Stage 3의 auth helper와 연결해 access token을 읽는다
- [ ] JSON 요청과 multipart 요청을 분리해 처리한다
- [ ] `Authorization` header 주입 위치를 만든다
- [ ] `X-Project-Id` header 주입 위치를 만든다
- [ ] non-2xx 응답을 화면에서 다룰 수 있는 error 형태로 변환한다
- [ ] `backend/api/api-list` 산출물을 기준으로 request/response 타입 후보를 만든다

완료 기준:
frontend feature 코드가 공통 API client를 통해 backend를 호출할 수 있고, base URL, auth, project, error 처리가 한 곳에서 관리된다.

## Stage 6. 기존 mock 흐름을 실제 API 흐름으로 교체

목표:
사용자가 보는 핵심 문서 생성 흐름부터 backend 응답으로 동작하게 만들고, mock 데이터는 fallback 또는 dev preview 용도로만 남긴다.

커밋 메시지:
`feat: connect document conversion flow to backend`

결과물:
- API 연동 service 모듈
- 실제 API 기반 state 처리
- loading, empty, error 상태 UI

체크포인트:
- [ ] 인증이 필요한 화면에서 token 없는 상태를 처리한다
- [ ] project 선택 또는 기본 project id를 API 요청에 연결한다
- [ ] 문서 생성 요청을 backend document domain API와 연결한다
- [ ] 생성 응답의 `DocumentJobResponse`에서 `jobId`를 저장한다
- [ ] `GET /api/document/getDocumentJob/{jobId}` 조회 흐름을 구현한다
- [ ] job 성공 시 다운로드 API 또는 result URL을 결과 화면에 연결한다
- [ ] API 실패 시 사용자가 다시 시도할 수 있는 상태를 보여 준다
- [ ] 기존 mock preview route가 필요하면 실제 연동 flow와 분리한다

완료 기준:
dev 서버에서 핵심 문서 생성 흐름이 backend API 계약에 맞춰 시작, job 조회, 결과 확인까지 진행된다.

## Stage 7. QA와 backend source 연동 수용 기준 검증

목표:
추출 스크립트 산출물, API client, 실제 화면 흐름이 서로 같은 계약을 보고 있는지 마지막 기준으로 검증한다.

커밋 메시지:
`test: verify backend source api integration`

결과물:
- API guide 추출 실행 결과
- frontend build 또는 typecheck 결과
- 수동 QA 기록

체크포인트:
- [ ] 미로그인 상태에서 보호 route가 login으로 redirect되는지 확인한다
- [ ] 로그인 성공 후 원래 route로 복귀하는지 확인한다
- [ ] refresh 성공 시 새로고침 후에도 인증 상태가 복원되는지 확인한다
- [ ] refresh 실패 시 access token이 비워지고 login으로 이동하는지 확인한다
- [ ] `extract_backend_api_guides.py`를 실행해 산출물이 재생성되는지 확인한다
- [ ] `extraction-report.json`의 duplicate/missing/ambiguous 항목을 확인한다
- [ ] frontend service 함수가 `api-guide-index.json`의 `method + endpoint`와 일치하는지 확인한다
- [ ] JSON 요청과 multipart 요청이 각각 정상 생성되는지 확인한다
- [ ] auth header와 project header가 필요한 요청에 들어가는지 확인한다
- [ ] happy path에서 문서 생성 핵심 흐름이 끝까지 진행되는지 확인한다
- [ ] backend 에러 응답에서 화면이 깨지지 않는지 확인한다
- [ ] network 지연 중 loading 상태가 보이는지 확인한다
- [ ] frontend build 또는 typecheck를 통과하는지 확인한다

완료 기준:
backend source guide 추출부터 frontend 실제 호출, 오류 처리, build/typecheck까지 backend 연동을 계속 확장할 수 있는 기준선이 확인된다.

## 고정 계약 A. Backend source guide

| Source | 역할 |
|--------|------|
| `backend/constructionHelperBackendMain/docs/GUIDE/API_ENDPOINTS.md` | endpoint 목록 source |
| `backend/constructionHelperBackendMain/docs/GUIDE/**/*.json` | endpoint별 상세 guide source |
| `backend/constructionHelperBackendMain/interface/src/main/java/com/project/interfaces/common/GuideController.java` | runtime guide 제공 방식 참고 |

## 고정 계약 B. 추출 산출물

| 파일 또는 디렉터리 | 역할 |
|-------------------|------|
| `backend/api/scripts/extract_backend_api_guides.py` | backend source guide 추출 스크립트 |
| `backend/api/api-list/endpoints.json` | Markdown endpoint list를 구조화한 JSON |
| `backend/api/api-list/details/` | backend 상세 guide JSON 복사본 |
| `backend/api/api-list/api-guide-index.json` | endpoint와 상세 guide 파일을 연결한 index |
| `backend/api/api-list/extraction-report.json` | 중복 index, 누락 detail, 미사용 detail 리포트 |

## Backend guide 질문 목록

- [ ] index `299`가 `docConfig/generateExcelCellRef`와 `dailyReport/createDailyReportForEan`에서 중복되는 것이 의도인지 확인한다
- [ ] index `301`이 `document/deleteDocument`와 `cat/createCat`에서 중복되는 것이 의도인지 확인한다
- [ ] `reference/118_deleteWorkComponentType.json`이 endpoint list에서 빠진 것이 의도인지 확인한다
- [ ] frontend 연동 기준을 index가 아니라 `method + path`로 두어도 되는지 확인한다
- [ ] dev backend의 CORS 허용 origin과 local dev 사용 가능 여부를 확인한다
