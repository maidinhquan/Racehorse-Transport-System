# Flow 1 state import — offline operator guide

This tool moves legacy Flow 1 JSON state into the existing SQL owner columns.
It never creates tables, applies migrations, creates owners, changes money/status/
signatures/invoices/Trips, sends OTP, deletes sources, or moves private bytes.

Default mode is read-only inventory. Apply requires exact database confirmation,
offline confirmation and the fingerprint from reviewed inventory. Connection
strings go through a named environment variable, never a CLI argument.

## Preparation and authorization

1. Identify actual server/catalog and obtain permission to change that database.
   Scheduler authorization does not permit migrating/importing HorseTransportDB.
2. Back up that database **and** legacy metadata/private bytes. Verify restore.
3. Separately review/apply migrations 003 and 004 only on the authorized target.
   The importer checks column types/defaults/trusted CHECKs; it never fixes schema.
4. Locate the exact legacy source root (horse/request/review/plan/contract/
   publication/contract-otp/acceptance/otp-account) and private bytes root (hash.bin).
   Both paths must be absolute and exist for CLI invocation. No guessed/created
   empty folder may be substituted for a missing real source.
5. Stop all old/new app instances, jobs and file writers before **apply**. The
   offline flag is the operator's attestation. SQL applock serializes importers,
   CAS/serializable transaction protects the batch; it cannot stop an old program
   writing external JSON. Stay offline until parity has been checked.

Old Flow1:Storage:MetadataRoot remains a **path-only compatibility input**.
New options take precedence:

~~~json
{
  "Flow1": {
    "PrivateFiles": { "Root": "App_Data/flow1/metadata/private-bytes" },
    "LegacyImport": { "SourceRoot": "App_Data/flow1/metadata" }
  }
}
~~~

Do not change byte paths without preserving referenced files. Old file-writer
MaxDocumentBytes/LockTimeoutMilliseconds are obsolete. SQL limits: 2 MiB/document,
8 MiB/owner; history is not trimmed. Inventory is bounded to 10,000 documents /
128 MiB source JSON, and rejects reparse points, nested source folders, unknown
JSON, incomplete .tmp writes and oversized files.

## Inventory / dry-run

From repo root (commands below use deliberately generic paths/target):

~~~powershell
dotnet build backend/tools/Flow1StateImport/Flow1StateImport.csproj
dotnet run --project backend/tools/Flow1StateImport --no-build -- --help

# Enter only locally; never paste real connection strings/tokens into chat or Git.
$taskImportSecret = Read-Host 'Connection string for the explicitly reviewed target' -AsSecureString
$env:FLOW1_IMPORT_CONNECTION = [Net.NetworkCredential]::new('', $taskImportSecret).Password

dotnet run --project backend/tools/Flow1StateImport --no-build -- --connection-env FLOW1_IMPORT_CONNECTION --confirm-database YOUR_REVIEWED_DATABASE --source-root 'D:\ABSOLUTE\legacy-source' --private-files-root 'D:\ABSOLUTE\private-bytes'
~~~

No --apply means dry-run (explicit --dry-run also works). Review database,
sourceFingerprint, document/owner/revision/private-file counts, issues and warnings.
The report contains no payload, OTP, HMAC key, connection string or contact/horse
fields. Paths/IDs remain internal operational evidence.

- Issues block the **whole batch**.
- Legacy SQL rows without state are warnings. No snapshots/receipts are fabricated.
  Success verifies the supplied Flow 1 source set, not unrelated legacy rows.
  Review warnings and handle onboarding/reconciliation separately; do not claim
  all old contracts have migrated. Empty source cannot prove data never existed.
- Latest PREPARED requires explicit reconciliation: no automatic SQL/file guessing
  or counter reset. Historical PREPARED followed by COMMITTED/ABORTED is retained.
- Synthetic otp-account ID maps to the sole actor/USER after its hash-derived ID
  is checked. Preserve counters/TTL/digests/attempts/sends.
- Check dependencies, horse owner/version, canonical SQL projections, plan/Draft
  money/version, publication PDF hash and receipt/invoice/status. Every private
  reference in history must match actual hash/length bytes.
- Changed hashes, missing dependencies/files, invalid JSON/audit hashes, duplicate
  owner documents/keys/properties, plaintext OTP fields or conflicting SQL history
  block import. Do not edit/delete/rehash evidence just to bypass an issue.

## Apply and verify

Only after the owner authorized the named DB operation and reviewed inventory:

~~~powershell
dotnet run --project backend/tools/Flow1StateImport --no-build -- --connection-env FLOW1_IMPORT_CONNECTION --confirm-database YOUR_REVIEWED_DATABASE --source-root 'D:\ABSOLUTE\legacy-source' --private-files-root 'D:\ABSOLUTE\private-bytes' --apply --offline-confirmed --reviewed-fingerprint REVIEWED_UPPERCASE_SHA256
~~~

Expect applied=true, parityVerified=true and no issues. Nonzero exit means stop.
Repeat dry-run; parityVerified must stay true. Exact apply retry is a no-op:
counters/history/receipts do not grow. A strictly newer matching SQL audit prefix
is preserved, never truncated; conflicting prefix is never overwritten.

The fingerprint binds source/private bytes and business snapshot to server/catalog.
One transaction covers the batch; sources/private hashes and persisted envelopes
are checked before commit. Failure/cancellation/tamper/interruption rolls back all
owner state/receipts. If connection/process is lost after commit, repeat inventory/
apply to discover the committed result, never reset owner counters.

Receipts (relative source path + SHA-256) live in the same SQL owner envelope and
transaction as state. Runtime hashes retained sources and requires matching
**committed SQL receipts**, once per scoped provider/request. It never parses
legacy payloads as business state or falls back to JSON. Modified/new source blocks
runtime with FLOW1_STATE_IMPORT_REQUIRED. Keep old writers stopped. Sources remain
untouched/backed up; do not remove them just because exit=0. No receipt files,
metadata writer, .lock/.tmp/rename saga or archive task is introduced.

Start SQL app; verify Customer/Manager review/history/quote, private downloads,
original PDF hash/receipt/invoice. Do not send real OTP/mail or make payments as a
migration test. SQL writes preserve receipts. Keep DB + bytes backups aligned;
rollback by reviewed restore/forward-fix, never drop populated columns or change
signed amounts/statuses.

~~~powershell
Remove-Item Env:FLOW1_IMPORT_CONNECTION
~~~

## Exit/report boundaries

- 0: inventory has no blocking issue, or apply completed with parity.
- 2: inventory conflicts; nothing imported.
- 1: invalid arguments/target, stale fingerprint, cancellation/SQL/IO error.
  Diagnostics include stable code/exception type, never raw provider text.

No example authorizes business DB writes by the scheduler.
See contracts/API-Flow/FLOW1_PHASE4_SQL_IMPORT_REPORT.md for test evidence.
