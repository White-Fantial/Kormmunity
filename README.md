# NZ 한인 커뮤니티 보드 (Kakao)

뉴질랜드 거주 한인을 위한 한국어 커뮤니티 마켓 보드입니다. 카카오 오픈채팅 스타일의 빠른 글쓰기 경험을 목표로 하며, 현재 Phase 0~5 MVP가 구현되어 있습니다.

## Tech Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL

## Implemented (Phase 0~5)
- Next.js App Router 프로젝트 기본 구조
- Prisma 스키마 (User, City, Category, Post, PostImage, Comment, ModerationAction, UserRestriction)
- 도시/카테고리 seed 데이터
- Kakao OAuth 교체 가능한 로그인 placeholder
- 권한 helper (USER, COORDINATOR, ADMIN)
- 게시글 MVP
  - 글 작성 (제목 optional, 본문/카테고리/지역 required)
  - 팔아요 카테고리 가격 required
  - 목록/상세/내 글
  - 카테고리/지역 필터
  - 본인 글 수정/삭제
  - 판매글 판매완료 처리
- 이미지 업로드 (Cloudinary 연동)
  - 글 작성/수정 시 이미지 업로드
  - 목록 썸네일/상세 갤러리 표시
- 댓글 기능
  - 게시글 상세에서 댓글 작성/조회
  - 본인 댓글 삭제 (코디네이터/관리자 삭제 가능)
- 한국어 UI 라벨/메시지 반영

## Not Yet Implemented (Phase 6+)
- 코디네이터/관리자 대시보드
- 실제 Kakao OAuth/NextAuth 연동

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
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `SESSION_MAX_AGE_SECONDS` (기본값 604800초 = 7일)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Important Notes
- 로그인은 현재 placeholder로 구현되어 있으며, `app/login/actions.ts`의 TODO 지점에서 Kakao OAuth로 교체하도록 설계했습니다.
- 이미지 업로드는 현재 Cloudinary API 환경 변수 설정이 필요합니다.

## Next Phases
- **Phase 6**: 검색/고급 필터 확장
- **Phase 7**: 카카오 연락 링크 고도화
- **Phase 8~9**: 코디네이터/관리자 운영 기능
- **Phase 10**: 모바일 UX 폴리시 및 운영 안정화
