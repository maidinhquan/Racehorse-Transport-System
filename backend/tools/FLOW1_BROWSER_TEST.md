# Connected Customer Flow 1 browser test

Run from the repository root after building WebApi and `npm ci` in frontend:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
dotnet build backend/Backend.slnx
dotnet run --project backend/tools/Flow1BrowserHarness -- ABSOLUTE_NODE_EXECUTABLE ABSOLUTE_PLAYWRIGHT_MODULE_DIRECTORY
```

Resolve the Node/Playwright paths from the workspace dependency runtime, rather than
committing a machine-specific package directory. Installed Chrome is used headlessly;
set `FLOW1_BROWSER_CHANNEL=msedge` to use Edge. No personal browser profile is attached.

The harness accepts only a local SQL instance. It creates a uniquely named
`RaceHorseFlow1Browser_<GUID>` database, applies the safe DDL/migration, seeds a fictional
Customer, and starts its own API process with test-only JWT/config. A local HTTP fixture
implements OSRM/Nominatim-compatible responses; capacity 2 is **test data**, not production
fleet configuration. A private Vite config avoids relying on the user's staged config.

Chrome selects coordinates, adds a horse with a PNG/passport multipart upload, submits,
reloads detail, opens the SQL-backed list and downloads an authenticated private file.
SQL asserts one horse/Request and no Contract/Trip. Evidence/logs/screenshots go under
ignored private App_Data. Own API, Vite, fixture and browser processes are closed. The
generated database name is validated again before dropping exactly that database.

This checks the connected Customer stack with fixture maps, not live provider coverage,
OTP, payment, Manager review or whole-Flow-1 acceptance. Live map configuration must be
verified separately. The phase-2 report lists the remaining configuration and checks.

Adapter protocol references:

- [OSRM route service](https://project-osrm.org/docs/v5.24.0/api/#route-service)
- [Nominatim reverse API](https://nominatim.org/release-docs/latest/api/Reverse/)
- [Nominatim public-service policy](https://operations.osmfoundation.org/policies/nominatim/)
