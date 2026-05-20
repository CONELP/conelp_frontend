# 공정표 Work 동기화 및 Upsert 전환 Plan

공정표 work 동기화 안정화

이 문서는 공정표 화면에는 item이 남아 있지만 백엔드에는 해당 `workId`가 없어 `work not found`가 발생하는 동기화 깨짐을 구조적으로 줄이기 위한 실행 계획이다. 현재 프론트에는 임시 안전망으로 누락 work를 프론트 상태 기준으로 재생성하는 복구 로직을 두었지만, 장기적으로는 백엔드 upsert와 프론트 local id 기반 sync layer로 옮겨야 한다.

`공정표 작업의 화면 상태와 서버 상태를 client stable id 기준으로 동기화해 create/update 순서 꼬임과 누락 work 오류를 제거한다.`

## 현재 기준점

- 프론트는 낙관적 UI로 bar를 먼저 만들고, 이후 backend response의 `workId`를 item에 반영한다.
- `src/features/desktop-schedule/state/workflows/useDesktopScheduleWorkPersistence.ts`에는 임시 안전망으로 `updateWorkWithFrontendRecovery`를 둔다.
- `work not found: {workId}`가 발생하면 프론트 item의 `startDate`, `durationDays`, `rowId`의 `subWorkTypeId`, `name`으로 backend work를 다시 만들고 원래 update를 재시도한다.
- 이 안전망은 사용자 변경사항 손실을 줄이기 위한 보정이며, 최종 구조는 아니다.

## 고정 원칙

- 화면 상태의 주 식별자는 server `workId`가 아니라 client stable id가 되어야 한다.
- server `workId`는 동기화 결과로 받은 canonical id이며, 없거나 바뀔 수 있는 값으로 다룬다.
- create 직후 rename, move, resize, connection 생성이 이어져도 local id 기준으로 mutation 순서가 보장되어야 한다.
- backend upsert는 blind upsert가 아니라 `(scheduleVersionId, clientWorkId)` 기준 idempotent upsert여야 한다.
- 삭제된 work가 오래된 프론트 상태로 부활하지 않도록 revision 또는 tombstone 정책을 둔다.
- backend 오류는 문자열 파싱이 아니라 `{ code, workId, clientWorkId }` 형태의 구조화된 응답으로 처리한다.

## Stage 1. 동기화 실패 케이스 인벤토리 고정

목표:
사용자가 어떤 순서로 작업했을 때 프론트 item과 backend work가 갈라지는지 재현 가능한 케이스로 고정한다.

커밋 메시지:
`docs: define schedule work sync failure cases`

결과물:
- `docs/plans/schedule-work-sync-upsert-plan.md`
- 공정표 work 동기화 실패 케이스 목록

체크포인트:
- [ ] 복사/붙여넣기 직후 이름 변경 시 `work not found`가 발생하는지 재현한다
- [ ] 복사/붙여넣기 직후 이동 또는 리사이즈 시 `work not found`가 발생하는지 재현한다
- [ ] create 요청 성공 전에 version 전환 또는 reload가 일어나는 케이스를 확인한다
- [ ] 삭제된 work를 오래된 프론트 상태가 다시 update하는 케이스를 확인한다
- [ ] 현재 `updateWorkWithFrontendRecovery`가 어떤 케이스를 흡수하고 어떤 케이스를 흡수하지 못하는지 표로 정리한다

완료 기준:
동기화 깨짐을 만들 수 있는 사용자 행동과 네트워크/API 조건이 케이스 이름으로 분류되어, 구현자가 테스트 시나리오로 바로 옮길 수 있다.

## Stage 2. Client stable id와 backend upsert 계약 정의

목표:
프론트 item과 backend work를 server `workId`가 아니라 client stable id로 연결하는 API 계약을 고정한다.

커밋 메시지:
`docs: define schedule work upsert contract`

