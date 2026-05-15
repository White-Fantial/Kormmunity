# Operator Profiles

Operator profiles allow ADMIN users to publish posts attributed to a named community persona (e.g. "오클랜드 생활지기") instead of their personal account. The actual admin author is always stored in the database for audit purposes.

## Data Model

### `OperatorProfile`

| Field         | Type      | Description                                  |
|---------------|-----------|----------------------------------------------|
| `id`          | `String`  | CUID primary key                             |
| `slug`        | `String`  | Unique URL-safe identifier                   |
| `displayName` | `String`  | Public name shown to users (e.g. "오클랜드 생활지기") |
| `avatarUrl`   | `String?` | Optional avatar image URL                    |
| `isActive`    | `Boolean` | Whether the profile is selectable            |
| `createdAt`   | `DateTime`|                                              |
| `updatedAt`   | `DateTime`|                                              |

### `Post` fields added

| Field               | Type                | Default  | Description                                        |
|---------------------|---------------------|----------|----------------------------------------------------|
| `displayAuthorType` | `DisplayAuthorType` | `USER`   | Discriminator: `USER` or `OPERATOR_PROFILE`        |
| `displayAuthorId`   | `String?`           | `null`   | FK to `OperatorProfile.id` when type is `OPERATOR_PROFILE` |

> **Note:** `Post.authorId` always references the real admin user who created the post.

## How It Works

1. An ADMIN user creates or edits a post via the post form.
2. The form shows an "운영자 프로필" dropdown with all active operator profiles plus the default "본인 (직접 작성)" option.
3. When an operator profile is selected, the server action stores:
   - `displayAuthorType: OPERATOR_PROFILE`
   - `displayAuthorId: <operatorProfile.id>`
4. When posts are rendered (list and detail), the display author is resolved:
   - If `displayAuthorType === OPERATOR_PROFILE`, look up the operator profile and show its `displayName` with a **운영자** badge.
   - Otherwise, show the post author's `displayName` as normal.
5. Admin users viewing a post written under an operator profile see an audit section showing the actual author.

## Seeded Profiles

| Slug               | Display Name       |
|--------------------|--------------------|
| `auckland-life`    | 오클랜드 생활지기       |
| `auckland-market`  | 오클랜드 중고소식       |
| `auckland-talk`    | 오클랜드 잡담지기       |
| `wellington-life`  | 웰링턴 생활지기         |
| `wellington-jobs`  | 웰링턴 구직도우미       |
| `wellington-talk`  | 웰링턴 잡담지기         |

## API

### `GET /api/admin/operator-profiles`

Returns all active operator profiles. Requires `ADMIN` role.

**Response:**
```json
[
  { "id": "...", "slug": "auckland-life", "displayName": "오클랜드 생활지기", "avatarUrl": null }
]
```

## Adding a New Operator Profile

Admins can add profiles directly in **관리자 → 관리자 프로필** (`/admin/operator-profiles`).

- Required: `displayName`, `slug`
- Optional: `avatarUrl`, `bio`
- Profiles are created as `isActive = true` by default and can be toggled on/off in the same screen.

When an admin adds an active profile, it appears immediately in the post form's "작성자" selector.

## Permission Policy

- Only users with the `ADMIN` role can use operator profiles.
- `MODERATOR`, `COORDINATOR`, and regular `USER` roles cannot write under an operator profile.
- The server ignores any `operatorProfileId` sent by non-admin clients, so there is no client-side bypass risk.

## Legacy Post Fallback

Existing posts written before this feature was introduced have:
- `displayAuthorType = USER` (the default)
- `displayAuthorId = null`

When `displayAuthorId` is null, `resolveDisplayAuthor` falls back to `Post.author` (the User relation). These posts display identically to how they did before.

## Comments

Comment authorship switching is **out of scope** for this feature. Comments always display the actual signed-in user who posted them. The code structure does not block extending this to comments in the future — a similar `displayAuthorType`/`displayAuthorId` pattern could be added to `Comment`.

## Future Expansion

- **Comment authorship**: Extend the same `displayAuthorType`/`displayAuthorId` pattern to the `Comment` model.
- **City/country scoping**: Optionally restrict which operator profiles are available per city or country.
