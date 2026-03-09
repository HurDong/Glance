# Glance Mobile

기존 `frontend`와 별도로 운영하는 모바일 전용 앱입니다. 백엔드는 기존 Spring Boot API를 그대로 사용하고, UI와 화면 흐름만 모바일 중심으로 새로 구성했습니다.

## 실행

1. `mobile/.env.example`를 참고해 `.env`를 만듭니다.
2. `mobile` 폴더에서 `pnpm install`
3. `pnpm run dev`

기본 개발 주소는 `http://localhost:4174`입니다.

## 현재 포함한 모바일 MVP

- 로그인 / 회원가입
- 홈 대시보드
- 종목 탐색 / 상세 / 관심종목 토글
- 포트폴리오 생성 / 대표 설정 / 종목 추가
- 그룹 생성 / 초대코드 참여 / 그룹 목록

## 네이티브 앱 확장

- `pnpm run build`
- `pnpm run cap:sync`
- 이후 Android / iOS 프로젝트를 열어 배포 흐름을 이어갈 수 있습니다.