결과물:
- `clientWorkId` 기반 work upsert request/response 계약
- backend unique key와 conflict 정책

체크포인트:
- [ ] `DesktopScheduleItem`에 `clientWorkId` 또는 동등한 stable id 필드를 추가한다고 정의한다
- [ ] backend work table에 `(scheduleVersionId, clientWorkId)` unique constraint를 둔다고 정의한다
- [ ] `createWork`와 `updateWork`를 대체할 upsert endpoint 또는 기존 endpoint 확장 방식을 정한다
- [ ] upsert payload에 `scheduleVersionId`, `clientWorkId`, `subWorkTypeId`, `startDate`, `workLeadTime`, `workName`을 포함한다고 정의한다
- [ ] upsert response는 canonical `workId`, `clientWorkId`, 최신 work snapshot을 반환한다고 정의한다
- [ ] 삭제된 work의 `clientWorkId`로 upsert가 들어올 때 tombstone conflict를 반환할지 새 work로 복구할지 정책을 정한다
- [ ] `work not found` 응답을 `{ code: "WORK_NOT_FOUND", workId, clientWorkId }` 형태로 바꾼다고 정의한다

완료 기준:
프론트와 백엔드 구현자가 같은 request/response 예시만 보고도 create, update, recreate, conflict를 같은 의미로 구현할 수 있다.

## Stage 3. 프론트 Sync Layer와 Mutation Queue 설계

목표:
공정표 UI action이 backend 요청 순서에 흔들리지 않도록 local id 기준 mutation queue를 둔다.

커밋 메시지:
`refactor: design schedule work mutation queue`

결과물:
- 공정표 work sync layer 설계
- mutation queue 상태 모델

체크포인트:
- [ ] `workId`와 `clientWorkId`를 분리한 item 상태 모델을 정의한다
- [ ] create, rename, move, resize, delete, connection 생성이 같은 queue를 통과한다고 정의한다
- [ ] 같은 `clientWorkId`에 대한 mutation은 순차 실행한다고 정의한다
- [ ] create가 pending인 item에 update가 들어오면 server `workId` 없이도 queue에 보관한다고 정의한다
- [ ] upsert 성공 시 local item의 `workId`, `syncStatus`, `lastSyncedAt`을 갱신한다고 정의한다
- [ ] retry 가능한 오류와 즉시 rollback해야 하는 오류를 구분한다
- [ ] 현재 `pendingWorkCreationByItemId`, `resolvedWorkIdByPendingItemId`를 queue 상태로 흡수하는 migration 방식을 정한다

완료 기준:
프론트에서 빠른 연속 편집을 해도 어떤 mutation이 어떤 순서로 서버에 전달되는지 상태 다이어그램 없이 코드로 구현할 수 있다.

## Stage 4. Backend Upsert 구현

목표:
백엔드가 프론트의 현재 work 상태를 idempotent하게 수용하고 canonical work snapshot을 돌려주게 만든다.

커밋 메시지:
`feat: add schedule work upsert`

결과물:
- work upsert API
- structured error response
- tombstone 또는 revision 기반 conflict 처리

체크포인트:
- [ ] work create 시 `clientWorkId`를 저장한다
- [ ] 같은 `(scheduleVersionId, clientWorkId)` 요청은 기존 work를 update한다
- [ ] upsert가 기존 work를 찾으면 이름, 시작일, 기간, 세부공종을 갱신한다
- [ ] upsert가 기존 work를 못 찾으면 새 work를 생성한다
- [ ] 삭제된 work의 `clientWorkId` 처리 정책을 구현한다
- [ ] update/delete API의 not found 오류를 structured error로 바꾼다
- [ ] upsert response에 `updatedWorks`와 최신 canonical work를 포함한다

완료 기준:
같은 upsert 요청을 여러 번 보내도 중복 work가 생기지 않고, 누락된 server `workId` 대신 `clientWorkId`로 work를 복구하거나 conflict를 명확히 반환한다.

