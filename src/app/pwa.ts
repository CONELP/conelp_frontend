import { registerSW } from "virtual:pwa-register";

// autoUpdate: 새 서비스워커는 백그라운드에서 설치된다. 적용은 다음 로드/내비게이션 때
// 자연스럽게 일어나며, 작성 중인 폼이 날아가지 않도록 즉시 강제 reload는 하지 않는다.
registerSW({ immediate: true });
