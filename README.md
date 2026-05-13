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
  - 카테고리별 quick comment template 버튼
  - Comment-before-contact 게이트 및 댓글 작성 후 즉시 Kakao 연락 해제
- Neighbour Warmth 상호작용
  - 게시글/댓글 좋아요, 베스트 댓글 지정
  - 이웃온기 점수(0~100) 및 단계 라벨 표시
- 카카오 연락 흐름
  - 프로필 기본 지역 등록
  - 프로필 오픈채팅 링크 등록
  - 게시글별 연락 링크 override
  - 게시글 상세 연락 버튼/미등록 fallback
  - 카테고리 기본값 기반 `Require comment before Kakao contact` 설정
  - 판매/나눔 등 투명성이 중요한 글에서 공개 댓글 후 1회 연락 해제
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
- Unified Post Card system
  - 공통 `PostCard` variant 시스템(`featured` / `compact` / `minimal`)으로 목록 UI 통합
  - `/posts`는 featured, `/my/posts`·`/my/saved`·`/users/[userId]`는 compact, `/my/notifications`는 minimal 적용
  - 공통 Badge 컴포넌트(`components/posts/post-badge.tsx`) 기반 태그 스타일 통일
- category-based configurable post tag/status system
  - 카테고리별 태그 옵션 관리(활성/기본/정렬/색상)
  - 글 작성/수정/상세/목록에서 설정 기반 태그 선택 및 표시
- **커뮤니티 스코어 기반 자동 보류 시스템 (internal)**
  - Post/Comment에 내부 `communityScore` 추가
  - 좋아요·신고·베스트댓글·운영 조치에 따른 점수 자동 반영 (행위자 `neighbourWarmth` 가중치 적용)
  - 임계값(-8 게시글 / -5 댓글) 이하 시 자동 `HELD` 처리
  - 보류 게시글: 일반 사용자에게 검토 중 메시지 표시, 운영/관리자만 전문 열람 가능
  - 보류 댓글: 일반 사용자에게 플레이스홀더 텍스트 표시, 운영/관리자만 전문 열람 가능
  - `CommunityScoreEvent` 감사 로그 테이블 추가
  - 코디네이터/관리자 화면에 점수 및 신고 수 표시
  - 상세 문서: `docs/community-score-moderation.md`

## Comment-before-contact system
- 카테고리별로 `requireCommentBeforeContactDefault` 값을 설정할 수 있습니다.
- 게시글 작성자는 글 단위로 기본값을 override 할 수 있습니다.
- 글 작성자 본인과 코디네이터/관리자는 게이트를 우회합니다.
- 일반 사용자는 삭제/보류되지 않은 댓글 1개만 남겨도 Kakao 연락 버튼이 즉시 열립니다.

## Category quick comment templates
- 카테고리별 `quickCommentTemplates` JSON 배열로 상세 페이지 quick reply chip을 구성합니다.
- SALE / GIVEAWAY / RECRUIT / QUESTION 카테고리는 기본 quick template seed를 제공합니다.
- quick template 클릭 시 댓글 입력창이 즉시 채워져 공개 상호작용을 더 빠르게 유도합니다.

## Community engagement strategy
- 거래/나눔 글에서 비공개 연락 전에 공개 댓글을 유도해 중복 문의를 줄입니다.
- quick comment template로 첫 댓글 진입 장벽을 낮춰 커뮤니티 대화를 늘립니다.
- 공개 질문/답변이 누적되어 같은 문의를 반복하지 않아도 되는 정보 자산을 만듭니다.

## Trade transparency benefits
- “Still available?” 같은 기본 질문을 공개 댓글로 남기면 다른 사용자도 상태를 확인할 수 있습니다.
- 픽업 위치/가능 시간/가격 협의 여부가 공개되면 거래 신뢰도와 속도가 높아집니다.
- 삭제/보류 댓글은 연락 해제 조건에서 제외되어 운영 투명성을 유지합니다.

## Not Yet Implemented
- 분석 이벤트 외부 대시보드 연동
- 검색 고도화 및 운영 자동화

## Post Card Component Structure
```txt
components/posts/
  PostCard/
   ├─ PostCard.tsx
   ├─ PostCardFeatured.tsx
   ├─ PostCardCompact.tsx
   ├─ PostCardMinimal.tsx
   ├─ PostCardActions.tsx
   ├─ PostCardMeta.tsx
   ├─ PostCardBadges.tsx
   └─ types.ts
```

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
- AWS Amplify 배포 시 `NEXT_PUBLIC_SITE_URL`(권장) 또는 `NEXTAUTH_URL`을 반드시 설정해야 SEO 메타데이터와 카카오 알림 링크가 올바른 절대 URL을 사용합니다.

## Next Focus
- 분석 이벤트 외부 대시보드 연동
- 검색 고도화 및 운영 자동화