## Stage 5. Frontend Upsert 전환

목표:
프론트 공정표 work 저장 경로가 server `workId` 의존 update에서 client stable id 기반 upsert로 전환된다.

커밋 메시지:
`refactor: switch schedule work sync to upsert`

결과물:
- `src/features/desktop-schedule` work persistence 전환
- 임시 `updateWorkWithFrontendRecovery` 제거 또는 축소

체크포인트:
- [ ] 신규 item 생성 시 `clientWorkId`를 즉시 발급한다
- [ ] 복사/붙여넣기된 item에도 새 `clientWorkId`를 발급한다
- [ ] rename, move, resize 저장을 upsert payload로 보낸다
- [ ] server response의 canonical `workId`를 local item에 반영한다
- [ ] `workId`가 없는 pending item도 rename, move, resize를 queue에 쌓을 수 있게 한다
- [ ] `updateWorkWithFrontendRecovery`를 제거하거나 legacy fallback으로만 남긴다
- [ ] loaded data mapper가 `clientWorkId`를 유지하도록 API mapper를 갱신한다

완료 기준:
프론트가 `work not found` 문자열을 파싱하지 않아도 빠른 연속 편집과 reload 이후 저장을 안정적으로 처리한다.

## Stage 6. 삭제와 충돌 정책 정리

목표:
upsert가 사용자가 의도적으로 삭제한 work를 조용히 되살리지 않도록 삭제와 충돌 상태를 제품 정책으로 닫는다.

커밋 메시지:
`feat: handle schedule work sync conflicts`

결과물:
- 삭제 tombstone 또는 revision conflict 처리
- 사용자 안내 copy와 복구 행동

체크포인트:
- [ ] 삭제 API가 `clientWorkId` tombstone 또는 revision을 남기는지 결정한다
- [ ] 오래된 revision으로 upsert가 들어오면 conflict 응답을 반환한다
- [ ] conflict 발생 시 프론트가 reload, 복구, 취소 중 어떤 행동을 제공할지 정한다
- [ ] 같은 work를 두 탭에서 편집할 때 나중 요청이 덮어써도 되는 범위를 정한다
- [ ] connection이 삭제된 work를 가리킬 때 제거 또는 재연결 정책을 정한다

완료 기준:
사용자가 삭제한 work가 예고 없이 다시 나타나지 않고, 충돌 상황에서 앱이 어떤 상태로 돌아가는지 화면 copy와 데이터 처리 모두 명확하다.

## Stage 7. QA와 수용 기준 검증

목표:
copy/paste, rename, move, resize, delete, version 전환이 섞인 실제 사용 흐름에서 동기화 오류가 사라졌는지 확인한다.

커밋 메시지:
`test: verify schedule work sync upsert flow`

결과물:
- 공정표 work sync 수용 테스트
- 회귀 체크리스트

체크포인트:
- [ ] 작업 5일짜리 복사/붙여넣기 후 기간이 유지되는지 확인한다
- [ ] 붙여넣기 직후 이름 변경이 성공하고 새로고침 후에도 유지되는지 확인한다
- [ ] 붙여넣기 직후 이동/리사이즈가 성공하고 새로고침 후에도 유지되는지 확인한다
- [ ] create pending 상태에서 version 전환 후 돌아와도 중복 work가 생기지 않는지 확인한다
- [ ] 삭제한 work의 오래된 upsert가 conflict로 처리되는지 확인한다
- [ ] 마일스톤과 작업을 함께 복사/붙여넣기해도 work sync가 깨지지 않는지 확인한다
- [ ] backend structured error가 toast와 analytics에 올바른 code로 기록되는지 확인한다

완료 기준:
`work not found`로 인한 사용자 변경사항 rollback이 재현되지 않고, 실패 시에도 구조화된 conflict 또는 retry 상태로 사용자에게 설명된다.
