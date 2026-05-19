# Backend API Integration Plan

기능 또는 흐름 이름:
Backend source guide 추출 -> API 계약 검증 -> 간트 차트 우선 연동 -> 문서/대시보드 확장

이 문서는 `dev.conelp.kr`의 API guide 호출이 현재 `HTTP 403`으로 막혀 있는 상태에서, 로컬에 들어온 `backend/constructionHelperBackendMain` 코드와 guide 파일을 기준으로 frontend 연동을 진행하기 위한 실행용 plan 문서다.

핵심 방향은 전체 API를 한 번에 붙이는 것이 아니라, **현재 작업 중인 데스크톱 공정표/Gantt에 필요한 API만 먼저 추려서 연동**하는 것이다. 문서 생성과 대시보드 연동은 Gantt의 read/write 흐름이 안정된 뒤 뒤쪽 Stage에서 진행한다.

`backend source guide를 frontend용 JSON 산출물로 추출한 뒤, method/path 기준 API 계약으로 Gantt부터 실제 backend 데이터에 연결한다.`

## 고정 전제

- 1차 API 계약 source는 `backend/constructionHelperBackendMain/docs/GUIDE`다.
- endpoint 목록 source는 `backend/constructionHelperBackendMain/docs/GUIDE/API_ENDPOINTS.md`다.
- 상세 guide source는 `backend/constructionHelperBackendMain/docs/GUIDE/**/*.json`이다.
- frontend에서 사용할 추출 산출물은 `backend/api/api-list` 아래에 저장한다.
- 원격 guide endpoint인 `GET https://dev.conelp.kr/api/guide/endpoints`는 현재 `HTTP 403`이므로, 지금 단계에서는 필수 경로로 쓰지 않는다.
- backend `GuideController`는 index 기반 상세 조회를 제공하지만, 로컬 추출에서는 중복 index 위험 때문에 `method + path`를 1차 매칭 기준으로 둔다.
- 기존 mock/demo 코드는 즉시 제거하지 않고, 실제 API 연동이 확인된 흐름부터 점진적으로 교체한다.
- 인증 header는 `Authorization: Bearer {accessToken}`, 프로젝트 header는 `X-Project-Id: {projectId}`를 기준으로 준비한다.
- UI 용어는 `작업 연결`을 사용한다. backend guide의 domain 이름은 `workDep`이므로, plan에서는 `작업 연결(workDep)`로 표기한다.

## 현재 우선순위

1. Gantt read 연동: project 선택, main schedule version 선택, work 목록, 작업 연결 목록, calendar 조회.
2. Gantt write 연동: work 생성/수정/삭제, drag/resize/rename 저장, 작업 연결 생성/수정/삭제.
3. Gantt 안정화: optimistic update와 reload 기준, error rollback, calendar 반영, export.
4. 문서 생성 연동: daily report부터 job polling/download까지.
5. Dashboard 연동: Gantt 데이터와 actual/attendance/resource API를 조합해 점진 반영.

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
- login route
- auth store
- route guard
- 공통 API 요청의 `Authorization` header 주입

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

## Stage 4. Gantt API slice와 공통 client 고정

목표:
전체 API client를 과하게 일반화하기 전에, Gantt에 필요한 API만 호출할 수 있는 최소 client와 타입 경계를 만든다.

커밋 메시지:
`feat: add gantt api client slice`

결과물:
- `src/features/desktop-schedule/api/` 또는 `src/features/desktop-schedule/services/*api*`
- Gantt 전용 request/response 타입
- project id 주입 경로
- Gantt API error/loading 타입
- `docs/plans/gantt-api-change-requests.md`

Stage 4 우선 endpoint:

