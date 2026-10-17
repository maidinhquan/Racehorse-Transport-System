# Flow 1 database — approved SQL state transition

## Current target profile — 17/10/2026

Use `000` (empty disposable DB only) → `003` → **`006_flow1_simple_relational_foundation.sql`**.
The new profile supersedes `005`/166 columns: latest horse files, direct Contract
quote, VNPay only; retains deadline extension, latest cancellation and operational
confirm/hold/resume. See [typed mapping](../../contracts/API-Flow/FLOW1_SIMPLE_RELATIONAL_MAPPING.md).

006 adds 63 columns on five existing tables (including five automatic rowversions),
25 CHECKs and three indexes (one on existing NOTIFICATION). No persistent tables,
new FKs, data conversion, JSON drop, automatic startup or runtime DI switch.
003 still provides one Trip/request and one DEPOSIT invoice/Contract. 004 can
coexist pending reviewed conversion; 005 is a separate superseded profile and006
rejects it rather than deleting or mixing schemas. SQL extended properties record
schema guard fingerprints only, never application workflow payloads.

Do not execute these scripts on HorseTransportDB/business DB without separate
operator review/authorization. No rollback/drop script is authorized by the scope
change. Existing JSON/bytes stay intact until typed UAT/parity/source cutover and
reviewed offline conversion. Sections describing004/005 below are historical;
they are not prerequisites or permission to deploy that architecture.

**Decision 16 October 2026:** the user approved additional columns on existing tables,
full Flow 1 retained, **no new tables**. The former two-column restriction below
describes migration 003 only. The current transition is documented in
[`FLOW1_SQL_STATE_TRANSITION_PLAN.md`](../../contracts/API-Flow/FLOW1_SQL_STATE_TRANSITION_PLAN.md).

`004_flow1_sql_state.sql` adds nullable `Flow1StateJson nvarchar(max)` and
`Flow1StateVersion bigint NOT NULL DEFAULT(0)` to each of HORSE, TRANSPORT_REQUEST,
CONTRACT and USER: **eight columns, zero new tables**. Version is a monotonic
compare-and-swap counter, not SQL Server rowversion. JSON checks and schema/default/
constraint compatibility guards are transactional and repeatable. No business state,
money, timestamps, private files or legacy records are invented/backfilled by 004.

**S2 switches endpoint source to SQL state.** Customer/review/publication/OTP/sign
use the scoped SQL provider and commit state plus business mutations together.
Missing migration 004 returns `FLOW1_SQL_SCHEMA_REQUIRED`. S3 provides offline
[inventory/import/parity tooling](../tools/Flow1StateImport/README.md) and removes
the file state provider/interface/writer options. Typed legacy JSON requires a
matching committed import receipt (path/hash) in the SQL owner envelope; missing
or changed sources return `FLOW1_STATE_IMPORT_REQUIRED`. Sources remain unchanged,
never read as runtime business state or a fallback. Applying 004 alone does not
move old metadata. Do not delete metadata to bypass the guard. No migration
or import runs at startup; tests only apply 004 to controlled disposable databases,
never HorseTransportDB. See [S2](../../contracts/API-Flow/FLOW1_PHASE4_SQL_CUTOVER_REPORT.md)
and [S3](../../contracts/API-Flow/FLOW1_PHASE4_SQL_IMPORT_REPORT.md). Business DB migration/import remains a separate explicitly authorized operation.

For a separately authorized upgrade: verify/backup target DB and private files,
apply/verify 003 first, review 004, run dry-run/inventory and the eventual importer,
check parity, and then perform the tested application cutover. Do not roll back by
dropping populated JSON columns; preserve history and restore/forward-fix deliberately.

## Migration 003 baseline (historical schema decision)

The selected design adds **only** `CONTRACT.CompletionDeadline datetime2 NULL` and
`CONTRACT.RequestID varchar(50) NOT NULL`, and makes `CONTRACT.TripID` nullable.
No new table, rowversion column, provider column, or fake preliminary Trip is added.

Indexes enforce one Trip per Request and one DEPOSIT invoice per Contract. Existing
duplicate trips/deposit invoices or mismatched customers stop the migration without
deleting rows. Legacy RequestID is derived from the existing Trip relation. Existing
money/currency/signatures are preserved; no deadlines or UTC history are invented.

## Existing database

1. Back up the explicitly named database and verify its identity.
2. Run `002_flow1_preflight.sql` read-only and review all issue result sets.
3. Resolve reported data conflicts with the owner. Do not delete arbitrary duplicates.
4. Run `003_flow1_minimal_schema.sql` in that database using an explicit `-d` target.
5. Re-run preflight, validate row counts/relations and smoke-test authentication.

```powershell
# Replace the target deliberately. These commands are examples, not startup hooks.
sqlcmd -S '.\SQLEXPRESS' -E -C -b -d YOUR_TARGET_DATABASE -i backend/database/002_flow1_preflight.sql
sqlcmd -S '.\SQLEXPRESS' -E -C -b -d YOUR_TARGET_DATABASE -i backend/database/003_flow1_minimal_schema.sql
```

Migration is transactional and repeatable. It intentionally contains no USE, CREATE
DATABASE, DROP DATABASE, seeds, or automatic execution in WebApi. Roll back application
code separately; schema rollback with new contracts whose TripID is null requires a
reviewed restore/forward-fix, not an unconditional ALTER back to NOT NULL.

## New empty database / tests

`000_legacy_schema.sql` contains only the 26 legacy CREATE TABLE definitions, extracted
from the tracked `HorseTransportDB/HorseTransportDB.sql`; it omits its database reset
and sample data. Run it **only in a newly created empty database**, then apply 003.
The tracked legacy script itself drops HorseTransportDB: never use it as an upgrade.
The local ignored `data/HorseTransportDB.sql` is not a reproducible deployment source.

Integration tests create `RaceHorseFlow1Test_<GUID>` on a local SQL Server, load 000,
apply migrations, and drop only that validated generated database. They never reset or
migrate the user's HorseTransportDB. Set `RACEHORSE_TEST_SQL_SERVER=.\SQLEXPRESS` to run.

## Private storage after source cutover

New plans, snapshots, document hashes, change history, OTP digests/attempts/budgets
and signing receipts use SQL state on existing owner rows. Images/passports/PDF/proof
bytes remain immutable private files behind authenticated APIs. Generating bytes
before SQL commit can leave an unreferenced private file on rollback; it never creates
a published manifest or permits downloading an unissued contract. SMTP remains an
external operation with DELIVERING/DELIVERED/FAILED states. No shared filesystem/SMTP/
SQL transaction or transactional outbox is claimed. Back up SQL and private bytes
together; keep old sidecars unchanged until S3 import/parity has been verified.


## A1/B1/C1 relational foundation — 005

`005_flow1_relational_mvp_foundation.sql` is an explicit, additive foundation on
003. It supports fresh003 without004 and coexistence with004; creates no
persistent tables and changes no existing foreign keys/columns. It adds 166 typed
columns across 8 existing tables, 30 CHECKs and 7 indexes. No startup application,
no conversion, no Ready backfill, no business DB permission, no old-state drop.
Current runtime still uses the old store until a later tested source cutover.
Read `contracts/API-Flow/FLOW1_RELATIONAL_COLUMN_MAPPING.md` before operator review.
Any retirement/drop script is separate and must follow conversion/parity approval.
