# Flow 1 database — approved SQL state transition

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
Missing migration 004 returns `FLOW1_SQL_SCHEMA_REQUIRED`; any legacy typed JSON
sidecars cause `FLOW1_STATE_IMPORT_REQUIRED`. Sources are preserved, never read as
a fallback. S3 inventory/import/parity/cleanup remains pending; applying 004 alone
does not move old metadata. Do not delete metadata to bypass the guard. No migration
or import runs at startup; tests only apply 004 to controlled disposable databases,
never HorseTransportDB. See the [S2 report](../../contracts/API-Flow/FLOW1_PHASE4_SQL_CUTOVER_REPORT.md).

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
