# NZ 한인 커뮤니티 보드 (Kakao)

뉴질랜드 거주 한인을 위한 한국어 커뮤니티 마켓 보드입니다. 카카오 오픈채팅 스타일의 빠른 글쓰기 경험을 목표로 하며, 현재 Phase 0~10 범위의 기본 기능이 구현되어 있습니다.

## Tech Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL

## Implemented (Phase 0~10)
- Next.js App Router 프로젝트 기본 구조
- Prisma 스키마 (User, City, Category, Post, PostImage, Comment, ModerationAction, UserRestriction)
- 도시/카테고리 seed 데이터
- 실제 Kakao OAuth 연동 (Phase 11)
  - `/api/auth/kakao` → 카카오 인증 URL로 리다이렉트 (state CSRF 보호)
  - `/api/auth/kakao/callback` → 코드 교환, 사용자 정보 조회, 세션 생성
  - 환경 변수 미설정 시 개발용 임시 로그인 폴백
  - 카카오 프로필 이미지 자동 동기화
- 권한 helper (USER, COORDINATOR, ADMIN)
- 게시글 MVP
  - 글 작성 (제목 optional, 본문/카테고리 required, 지역은 프로필 기본 지역 사용)
  - 팔아요 카테고리 가격 required
  - 목록/상세/내 글
  - 카테고리/지역 다중 필터
  - 본인 글 수정/삭제
  - 판매글 판매완료 처리
- 이미지 업로드 (Cloudinary 연동)
  - 글 작성/수정 시 이미지 업로드
  - 목록 썸네일/상세 갤러리 표시
- 댓글 기능
  - 게시글 상세에서 댓글 작성/조회
  - 본인 댓글 삭제 (코디네이터/관리자 삭제 가능)
- 카카오 연락 흐름
  - 프로필 기본 지역 등록
  - 프로필 오픈채팅 링크 등록
  - 게시글별 연락 링크 override
  - 게시글 상세 연락 버튼/미등록 fallback
- 코디네이터 운영 기능
  - 보류/재게시
  - 사용자 관리자 검토 요청
- 관리자 기능
  - 사용자 역할/상태 관리
  - 게시글/댓글 관리
  - 게시글 상단 고정/해제
  - 카테고리/도시 관리
- Phase 10 폴리시
  - 모바일 네비게이션/카드 UI 개선
  - 라우트 로딩 스켈레톤
  - 에러 경계 UI (route/global)
  - SEO 메타데이터 보강 (layout + 목록/상세)
  - 기본 분석 이벤트 로깅 (클라이언트 전환 + 서버 액션)
  - 게시글/댓글 작성 rate limit + spam 체크
- 한국어 UI 라벨/메시지 반영
- 검색/알림
  - 제목/본문/작성자 닉네임 통합 검색
  - 검색어 저장 및 카카오톡 알림 수신 여부 설정
  - 조건 매칭 새 글 등록 시 카카오톡 메시지 자동 발송 (글 링크/사진 링크 포함)
- category-based configurable post tag/status system
  - 카테고리별 태그 옵션 관리(활성/기본/정렬/색상)
  - 글 작성/수정/상세/목록에서 설정 기반 태그 선택 및 표시

## Not Yet Implemented
- 분석 이벤트 외부 대시보드 연동
- 검색 고도화 및 운영 자동화

## Local Setup
1. 의존성 설치
   ```bash
   npm install
   ```
2. 환경 변수 설정
   ```bash
   cp .env.example .env
   ```
3. Prisma Client 생성
   ```bash
   npm run prisma:generate
   ```
4. DB 마이그레이션 실행
   ```bash
   npm run prisma:migrate -- --name init
   ```
5. Seed 실행
   ```bash
   npm run prisma:seed
   ```
6. 개발 서버 실행
   ```bash
   npm run dev
   ```

## Environment Variables
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_REDIRECT_URI`
- `KAKAO_AUTH_SCOPE` (기본값 `talk_message`)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL` (기본 SEO 메타데이터 base URL)
- `SESSION_MAX_AGE_SECONDS` (기본값 604800초 = 7일)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Important Notes
- 카카오 로그인은 `KAKAO_CLIENT_ID`와 `KAKAO_REDIRECT_URI` 환경 변수가 설정된 경우 실제 OAuth 흐름을 사용합니다. 미설정 시 개발용 임시 로그인으로 폴백됩니다.
- 카카오 개발자 콘솔(https://developers.kakao.com)에서 앱을 등록하고, `KAKAO_REDIRECT_URI`에 `/api/auth/kakao/callback` 경로를 등록해야 합니다.
- 이미지 업로드는 현재 Cloudinary API 환경 변수 설정이 필요합니다.

## Next Focus
- 분석 이벤트 외부 대시보드 연동
- 검색 고도화 및 운영 자동화