| 목적 | Backend API | 우선순위 | 메모 |
|------|-------------|----------|------|
| 프로젝트 목록/선택 | `GET /api/project/getProjectList` | P0 | `X-Project-Id` 기준값을 만든다 |
| 프로젝트 캘린더 조회 | `GET /api/project/getProjectCalendar/{projectId}` | P0 | 휴일/비작업일 렌더링에 필요 |
| 공정표 버전 목록 | `GET /api/scheduleVersion/getScheduleVersionList` | P0 | `isMain=true`인 version을 선택한다 |
| work 목록 | `GET /api/work/getWorkListByVersion` | P0 | row/bar 기본 데이터 |
| 기간별 work 목록 | `GET /api/work/getWorkListByPeriodAndVersion` | P0 | viewport/lazy loading 후보까지 먼저 준비 |
| work 단건 | `GET /api/work/getWork/{workId}` | P0 | work 작업 API 묶음에 포함 |
| work 생성 | `POST /api/work/createWork` | P1 | 셀/컨텍스트 메뉴 생성 |
| work 수정 | `PUT /api/work/updateWork` | P1 | drag/resize batch 저장 |
| work 삭제 | `DELETE /api/work/deleteWork/{workId}` | P1 | 삭제 후 cascade 반영 |
| 작업 연결 목록 | `GET /api/workDep/getWorkDepListByVersion` | P0 | UI의 `작업 연결` 데이터 |
| 작업 연결 생성 | `POST /api/workDep/createWorkDep` | P1 | bar connection 생성 |
| 작업 연결 수정 | `PUT /api/workDep/updateWorkDep/{workDepId}` | P1 | lagDays 저장 |
| 작업 연결 삭제 | `DELETE /api/workDep/deleteWorkDep/{workDepId}` | P1 | context menu 삭제 |

Stage 4에서 일부러 미루는 endpoint:
- 공정표 버전 생성/수정/복제/삭제는 Stage 5로 미룬다.
- 작업일/휴일 수정은 Stage 5로 미룬다.
- 3주/3개월 공정표 export는 Stage 5로 미룬다.

체크포인트:
- [x] Gantt API 함수는 `method + path` 기준 guide detail을 주석 또는 테스트 fixture로 연결한다
- [x] 공통 fetch wrapper가 `Authorization`을 붙이는지 확인한다
- [x] Gantt API wrapper에서 `X-Project-Id`를 붙인다
- [x] JSON response, empty response, blob response를 분리한다
- [x] `scheduleVersionId`, `workId`, `workDepId`, `projectId` 타입 alias를 만든다
- [x] 프로젝트 목록 조회와 선택 project id 저장 방식을 만든다
- [x] schedule version 목록을 조회하고 `isMain=true`인 version id를 선택한다
- [x] `isMain=true` version이 없을 때 empty state/error state로 중단하는 기준을 정한다
- [x] 캘린더 조회 API 함수를 만든다
- [x] work 목록/기간별 목록/단건/생성/수정/삭제 API 함수를 만든다
- [x] 작업 연결 목록/생성/수정/삭제 API 함수를 만든다
- [x] API 실패 시 화면 state에서 다룰 수 있는 `DesktopScheduleApiError`를 만든다
- [x] mock seed fallback을 유지할 수 있게 API service와 local service를 분리한다
- [x] API 변경 또는 guide 정리가 필요한 항목을 별도 문서로 분리한다

완료 기준:
Gantt feature 코드에서 project 선택, calendar read, work 전체 작업, 작업 연결 전체 작업을 typed 함수로 호출할 준비가 된다.

## Stage 5. Gantt read model 연동

목표:
현재 공정표 화면에서 지원하는 범위에 맞춰 backend의 project/version/work/workDep/calendar read API로 실제 데이터를 로딩한다.

커밋 메시지:
`feat: load gantt schedule from backend`

결과물:
- backend response -> `DesktopScheduleSnapshot` mapper
- project 선택 또는 기본 project 선택 state
- main schedule version 선택 state
- loading, empty, error state
- seed fallback 제거

현재 구현하지 않는 endpoint:
- 공정표 버전 생성/수정/복제/삭제는 현재 UI에서 지원하지 않으므로 제외한다.
- 작업일/휴일 수정은 현재 UI에서 지원하지 않으므로 제외한다.
- 3주/3개월 공정표 export는 현재 UI에서 지원하지 않으므로 제외한다.

데이터 매핑:

| Frontend model | Backend source | 매핑 메모 |
|----------------|----------------|-----------|
| `DesktopScheduleRow` | `work.division`, `work.workType`, `work.subWorkType`, `subWorkTypeId` | 현재 row grouping 규칙 유지 |
| `DesktopScheduleItem` | `GET /api/work/getWorkListByVersion` | `workName/startDate/completionDate/durationDays/positionY` 확인 필요 |
| `DesktopScheduleWorkConnection` | `GET /api/workDep/getWorkDepListByVersion` | UI `작업 연결`, backend `workDep` |
| timeline holiday/weekend | `GET /api/project/getProjectCalendar/{projectId}` | 현재 weekend 계산을 calendar 기반으로 교체 |
| selected site chip | `GET /api/project/getProjectList` | selected project name 표시 |

체크포인트:
- [x] 로그인 후 project list를 조회한다
- [x] 기본 project 선택 규칙을 정한다
- [x] 선택 project id를 Gantt API header에 연결한다
- [x] schedule version list를 조회한다
- [x] main version이 있으면 main version을 선택한다
- [x] main version이 없으면 empty/error state를 보여 준다
- [x] 선택 version 기준 work list를 조회한다
- [x] 선택 version 기준 작업 연결(workDep) list를 조회한다
- [x] project calendar를 조회한다
- [x] work response를 현재 row/bar layout input으로 변환한다
- [x] workDep response를 `workConnections`로 변환한다
- [x] seed fallback을 제거하고 backend empty/error state만 사용한다
- [x] read API 실패 시 화면 전체가 깨지지 않고 retry가 가능하게 한다

완료 기준:
공정표 화면이 backend의 실제 project/version/work/workDep/calendar read data로 렌더링된다.

## Stage 6. Gantt work mutation 연동

목표:
사용자가 공정표에서 work를 만들고, 움직이고, 크기를 바꾸고, 이름을 수정하고, 삭제하는 동작을 backend에 저장한다.

커밋 메시지:
`feat: persist gantt work edits`

결과물:
- work create/update/delete API 연결
- optimistic update 또는 save 후 reload 기준
- mutation pending/error UI
- rollback 또는 server reload 처리

체크포인트:
- [x] 현재 local work 생성이 backend `createWork` 필수값을 만족하는지 확인한다
- [x] 빈 셀/컨텍스트 메뉴에서 work 생성 시 필요한 default field를 정의한다
- [x] drag 이동 후 `PUT /api/work/updateWork` batch request로 start/completion/position 정보를 저장한다
- [x] resize 후 `PUT /api/work/updateWork` batch request로 기간 정보를 저장한다
- [x] 이름 변경 후 backend가 직접 이름을 받는지, 관련 필드 조합으로 이름이 생성되는지 확인한다
- [x] 삭제 시 `DELETE /api/work/deleteWork/{workId}`를 호출한다
- [x] 삭제/수정 response의 `updatedWorkDeps` 또는 cascade 결과를 화면에 반영한다
- [x] 실패 시 이전 local state로 rollback하거나 version reload를 수행한다
- [x] 연속 drag 중에는 API를 호출하지 않고 pointer up 시 한 번만 저장한다
- [ ] 저장 중인 bar에 pending affordance를 추가할지 결정한다

완료 기준:
공정표의 work 변경이 새로고침 후에도 backend data로 유지된다.

## Stage 7. Gantt 작업 연결(workDep) mutation 연동

목표:
UI의 `작업 연결` 생성/수정/삭제를 backend `workDep` API에 연결하고, lagDays와 cascade 결과를 화면에 반영한다.

커밋 메시지:
`feat: persist gantt work connections`

결과물:
- 작업 연결 create/update/delete API 연결
- lagDays 저장과 표시
- cascade 결과 반영
- backend rule 위반 error handling

