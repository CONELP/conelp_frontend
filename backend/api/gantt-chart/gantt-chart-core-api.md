# Gantt Chart Core API

공정표 간트/일정 화면 연동에 필요한 핵심 API만 정리한다.

Source:
- `backend/api/api-list/details/project`
- `backend/api/api-list/details/scheduleVersion`
- `backend/api/api-list/details/work`
- `backend/api/api-list/details/workDep`
- `backend/api/api-list/details/schedule`

Common:
- Base path: `/api`
- Auth header: `Authorization: Bearer {accessToken}`
- Project scoped API header: `X-Project-Id: {projectId}`
- 날짜 형식: `YYYY-MM-DD`

## 1. Project / Calendar

### GET `/api/project/getProjectList`

목적:
로그인 사용자의 프로젝트 목록 조회.

Input:
- 없음

Return:
```json
[
  {
    "id": "UUID",
    "projectName": "String",
    "startDate": "LocalDate",
    "completionDate": "LocalDate"
  }
]
```

### GET `/api/project/getProjectCalendar/{projectId}`

목적:
프로젝트 기간, 날짜별 휴일, 날씨, 활성 상태 조회.

Input:
- path `projectId`: `UUID`

Return:
```json
{
  "projectStartDate": "LocalDate",
  "projectEndDate": "LocalDate",
  "dates": [
    {
      "date": "LocalDate",
      "dayOfWeek": "Integer",
      "weekNumber": "Integer",
      "isHoliday": "Boolean",
      "isHolManual": "Boolean",
      "holidayName": "String",
      "isActivated": "Boolean",
      "deactivatedReason": "String",
      "weather": "String",
      "minTemperature": "Integer",
      "maxTemperature": "Integer"
    }
  ]
}
```

### PUT `/api/project/updateWorkDate`

목적:
작업일의 휴일/활성 상태를 수동 변경하고 후속 일정 재계산.

Input:
- header `X-Project-Id`: `UUID`
- body `dates`: `LocalDate[]`, required
- body `isHoliday`: `Boolean?`
- body `isActivated`: `Boolean?`
- body `deactivatedReason`: `String?`, `isActivated=false`일 때 required

Return:
```json
null
```

Rules:
- `isHoliday`, `isActivated` 중 최소 하나는 필요하다.
- `isActivated=false`이면 `deactivatedReason`이 필요하다.
- 변경은 이후 `Work.completionDate`에 cascading recalculation을 일으킨다.

## 2. Schedule Version

### GET `/api/scheduleVersion/getScheduleVersionList`

목적:
공정표 버전 목록 조회.

Input:
- 없음

Return:
```json
[
  {
    "id": "Integer",
    "versionName": "String",
    "isMain": "Boolean"
  }
]
```

Rules:
- 프로젝트당 최대 5개.
- 최소 1개는 존재해야 한다.
- 프로젝트당 `isMain=true`는 1개만 가능하다.

### POST `/api/scheduleVersion/createScheduleVersion`

목적:
공정표 버전 생성.

Input:
- body `versionName`: `String`, required

Return:
```json
{
  "id": "Integer",
  "versionName": "String",
  "isMain": "Boolean"
}
```

Rules:
- 프로젝트당 최대 5개.
- 첫 버전은 자동으로 `isMain=true`.

### PUT `/api/scheduleVersion/updateScheduleVersion/{scheduleVersionId}`

목적:
공정표 버전명 또는 main 여부 수정.

Input:
- path `scheduleVersionId`: `Integer`, required
- body `versionName`: `String | null`
- body `isMain`: `Boolean | null`

Return:
```json
{
  "id": "Integer",
  "versionName": "String",
  "isMain": "Boolean"
}
```

Rules:
- `isMain=true`로 설정하면 같은 프로젝트의 다른 버전은 자동으로 `isMain=false`.

### POST `/api/scheduleVersion/duplicateScheduleVersion/{scheduleVersionId}`

목적:
공정표 버전 복제.

Input:
- path `scheduleVersionId`: `Integer`, required
- body `versionName`: `String`, required

Return:
```json
{
  "id": "Integer",
  "versionName": "String",
  "isMain": false
}
```

Rules:
- 프로젝트당 최대 5개.
- Work, junction, WorkPath, WorkDependency를 새 work id 기준으로 복제한다.
- 복제된 버전은 항상 `isMain=false`.

### DELETE `/api/scheduleVersion/deleteScheduleVersion/{scheduleVersionId}`

목적:
공정표 버전 삭제.

Input:
- path `scheduleVersionId`: `Integer`, required

