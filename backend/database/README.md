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

**S1 does not switch endpoint storage.** Existing endpoints still use the file
provider pending S2 atomic-use-case cutover and S3 import/parity/cleanup. Merely
applying 004 does not move old metadata. Do not delete old metadata or configure
dual-write/fallback. No migration or import runs at startup; this task only applies
004 to controlled disposable test databases, never HorseTransportDB.

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

## Former file storage boundary (runtime until S2/S3 cutover)

Plans, snapshot versions, document hashes, change history and future OTP/deployment
metadata use private versioned sidecar files behind IFlow1MetadataStore. SQL remains
authoritative for signed status, amounts, invoice/payment ledger and Trip creation.
File revisions and SQL cannot share a transaction; later workflow phases must prepare
immutable files before SQL transitions and provide recovery/reconciliation. No claim
of a SQL-transactional outbox is made. Backup SQL and private storage together.
