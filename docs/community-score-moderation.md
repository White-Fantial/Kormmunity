# Community Score Moderation

## Purpose

`communityScore` is an **internal** moderation signal attached to every post and comment.
It is never shown to normal users. Its sole purpose is to allow the system to automatically
hold content that appears to be harmful or unwanted, based on community actions.

---

## communityScore vs. neighbourWarmth

| Property | Scope | Visible to users | Purpose |
|---|---|---|---|
| `neighbourWarmth` | User profile | ✅ Yes (public) | Measures user trust/warmth; used for display and gating |
| `communityScore` | Post / Comment | ❌ No (internal) | Measures content health; used for auto-moderation |

- **`neighbourWarmth`** belongs to the author. It rises when their content is liked or selected as best, giving the author a public reputation signal.
- **`communityScore`** belongs to the content itself. It reflects the community's reaction (reports, likes, moderator decisions) to that specific piece of content.

---

## Score Events

Every change to a `communityScore` is recorded in the `CommunityScoreEvent` table.

### Schema

| Field | Type | Description |
|---|---|---|
| `id` | CUID | Primary key |
| `targetType` | `POST` or `COMMENT` | What kind of content was affected |
| `targetId` | string | ID of the post or comment |
| `postId` | string? | FK to Post (for cascade delete) |
| `commentId` | string? | FK to Comment (for cascade delete) |
| `actorId` | string? | User who triggered the event (null for system) |
| `baseDelta` | Float | The unweighted score change |
| `weight` | Float | The actor's neighbour warmth weight |
| `finalDelta` | Float | `baseDelta * weight` — the actual change applied |
| `reason` | string | Human-readable reason code |
| `metadata` | JSON? | Additional context (reserved for future use) |
| `createdAt` | DateTime | When the event was recorded |

---

## Base Delta Values

These are the raw score changes **before** applying the actor's warmth weight.

### Positive events

| Reason | Base delta |
|---|---|
| Post like received | `+1.0` |
| Comment like received | `+1.2` |
| Best comment selected | `+5.0` |
| Coordinator restores content | `+3.0` |
| Admin restores content | `+5.0` |

### Negative events

| Reason | Base delta |
|---|---|
| Post report submitted | `−2.0` |
| Comment report submitted | `−2.5` |
| Coordinator holds content | `−5.0` |
| Admin deletes content | `−10.0` |

---

## Neighbour Warmth Weight Formula

Every score change is multiplied by the actor's warmth weight:

```
weight = clamp(1 + (neighbourWarmth - 36.5) / 50, 0.5, 2.0)
```

- New/default users (warmth ≈ 36.5) → weight ≈ 1.0
- Low warmth users → weight as low as 0.5 (half impact)
- High warmth users → weight as high as 2.0 (double impact)

The clamp prevents abuse by very high or very low warmth actors.

---

## Author Neighbour Warmth Update Rule

`neighbourWarmth` itself is updated separately from `communityScore` and currently has
**gain-only** rules (no automatic moderation deduction in code).

Base gains:

| Reason | Base gain |
|---|---|
| Post like received | `+0.3` |
| Comment like received | `+0.5` |
| Best comment selected | `+3.0` |

Applied gain formula:

```
actualGain = baseGain * max(0.03, 1 - currentWarmth / 100)
nextWarmth = clamp(currentWarmth + actualGain, 0, 100)
```

- As warmth gets higher, incremental gain becomes smaller.
- A minimum multiplier (`0.03`) ensures very high-warmth users can still gain slowly.

---

## Auto Pending (Auto Hold) Thresholds

When `communityScore` falls **strictly below** a threshold, the content is automatically
set to `HELD` status:

| Content type | Threshold |
|---|---|
| Post | `< −8` |
| Comment | `< −5` |

Comments are held at a lower threshold because harmful comments can cause more immediate
damage in active discussion threads.

**Important:** The automatic system can only move content to `HELD`.
Final deletion must remain an admin or coordinator decision.

---

## Visibility Behavior

### Posts

| User type | PUBLISHED post | HELD post | DELETED post |
|---|---|---|---|
| Anonymous / normal user | Visible | Sees pending message only | 404 |
| Post author | Visible | Sees pending message only | 404 |
| Coordinator | Visible | Visible with held banner | 404 |
| Admin | Visible | Visible with held banner | 404 |

**Pending message shown to normal users:**
> 이 게시글은 신고 접수로 인해 운영 검토 중입니다.

### Comments

| User type | PUBLISHED comment | HELD comment |
|---|---|---|
| Normal user | Visible | Not listed in normal query (effectively hidden) |
| Coordinator | Visible | Full content visible + status label |
| Admin | Visible | Full content visible + status label |

> Note: UI contains a placeholder branch (`운영 검토 중인 댓글입니다.`), but normal users currently do not receive HELD comments from the server query.

---

## Coordinator / Admin Permissions

### Coordinators can:
- View all HELD posts and comments
- Restore HELD content back to `PUBLISHED` (+3.0 score delta)
- Hold PUBLISHED content (−5.0 score delta)
- View `communityScore` and report counts in the moderation queue
- Dismiss reports (by restoring content)

### Admins can:
- All coordinator permissions
- Permanently delete posts (−10.0 score delta)
- Restore any content (+5.0 score delta)
- Override status manually
- View full `CommunityScoreEvent` history in admin views

All permission checks are enforced server-side.

---

## Anti-Abuse Notes

- **Duplicate reports are ignored.** A single user can only reduce a post's score once per report.
- **Duplicate comment likes are ignored.** A single user can only increase a comment's score once per active like.
- **Post like scoring currently triggers on toggle action.** In current implementation, post like action applies post score delta even on unlike/self-like toggles.
- **Self-like score guard is implemented for comments only.** Comment self-like does not apply score; post self-like is not currently guarded in score update path.
- **Self-selected best comment does not generate score.** If a post author selects their own comment as best, no score change is applied.
- **Actor warmth is clamped.** The weight is bounded to [0.5, 2.0] to prevent extreme actors from having outsized influence.
- **communityScore is never exposed in the UI.** Only coordinators/admins can see scores in the management pages.

---

## Future Extension Ideas

- **Confirmed spam/scam/abuse flag** (−8.0 from admin or ML system)
- **Score decay over time** — old negative events count less
- **Score recovery** — content that receives many likes after being held can be auto-restored
- **Per-category thresholds** — different category types may warrant different sensitivity
- **Aggregate actor score influence tracking** — detect actors who over-report (potential abuse)
- **Appeal system** — authors can request review of auto-held content