Return:
```json
null
```

Rules:
- 버전이 1개만 남아 있으면 삭제할 수 없다.
- main 버전을 삭제하면 남은 버전 중 가장 작은 id가 main이 된다.
- 삭제 시 해당 버전의 WorkPath, WorkDependency, Work, junction이 함께 정리된다.
- `work_photo.work_id`는 `NULL`로 바뀌며 사진은 보존된다.

## 3. Work / Gantt Row

### GET `/api/work/getWorkListByVersion`

목적:
공정표 버전 기준 전체 work 목록 조회.

Input:
- query `scheduleVersionId`: `Integer`, required

Return:
```json
[
  {
    "workId": "Integer",
    "projectId": "UUID",
    "workName": "String",
    "startDate": "LocalDate",
    "workLeadTime": "Integer",
    "completionDate": "LocalDate",
    "isWorkingOnHoliday": "Boolean",
    "subWorkTypeId": "Integer",
    "division": "String",
    "workType": "String",
    "subWorkType": "String",
    "zoneIds": ["Integer"],
    "zoneNames": ["String"],
    "floorIds": ["Integer"],
    "floorNames": ["String"],
    "componentTypes": [
      {
        "componentDivisionId": "Integer",
        "componentTypeIds": ["Integer"]
      }
    ],
    "positionY": "Integer | null",
    "annotation": "String | null",
    "photos": ["WorkPhoto"]
  }
]
```

### GET `/api/work/getWorkListByPeriodAndVersion`

목적:
특정 기간과 겹치는 work만 조회. 간트 가상 스크롤/기간 로딩에 적합.

Input:
- query `scheduleVersionId`: `Integer`, required
- query `startDate`: `LocalDate`, required
- query `endDate`: `LocalDate`, required

Return:
```json
[
  {
    "workId": "Integer",
    "projectId": "UUID",
    "workName": "String",
    "startDate": "LocalDate",
    "workLeadTime": "Integer",
    "completionDate": "LocalDate",
    "isWorkingOnHoliday": "Boolean",
    "subWorkTypeId": "Integer",
    "division": "String",
    "workType": "String",
    "subWorkType": "String",
    "zoneIds": ["Integer"],
    "zoneNames": ["String"],
    "floorIds": ["Integer"],
    "floorNames": ["String"],
    "componentTypes": ["ComponentType"],
    "positionY": "Integer | null",
    "annotation": "String | null",
    "photos": ["WorkPhoto"]
  }
]
```

Rules:
- overlap condition: `work.startDate <= endDate && work.completionDate >= startDate`.

### GET `/api/work/getWork/{workId}`

목적:
work 단건 상세 조회.

Input:
- path `workId`: `Long`, required

Return:
```json
{
  "workId": "Integer",
  "...": "Work List Response common fields"
}
```

### POST `/api/work/createWork`

목적:
work 생성.

Input:
- body `startDate`: `LocalDate`, required
- body `workLeadTime`: `Integer`, required
- body `subWorkTypeId`: `Integer`, required
- body `annotation`: `String`
- body `scheduleVersionId`: `Integer`, required

Return:
```json
{
  "updatedWorks": ["Work"],
  "updatedWorkDeps": []
}
```

Rules:
- `completionDate = startDate + (workLeadTime - 1)` calendar days.
- 시작일이 휴일이어도 입력한 `startDate` 그대로 저장된다.
- 생성 시 `isWorkingOnHoliday`, `zoneIds`, `floorIds`, `componentTypes`는 각각 `true`, `[]`, `[]`, `[]`로 초기화되고 response에는 그대로 노출된다.

### PUT `/api/work/updateWork`

목적:
work batch 부분 수정. 날짜 변경 시 successor 일정이 재계산될 수 있다.

Input:
- body `items`: `WorkUpdateItem[]`, required, non-empty
- item `workId`: `Integer`, required
- item `startDate`: `LocalDate`
- item `workLeadTime`: `Integer`
- item `subWorkTypeId`: `Integer`
- item `positionY`: `Integer`
- item `zoneIds`: `Integer[]`
- item `floorIds`: `Integer[]`
- item `componentTypes`: `{ componentDivisionId: Integer, componentTypeIds: Integer[] }[]`
- item `annotation`: `String`, empty string removes annotation
- item `workName`: `String`, optional, saved as-is when provided

Return:
```json
{
  "updatedWorks": ["Work"],
  "updatedWorkDeps": ["WorkDependency"]
}
```

