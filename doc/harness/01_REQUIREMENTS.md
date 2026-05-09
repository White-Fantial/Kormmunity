# Requirements

## Functional Requirements

### Authentication
- 사용자는 카카오 로그인으로 가입/로그인할 수 있어야 한다.
- 로그인 후 기본 프로필 정보를 저장한다.
- 저장 가능한 기본 정보:
  - Kakao user id
  - display name
  - profile image URL
  - optional contact/open chat URL or Kakao contact link
  - role
  - status

### Posts
- 사용자는 글을 작성할 수 있다.
- 글은 제목 없이 작성 가능해야 한다.
- 제목은 선택 입력값이다.
- 본문은 필수다.
- 카테고리는 필수다.
- 지역/도시는 필수다.
- 사진을 여러 장 첨부할 수 있다.
- 판매글은 가격을 지정할 수 있다.
- 판매글은 판매 완료 상태로 변경할 수 있다.
- 글 상태는 최소 다음을 가진다:
  - PUBLISHED
  - HELD
  - DELETED
  - SOLD

### Categories
초기 카테고리:
- 궁금해요
- 도와주세요
- 팔아요
- 무료나눔

추후 확장 가능해야 한다.

### Cities / Regions
초기 뉴질랜드 주요 도시:
- Auckland
- Wellington
- Christchurch
- Hamilton
- Tauranga
- Dunedin
- Queenstown
- Nelson
- Rotorua
- Invercargill
- Other

도시는 seed 데이터로 관리하되, admin에서 추후 추가/수정 가능하도록 확장성을 남긴다.

### Listing and Filters
- 사용자는 게시글 목록을 볼 수 있다.
- 목록에서 카테고리 필터를 적용할 수 있다.
- 목록에서 지역/도시 필터를 적용할 수 있다.
- 판매 완료 글은 표시하되, 상태가 명확히 보이도록 한다.
- 기본 정렬은 최신순이다.
- 추후 검색 기능을 추가할 수 있도록 설계한다.

### Comments
- 로그인한 사용자는 댓글을 작성할 수 있다.
- 댓글은 게시글 상세 페이지에 표시된다.
- 댓글 삭제/숨김 기능은 운영 권한과 연결한다.

### Contact via Kakao
- 카카오 로그인 사용자는 게시글 작성자에게 연락할 수 있는 버튼을 본다.
- 직접적인 1:1 카카오톡 메시지 API가 제한될 수 있으므로, MVP에서는 다음 중 하나를 사용한다:
  1. 사용자가 프로필에 카카오 오픈채팅 링크를 등록한다.
  2. 게시글 작성 시 연락 가능한 카카오 오픈채팅 링크를 입력한다.
  3. 작성자 프로필 페이지에서 연락 버튼을 제공한다.
- 실제 카카오 메시지 API 사용 가능 여부는 별도 검토한다.

### Moderation
- 코디네이터는 게시글을 HELD 상태로 변경할 수 있다.
- 코디네이터는 보류된 글을 검토 후 재게시 요청 또는 삭제 요청을 남길 수 있다.
- 코디네이터는 사용자를 임시 제한 상태로 표시하거나 admin 검토 요청을 만들 수 있다.
- 최종 사용자 제한, 영구 정지, 삭제 결정은 admin만 한다.
- Admin은 모든 글과 사용자 상태를 최종 변경할 수 있다.

### User Roles
- USER
- COORDINATOR
- ADMIN

### User Status
- ACTIVE
- LIMITED
- SUSPENDED
- DELETED

## Non-functional Requirements
- Next.js 기반으로 구현한다.
- 모바일 우선 UI로 설계한다.
- 카카오톡 대화방처럼 빠르고 가벼운 글쓰기 경험을 우선한다.
- 이미지 업로드는 가능하면 무료 또는 저비용 서비스를 사용한다.
- DB와 이미지 저장소는 교체 가능하도록 추상화한다.
- 운영/모더레이션 로그를 남긴다.