체크포인트:
- [x] UI의 `sourceItemId/targetItemId/gapDays`를 backend `createWorkDep` request로 변환한다
- [x] backend에서 선후 관계 방향을 어떻게 요구하는지 확인한다
- [x] 연결 생성 성공 후 workDep id를 local `workConnection.id`에 반영한다
- [ ] lagDays 수정 UI가 필요하면 먼저 최소 입력 방식을 정한다
- [x] `PUT /api/workDep/updateWorkDep/{workDepId}` 후 cascade된 work들을 reload 또는 patch한다
- [x] `DELETE /api/workDep/deleteWorkDep/{workDepId}` 후 successor 변경 가능성을 반영한다
- [x] 현재 UI의 "후행작업은 선행보다 빠를 수 없음" rule과 backend validation 메시지를 맞춘다
- [x] 연결 생성/삭제 후 선택 상태가 남지 않게 한다

완료 기준:
작업 연결이 backend `workDep` data와 동기화되고, lagDays와 cascade 이동 결과가 화면에 일관되게 반영된다.

## Stage 8. Gantt calendar, version management, export 확장

목표:
core read/write가 안정된 뒤 calendar edit, schedule version 관리, Excel export를 붙인다.

커밋 메시지:
`feat: add gantt schedule utilities`

결과물:
- schedule version CRUD UI/API 연결
- project calendar update API 연결
- 3주/3개월 schedule export download

체크포인트:
- [ ] version 생성/수정/복제/삭제 UI 범위를 정한다
- [ ] version 변경 시 work/workDep/calendar reload 순서를 정한다
- [ ] version 삭제 불가 rule을 UI에서 안내한다
- [ ] `PUT /api/project/updateWorkDate`를 calendar edit UI와 연결한다
- [ ] calendar 변경 후 work completion date cascade를 반영한다
- [ ] `POST /api/schedule/create3WeekSchedule` blob download를 구현한다
- [ ] `POST /api/schedule/create3MonthSchedule` blob download를 구현한다
- [ ] export 실패 시 사용자에게 재시도 상태를 제공한다

완료 기준:
Gantt를 실제 운영 데이터로 조회, 편집, 버전 관리, export까지 확장할 수 있다.

## Stage 9. Document conversion backend 연동

목표:
Gantt core 연동이 끝난 뒤 문서 생성 흐름을 backend job 기반 flow로 교체한다.

커밋 메시지:
`feat: connect document conversion flow to backend`

우선 endpoint:

| Frontend 문서 타입 | Backend API | 상태 | 메모 |
|--------------------|-------------|------|------|
| 공사일보 | `POST /api/dailyReport/createDailyReport` | 지원 | date query와 optional frontend data JSON |
| 반입 자재 등록 | `POST /api/materialDelivery/createMaterialDelivery` | 지원 | multipart images |
| 자재 반입 검수요청 | `POST /api/materialInspectionRequest/createMir/{materialDeliveryId}` | 부분 지원 | MaterialDelivery 선행 필요 |
| 콘크리트 반입시험 | `POST /api/cat/createCat` | 지원 | multipart |
| 콘크리트 압축강도 | `POST /api/ccst/createCcst` | 지원 | multipart |
| 변환 진행 상태 | `GET /api/document/getDocumentJob/{jobId}` | 지원 | polling |
| 결과 다운로드 | `GET /api/document/downloadDocument/{jobId}` | 지원 | blob 또는 URL 확인 |
| 검측 요청서 | 없음 | Gap | backend domain 확인 필요 |

체크포인트:
- [ ] Gantt에서 선택한 project context를 문서 생성에도 재사용한다
- [ ] 작업일보는 먼저 연결하고 다른 문서는 순차 연결한다
- [ ] jobId 저장과 polling 상태를 구현한다
- [ ] 다운로드 버튼을 실제 document download API와 연결한다
- [ ] 생성 실패/검토 필요 메시지 contract를 backend와 맞춘다

완료 기준:
최소 공사일보 생성이 backend API로 시작되고, job 조회와 결과 다운로드까지 연결된다.

## Stage 10. Dashboard backend 연동

목표:
Dashboard를 Gantt 데이터와 현장 운영 API 조합으로 점진 연결한다.

커밋 메시지:
`feat: connect dashboard to backend data`

우선 endpoint:

