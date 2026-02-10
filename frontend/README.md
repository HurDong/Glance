# Glance Frontend

금융 소셜 포트폴리오 플랫폼 'Glance'의 프론트엔드 프로젝트입니다.

## 🚀 Tech Stack
- **Framework**: React 19 + Vite
- **Mobile**: Capacitor 6 (iOS/Android 지원)
- **Styling**: Tailwind CSS + Shadcn/UI primitives
- **State**: TanStack Query (Backend API) + Zustand (Client State)
- **Communication**: Axios (with Interceptors)

## 📁 Structure
- `src/components/ui`: Shadcn/UI 기본 컴포넌트
- `src/components/shared`: 공통 레이아웃 및 모달
- `src/components/domain`: 포트폴리오, 주식 등 비즈니스 로직 컴포넌트
- `src/hooks`: 커스텀 훅
- `src/services`: API 호출 로직
- `src/store`: Zustand 상태 저장소

## 🛠 Getting Started

### Prerequisites
- Node.js 20.x
- pnpm

### Installation
```bash
cd frontend
pnpm install
```

### Development
```bash
pnpm dev
```

### Mobile Build
```bash
pnpm build
npx cap copy
npx cap open ios  # or android
```
