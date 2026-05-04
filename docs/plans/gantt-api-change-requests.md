# Gantt API Change Requests

이 문서는 Gantt Stage 4 연동 중 발견한 backend API 변경 필요 사항과 guide 문서 불일치 사항을 따로 기록한다. frontend 구현은 현재 backend source와 guide를 최대한 그대로 따르되, 아래 항목은 backend와 계약을 다시 맞춰야 한다.

## 1. Work 이름 직접 수정 API 필요 [resolved 2026-04-29]

현재 UI 요구:
- 공정표 bar를 더블클릭하거나 우클릭 `이름 변경`으로 work 이름을 직접 수정한다.

현재 backend 계약:
- `PUT /api/work/updateWork` batch item request에 `workName` 필드를 포함해 직접 수정한다.
- `workName != null`이면 자동 생성을 무시하고 입력값을 그대로 저장한다. 빈 문자열 `""`도 저장한다.
- frontend는 rename commit 시 `{ items: [{ workId, workName }] }` 형태로 저장한다.

프론트 반영:
- `DesktopScheduleWorkUpdateItem.workName` 타입을 추가했다.
- 작업명 수정은 trim 없이 optimistic update 후 batch `updateWork`로 저장하고, 실패하면 이전 이름으로 rollback한다.

## 2. 간단한 work 생성 API 또는 기본값 계약 필요

현재 UI 요구:
- 셀/row에서 바로 3일짜리 work를 생성하고, 이후 이름을 직접 편집한다.

현재 backend 계약:
- `POST /api/work/createWork`는 `startDate`, `workLeadTime`, `subWorkTypeId`, `scheduleVersionId`가 필수다.
- 현재 UI에서 셀 클릭만으로는 `subWorkTypeId`를 항상 알 수 있어야 한다.
- 현재 frontend row는 `division/workType/subWorkType` 중심으로 구성되어 있고, backend create에는 `subWorkTypeId`가 필요하다.

필요 결정:
- row data에 `subWorkTypeId`가 항상 포함되도록 read response를 신뢰해도 되는지 확인한다.
- 상위 공정/분류 row에서는 work 생성이 막혀야 하는지 확인한다.
- 이름만 입력해서 만드는 간단 생성 API가 필요한지 결정한다.

권장:
- 기존 `createWork`를 유지하되, frontend는 child row의 `subWorkTypeId`가 있는 경우에만 생성한다.
- 이름 직접 입력까지 backend에 저장하려면 1번 `workName` 변경도 같이 필요하다.

## 3. Mutation response guide 불일치 [resolved 2026-04-29]

현재 계약:
- `MutationResponse`는 `updatedWorks`, `updatedWorkDeps`만 반환한다.
- `updatedWorkPaths` 필드는 프론트 타입과 로컬 guide에서 제거했다.

프론트 반영:
- 작업 연결은 backend `workDep` 기준으로만 동기화한다.
- 작업 생성/수정/삭제와 작업 연결 생성/수정/삭제 응답은 `{updatedWorks: WorkResponse[], updatedWorkDeps: WorkDepResponse[]}` 형태로 처리한다.

## 4. `getWorkListByVersion` response guide 구체화 필요

현재 guide:
- `GET /api/work/getWorkListByVersion` response가 `[Work List Response common fields]`로만 적혀 있다.

현재 Java source:
- `WorkResponse`는 `workId`, `projectId`, `workName`, `startDate`, `workLeadTime`, `completionDate`, `isWorkingOnHoliday`, `subWorkTypeId`, `division`, `workType`, `subWorkType`, `zoneIds`, `zoneNames`, `floorIds`, `floorNames`, `componentTypes`, `positionY`, `annotation`을 반환한다.

필요 결정:
- guide에 실제 `WorkResponse` field 목록을 명시한다.
- `getWorkListByPeriodAndVersion` guide에는 `photos`가 포함되어 있으나 Java `WorkResponse`에는 없다. photos 포함 여부를 통일한다.

권장:
- work list 계열 endpoint의 response contract를 모두 같은 `WorkResponse` schema로 명시한다.

## 5. Main schedule version 부재 처리

현재 UI 흐름:
- `GET /api/scheduleVersion/getScheduleVersionList` 후 `isMain=true` version을 선택해 work를 조회한다.

현재 backend rule:
- guide에는 `At least 1 must exist`, `Only 1 per project can have isMain=true`가 적혀 있다.

필요 결정:
- main version이 없는 상태가 backend에서 절대 불가능한지 확인한다.
- 불가능하지 않다면 frontend fallback을 첫 번째 version으로 할지, empty/error state로 처리할지 결정한다.

권장:
- backend가 프로젝트별 main version이 항상 하나 존재하도록 보장한다.
- frontend는 main version이 없으면 error state를 보여주고 work 조회를 중단한다.

## 6. Milestone 저장 API 없음

현재 UI 요구:
- 마일스톤 생성, 이동, 이름 변경, 삭제가 가능하다.

현재 backend guide:
- milestone domain endpoint를 찾지 못했다.

필요 결정:
- milestone을 frontend local state로 유지할지, backend 저장 domain을 추가할지 결정한다.

권장:
- 운영 공정표에 milestone이 필요하다면 `scheduleVersionId`에 종속되는 milestone CRUD API를 추가한다.

## 7. Project-scoped API의 `X-Project-Id` 누락/데이터 부재 에러 처리 필요

현재 UI 요구:
- 공정표 화면 진입 시 project 목록을 조회한 뒤 선택 project의 main schedule version을 불러온다.

현재 backend 계약:
- `backend/api/gantt-chart/gantt-chart-core-api.md`의 Common에는 project-scoped API가 `X-Project-Id` header를 사용한다고 되어 있다.
- `GET /api/scheduleVersion/getScheduleVersionList` detail에는 별도 request가 `null`로 되어 있어, header requirement가 endpoint detail만 봐서는 드러나지 않는다.

관찰된 현상:
- `GET /api/scheduleVersion/getScheduleVersionList`에서 `500`이 발생할 수 있다.
- dev API와 guide/source가 서로 다르면 project list 응답 id field가 `id`가 아닌 `projectId`일 가능성도 있다. 이 경우 frontend가 `X-Project-Id`를 잘못 구성할 수 있다.

필요 결정:
- `X-Project-Id`가 없거나 잘못된 경우 `500`이 아니라 `400` 또는 `401/403` 등 명확한 client error로 내려줘야 한다.
- 선택 project에 schedule version 초기 데이터가 없는 경우도 `500`이 아니라 빈 배열 또는 명시적 error response로 내려줘야 한다.

권장:
- guide detail에 `header X-Project-Id: UUID(required)`를 명시한다.
- project list 응답의 project id field를 `id` 또는 `projectId` 중 하나로 통일한다.
- backend는 project id 누락/권한 없음/main version 없음/초기 version 없음 케이스를 구분해서 4xx 또는 안정적인 empty response로 반환한다.