Rules:
- 제공한 필드만 변경된다.
- `workName == null`이면 기존 동작을 유지하고, 관련 필드 변경 시 backend가 작업명을 자동 재생성할 수 있다.
- `workName != null`이면 자동 생성을 무시하고 입력값을 그대로 저장한다. 빈 문자열 `""`도 그대로 저장된다.
- 날짜 변경은 WorkDependency successor에 cascade된다.
- 선행작업을 이동하면 후행작업은 기존 `lagDays`를 유지하며 함께 이동한다.
- 후행작업을 이동하면 선행작업은 움직이지 않고 incoming dependency의 `lagDays`가 재계산된다.
- 후행작업 `startDate`가 선행작업 `startDate`보다 빠르면 400 에러를 반환한다.

### DELETE `/api/work/deleteWork/{workId}`

목적:
work 삭제.

Input:
- path `workId`: `Long`, required

Return:
```json
{
  "updatedWorks": [],
  "updatedWorkDeps": ["WorkDependency"]
}
```

Rules:
- 삭제된 work와 연결된 dependency 변경분이 `updatedWorkDeps`로 반환될 수 있다.

## 4. Work Dependency / Gantt Link

### GET `/api/workDep/getWorkDepListByVersion`

목적:
공정표 버전 기준 선후행 관계 목록 조회.

Input:
- query `scheduleVersionId`: `Integer`, required

Return:
```json
[
  {
    "id": "Integer",
    "sourceWorkId": "Integer",
    "targetWorkId": "Integer",
    "lagDays": "Integer",
    "scheduleVersionId": "Integer"
  }
]
```

### POST `/api/workDep/createWorkDep`

목적:
선후행 관계 생성.

Input:
- body `sourceWorkId`: `Integer`, required
- body `targetWorkId`: `Integer`, required
- body `lagDays`: `Integer`, required, calendar days
- body `scheduleVersionId`: `Integer`, required

Return:
```json
{
  "updatedWorks": ["Work"],
  "updatedWorkDeps": ["WorkDependency"]
}
```

Rules:
- duplicate, self-reference는 막는다.
- `lagDays`는 필수이며 calendar days 단위다.
- 생성 후 DFS cascade로 successor 날짜를 자동 조정한다.
- `lagDays=0`: 다음 날 follow
- `lagDays>0`: N-day gap
- `lagDays<0`: N-day overlap

### PUT `/api/workDep/updateWorkDep/{workDepId}`

목적:
선후행 관계의 `lagDays` 수정.

Input:
- path `workDepId`: `Integer`, required
- body `lagDays`: `Integer`, required, calendar days

Return:
```json
{
  "updatedWorks": ["Work"],
  "updatedWorkDeps": ["WorkDependency"]
}
```

Rules:
- `lagDays`만 수정 가능하다.
- `lagDays`는 필수이며 calendar days 단위다.
- 수정 후 DFS cascade가 실행된다.

### DELETE `/api/workDep/deleteWorkDep/{workDepId}`

목적:
선후행 관계 삭제.

Input:
- path `workDepId`: `Integer`, required

Return:
```json
{
  "updatedWorks": ["Work"],
  "updatedWorkDeps": ["WorkDependency"]
}
```

Rules:
- 삭제 후 DFS cascade로 successor work가 앞으로 당겨질 수 있다.

## 5. Schedule Excel Export

### POST `/api/schedule/create3WeekSchedule`

목적:
3주 공정표 Excel 생성 및 파일 바이트 직접 응답.

Input:
- body `scheduleVersionId`: `Integer`, required
- body `excludedSubWorkTypeIds`: `Integer[]`

Return:
```text
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=<생성파일명>.xlsx
Body: xlsx bytes
```

Rules:
- 오늘 기준 지난주부터 다음주까지 포함한다.
- 지정된 schedule version의 work만 포함한다.
- `excludedSubWorkTypeIds`에 포함된 work는 제외한다.
- 제외된 work가 path 안에 있으면 skip하고 다음 successor에 직접 연결한다.

### POST `/api/schedule/create3MonthSchedule`

목적:
3개월 공정표 Excel 생성 및 파일 바이트 직접 응답.

Input:
- body `scheduleVersionId`: `Integer`, required
- body `excludedSubWorkTypeIds`: `Integer[]`

Return:
```text
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=<생성파일명>.xlsx
Body: xlsx bytes
```

Rules:
- 이전 달 1일부터 다음 달 말일까지 포함한다.
- 지정된 schedule version의 work만 포함한다.
- `excludedSubWorkTypeIds`에 포함된 work는 제외한다.
- 제외된 work가 path 안에 있으면 skip하고 다음 successor에 직접 연결한다.
