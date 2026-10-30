# Frontend API integration — Flow 1

The source of truth is `contracts/API-Flow/Flow1/flow1.openapi.json`, mirrored in
`frontend/src/contracts/flow1.openapi.json`. Endpoint names, methods, parameters,
request schemas and success/error statuses are taken from that specification.
No backend implementation or database migration is introduced by this change.

## Calling APIs

- Customer calls are in `src/features/customer/api/customerApi.ts`.
- Manager calls are in `src/features/manager/api/managerApi.ts`.
- `contractClient` rejects undeclared endpoints and validates path/query/header
  parameters, JSON or multipart bodies, declared HTTP statuses and response schemas.
- Other flows explicitly use `apiRequest` and are not claimed to pass Flow 1 validation.
- Binary downloads continue through authenticated `downloadFile`; never open private
  API URLs without the bearer token.

## Current contract decisions

- Creation sends the required UUID `Idempotency-Key`. The create form reuses one key
  across retries; a successful new form starts another key. UI horse slots are not
  sent in the initial request body.
- Profile file types are `photo`, `passport`, `ownership`, `value-proof`. Medical
  documents belong to a request/horse and use the document endpoint. Multipart sends
  real file bytes; the browser supplies its boundary.
- Horse CRUD sends only the fields declared by the contract. Unsupported profile
  fields are not silently added to its JSON body.
- Manager request changes send `{ feedback }`, without the obsolete `fields` array.
- Payments use VNPAY only. Frontend creates a session and reads server state; it never
  calls IPN or treats Return, a local demo action, or a manual Manager confirmation as
  proof of payment. The removed manual confirm/reject routes cannot be called.
- Refund completion has no request body. It records a status; it does not transfer money.
- Trip hold sends `{ reason }`; resume has no body. Backend remains authoritative for
  assignment and departure guards.
- API status `IN_PROGRESS` is adapted to the existing UI `IN_TRANSIT` label. Removed
  history/revision/extension arrays are empty UI compatibility collections; they are
  neither fabricated server events nor sent in request JSON.
- Shared request documents have no upload endpoint in this Flow 1 contract; those
  controls stay unavailable rather than inventing a route.

## Checks

```powershell
npm run contract:check
npm run test:run
npm run build
```

The contract check covers 65 operations, 158 JSON examples, 21 JSON request schemas,
negative cases and Markdown parity. It compares parsed JSON so CRLF/LF differences
on Windows do not create false mismatches. OpenAPI examples are excluded from the
AJV schema registry to avoid interpreting business IDs as schema identifiers.

A successful build or mocked contract test does not establish that the current
backend implements these endpoints. Live integration still requires the backend
responses to conform to the same contract.
