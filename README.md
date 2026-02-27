# Glance - 주식과 소셜의 만남

**Glance**는 사용자간 소통하며 함께 성장하는 **'소셜 기반 주식 투자 인사이트 플랫폼'**입니다.  
> ⚠️ **안내:** 본 서비스는 **실제 주식 거래 기능을 제공하지 않습니다.**  

단순한 형태의 금융 데이터를 제공하는 것을 넘어, 현재 주식 시세와 차트를 확인하고 다른 투자자들과 포트폴리오를 공유하며 **투자 인사이트를 얻는 것**을 최종 목표로 합니다. 주간 챌린지 등의 재미 요소를 결합하여 초보자와 숙련자가 모두 즐길 수 있는 커뮤니티 기반 투자 환경을 제공합니다.

---

## 🎯 서비스 핵심 목표 (Our Goal)

1. **투자 인사이트 공유:** 타인의 포트폴리오를 참고하고 자신의 투자 성과를 공유함으로써 집단 지성을 통한 투자 인사이트 획득.
2. **실시간 정보 제공:** 거래 지원 없이 오직 정확한 시장 데이터(현재가, 차트 등) 제공에 집중하여 분석의 정확도 향상.
3. **투자의 즐거움 (Gamification):** 주간 챌린지 및 그룹 시스템을 통해 딱딱한 금융 투자에 소셜 네트워크의 재미 추가.

## ✨ 주요 기능 (Main Features)

- **Market Overview (시장 개요)**
  - 실시간 증시 동향 및 주요 주식의 현재가 분/일/월/년 단위 차트 제공
  - KIS(한국투자증권) API 및 Finnhub 연동을 통한 신뢰성 있는 실시간 및 역사적 시세 정보 수집
  - 환율 및 마켓 인덱스를 시각적인 그래프로 제공하여 직관적인 정보 전달
- **Group Feed & Challenge (소셜 및 게이미피케이션)**
  - 그룹 생성 및 가입을 통해 사용자간 포트폴리오 수익률 공유
  - '주간 챌린지' 기능을 통해 그룹 내에서 투자 수익률을 경쟁하며 흥미 유발
- **Portfolio Management (개인 포트폴리오 관리)**
  - 관심 주식 및 보유 자산의 변동 추이를 추적하고 관리
  - 필요에 따라 자신의 포트폴리오를 다른 사람에게 공유
- **Social & Search (소셜 및 사용자 검색)**
  - 종목 티커 및 회사명 검색 지원
  - 다른 유저를 검색하여 그들의 투자 노하우와 인사이트 교류

---

## 🛠 기술 스택 (Tech Stack)

### 🖥 Frontend
- **Framework & Tooling**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide React
- **State Management**: Zustand, React Query (`@tanstack/react-query`)
- **Data Visualization**: Recharts (동적 차트 렌더링)
- **Communication**: Axios, WebSocket (`@stomp/stompjs`, `sockjs-client`)

### ⚙️ Backend
- **Core Platform**: Spring Boot 3.2.2, Java 17
- **Database Architecture**: 
  - MySQL, Spring Data JPA, QueryDSL (RDBMS 데이터 처리)
  - Redis (인메모리 기반 WebSocket 세션 관리 및 실시간 데이터 캐싱)
- **External Data Pipeline**: 
  - KIS(한국투자증권) API 연동: 실시간 주식 현재가, 차트 히스토리 수집
  - Yahoo Finance / Finnhub 연동: 해외 시장 데이터 확장
- **Real-time Engine**: WebSocket (STOMP)을 활용한 주식 시세 브로드캐스팅 시스템
- **Security & Jobs**: Spring Security, JWT 기반 인증, Spring Batch

---

*본 프로젝트는 실시간 데이터 처리와 사용자의 소셜 상호작용이 강조된 모던 금융 커뮤니티 구현을 목표로 하고 있습니다.*