| Dashboard 영역 | Backend API | 상태 | 메모 |
|----------------|-------------|------|------|
| 현장명/현장 기간 | `GET /api/project/getProjectList` | 지원 | Gantt project state 재사용 |
| 월간 calendar | `GET /api/project/getProjectCalendar/{projectId}` | 지원 | agenda는 별도 source 필요 |
| 오늘 작업내용 | `GET /api/work/getWorkListByDate` | 부분 지원 | raw text 변환 필요 |
| 계획 공정률 | `GET /api/work/getWorkListByVersion`, `GET /api/task/getTaskList` | 부분 지원 | 계산식 필요 |
| 실제 공정률 | `GET /api/actualWork/getActualWorkListByDate`, `GET /api/actualWork/getActualWorkListBetween` | 부분 지원 | aggregate 기준 필요 |
| 출력 현황 | `GET /api/attendance/getAttendanceSummary`, `GET /api/attendance/getAttendanceListByDate` | 지원 | table mapping |
| 장비 투입현황 | `GET /api/equipment/getEquipmentDeploymentListByDate`, `GET /api/equipment/getEquipmentCumulativeList` | 지원 | table mapping |
| 자재 투입현황 | `GET /api/materialDelivery/getTotalDeliveryQuantityByDate`, `GET /api/materialDelivery/getMaterialDeliveryList`, `GET /api/materialOrder/getMaterialOrderList` | 부분 지원 | 집계 기준 필요 |
| TODO / 활성 이슈 | 없음 | Gap | 별도 issue/todo domain 필요 |

체크포인트:
- [ ] Gantt project/version state와 dashboard state를 공유할지 결정한다
- [ ] progress 계산식을 frontend에서 임시 계산할지 backend aggregate를 요청할지 결정한다
- [ ] attendance/equipment/material table mapping을 고정한다
- [ ] TODO/issue는 mock 유지 또는 backend gap으로 명확히 표시한다

완료 기준:
Dashboard의 핵심 운영 지표가 backend raw data 또는 명확한 aggregate contract에 의해 렌더링된다.

## Stage 11. QA와 backend source 연동 수용 기준 검증

목표:
추출 스크립트 산출물, Gantt API client, 실제 화면 흐름이 서로 같은 계약을 보고 있는지 마지막 기준으로 검증한다.

커밋 메시지:
`test: verify gantt backend integration`

체크포인트:
- [ ] 미로그인 상태에서 보호 route가 login으로 redirect되는지 확인한다
- [ ] 로그인 성공 후 원래 route로 복귀하는지 확인한다
- [ ] refresh 성공 시 새로고침 후에도 인증 상태가 복원되는지 확인한다
- [ ] `extract_backend_api_guides.py`를 실행해 산출물이 재생성되는지 확인한다
- [ ] `extraction-report.json`의 duplicate/missing/ambiguous 항목을 확인한다
- [ ] Gantt API 함수가 `api-guide-index.json`의 `method + endpoint`와 일치하는지 확인한다
- [ ] project header가 Gantt 요청에 들어가는지 확인한다
- [ ] schedule version 선택 후 work/workDep/calendar가 로드되는지 확인한다
- [ ] work drag/resize/rename 저장 후 reload해도 유지되는지 확인한다
- [ ] 작업 연결 생성/수정/삭제 후 reload해도 유지되는지 확인한다
- [ ] backend validation error에서 화면이 깨지지 않는지 확인한다
- [ ] network 지연 중 loading 상태가 보이는지 확인한다
- [ ] frontend build 또는 typecheck를 통과하는지 확인한다

완료 기준:
Gantt backend 연동의 read/write happy path와 주요 error path가 확인되고, 이후 문서/대시보드 연동을 같은 패턴으로 확장할 수 있다.

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
- [ ] `work.updateWork`가 work name 직접 변경을 지원하는지, 아니면 workType/subWorkType/component 기반 자동 이름만 지원하는지 확인한다
- [ ] `workDep` response에서 cascade 변경 work 목록을 항상 내려주는지 확인한다
- [ ] milestone 저장 domain이 있는지, 없다면 frontend local state로 유지해도 되는지 확인한다
