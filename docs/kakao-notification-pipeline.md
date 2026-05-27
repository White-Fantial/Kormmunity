# Kakao Notification SQS/Lambda Pipeline

## Overview

The Kakao notification flow is split into two asynchronous stages:

1. `search-match-queue` → **Search Matcher Lambda**
   - Consumes post-created events.
   - Finds matching `SearchAlert` users.
   - Creates `KakaoMessageDelivery (PENDING)` rows.
   - Publishes delivery IDs to `kakao-send-queue`.

2. `kakao-send-queue` → **Kakao Sender Lambda**
   - Consumes delivery IDs.
   - Sends actual Kakao memo messages.
   - Updates delivery status (`SUCCESS` / `FAILED`) and attempt metadata.

Non-search events (comments, ad notifications) directly enqueue into `kakao-send-queue`.

## Required App Environment Variables

- `KAKAO_USE_SQS_PIPELINE=true`
- `KAKAO_USE_SEARCH_MATCHER_LAMBDA=true`
- `KAKAO_SEARCH_MATCH_QUEUE_URL=<search match queue url>`
- `KAKAO_SEND_QUEUE_URL=<kakao send queue url>`
- `AMAZON_WEB_SERVICE_REGION=<aws region>`

## SQS Recommended Configuration

- Queue pairs:
  - `search-match-queue` + `search-match-dlq`
  - `kakao-send-queue` + `kakao-send-dlq`
- `maxReceiveCount`: `5`
- `VisibilityTimeout`: `120s`
- Lambda batch:
  - `BatchSize`: `10`
  - `MaximumBatchingWindowInSeconds`: `5`
- Encryption: SSE-KMS enabled

## Deploying Lambdas and Queues

SAM template:

- `infrastructure/sam/kakao-notification-pipeline.yaml`
- Lambda runtime: `nodejs22.x`
- Handlers:
  - `search-matcher.handler` (`kormmunity-staging-search-matcher`)
  - `kakao-sender.handler` (`kormmunity-staging-kakao-sender`)
- Lambda build context (minimal dependencies only):
  - `infrastructure/sam/kakao-notification-lambda/`
  - contains SAM esbuild entry points for `search-matcher.mjs` / `kakao-sender.mjs`
  - includes only Lambda runtime dependencies (`@prisma/client`, `@aws-sdk/client-sqs`)

### ES module packaging note

The source Lambda files (`*.mjs`) use ES module syntax (`import`/`export`).
SAM's esbuild build step outputs them as `*.js` (matching the Lambda handler name, e.g. `kakao-sender.handler` → `kakao-sender.js`) with `Format: esm`.

Node.js treats `.js` files as CommonJS by default, which causes a
`Runtime.UserCodeSyntaxError: Cannot use import statement outside a module` error unless
the deployed package root includes a `package.json` with `"type": "module"`.

SAM's esbuild build does **not** copy `package.json` into the build artifact directory
automatically. The deployment workflow therefore explicitly copies
`infrastructure/sam/kakao-notification-lambda/package.json` (which contains
`"type": "module"`) into `.aws-sam/build/SearchMatcherFunction/` and
`.aws-sam/build/KakaoSenderFunction/` after `sam build`.

If you change the handler file extension or build format, ensure the deployed package
root always includes `package.json` with `"type": "module"` when the bundle uses ES
module syntax.

GitHub Actions workflow:

- `.github/workflows/deploy-kakao-notification-pipeline.yml`

This workflow deploys on push to `staging` and `main`, and can also be run manually.
If runtime/handler values are edited manually in the Lambda console, they can be
overwritten by the next SAM deployment from this workflow.

## Branch-separated operation

Resources are environment-suffixed and fully separated:

- `kormmunity-staging-*`
- `kormmunity-main-*`

Use GitHub environment secrets per environment (`staging`, `main`) with the same secret keys:

- `AWS_DEPLOY_ROLE_ARN`
- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`

## Monitoring

Template includes CloudWatch alarms for:

- Search match DLQ visible messages > 0
- Kakao send DLQ visible messages > 0
- Search matcher Lambda errors
- Kakao sender Lambda errors
