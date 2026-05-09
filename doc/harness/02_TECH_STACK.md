# Tech Stack

## Recommended Stack
- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Database: PostgreSQL
- ORM: Prisma
- Auth: NextAuth/Auth.js with Kakao provider, or custom Kakao OAuth flow
- Image Upload: Cloudinary free tier, UploadThing, Supabase Storage, or S3-compatible storage
- Hosting: Vercel, AWS Amplify, or similar

## Suggested MVP Choices
초기 MVP에서는 다음 조합을 권장한다:

- Next.js App Router
- Prisma + PostgreSQL
- Kakao OAuth login
- Cloudinary free tier for image upload
- Tailwind CSS

## Image Upload Strategy
사진은 DB에 직접 저장하지 않는다.

Recommended flow:
1. 사용자가 이미지 선택
2. 서버 또는 signed upload endpoint를 통해 Cloudinary/UploadThing/Supabase Storage에 업로드
3. 반환된 image URL과 public id를 DB에 저장
4. 게시글에는 DB에 저장된 image URL을 표시

DB 저장 필드 예시:
- id
- postId
- url
- provider
- providerPublicId
- width
- height
- sortOrder

## Kakao Login Notes
카카오 로그인은 OAuth 기반으로 처리한다.

주의:
- 카카오 로그인만으로 임의 사용자에게 자동 메시지 전송이 항상 가능한 것은 아니다.
- 실제 1:1 메시지 전송 API는 정책/권한/동의 범위 제한이 있을 수 있다.
- 따라서 MVP에서는 사용자가 오픈채팅 링크 또는 연락용 카카오 링크를 직접 등록하는 방식을 우선한다.

## Environment Variables
예시:

```env
DATABASE_URL="postgresql://..."
KAKAO_CLIENT_ID=""
KAKAO_CLIENT_SECRET=""
KAKAO_REDIRECT_URI=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL=""
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```
