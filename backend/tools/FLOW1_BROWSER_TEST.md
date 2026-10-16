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
implements OSRM/Nominatim-compatible responses by default; capacity 1 matches the user-approved
MVP policy (not verified fleet data). A private Vite config avoids relying on the user's staged config.

Chrome selects coordinates, adds a horse with a PNG/passport multipart upload, submits,
reloads detail, opens the SQL-backed list and downloads an authenticated private file.
SQL asserts one horse/Request and no Contract/Trip. Evidence/logs/screenshots go under
ignored private App_Data. Own API, Vite, fixture and browser processes are closed. The
generated database name is validated again before dropping exactly that database.

Set `FLOW1_BROWSER_MAP_PROVIDER=GEOAPIFY` to exercise Geoapify Geocoding/Reverse/Routing
plus Mapbox Static Images through local HTTP fixtures. `MAPBOX` is retained as an alias for
this hybrid mode. The child API receives fake keys, Mapbox Permanent=false and capacity=1.
The fixture rejects all Mapbox Geocoding/Directions calls. Snapshot provider/capacity/attribution
and Geoapify links after reload are checked; neither fixture key may appear in API logs.
Without this variable the connected test uses the explicit OSM adapter.

This checks the connected Customer stack with fixture maps, not live provider coverage,
OTP, payment, Manager review or whole-Flow-1 acceptance. Live map configuration must be
verified separately. The phase-2 report lists the remaining configuration and checks.

## Explicit live-map mode

After local backend keys are configured, use:

```powershell
$env:RACEHORSE_TEST_SQL_SERVER = '.\SQLEXPRESS'
$env:FLOW1_BROWSER_MAP_PROVIDER = 'GEOAPIFY'
$env:FLOW1_BROWSER_LIVE_MAPS = '1'
dotnet run --project backend/tools/Flow1BrowserHarness -- ABSOLUTE_NODE_EXECUTABLE ABSOLUTE_PLAYWRIGHT_MODULE_DIRECTORY
```

This mode uses a few real Geoapify and Mapbox requests for public city locations
(Ho Chi Minh City → Vung Tau). It still creates its own disposable SQL database,
fictional Customer/horse/passport, private file root and owned API/browser processes.
There is no business DB migration, real email/SMS, payment or production deployment.

The parent verifies configured providers, key presence and capacity=1 before creating a DB.
Only the backend process receives real map credentials; Node/browser does not. The API
uses official HTTPS hosts, Mapbox Permanent=false, Geoapify storage rights and attribution.
No HTTP fixture listens in live mode, fixture call counts must remain zero, and browser
provider requests or URLs containing access_token/apiKey fail acceptance. API/browser logs
are checked for both real credentials without printing their values. Screenshots/result JSON
remain in ignored App_Data. Marked evidence explicitly distinguishes live maps from test SQL/files.

Unset `FLOW1_BROWSER_LIVE_MAPS` (or set `0`) to return to fixtures. Never claim live provider
coverage from a default fixture run, or whole Flow 1 E2E from a successful phase-2 run.

Adapter protocol references:

- [OSRM route service](https://project-osrm.org/docs/v5.24.0/api/#route-service)
- [Nominatim reverse API](https://nominatim.org/release-docs/latest/api/Reverse/)
- [Nominatim public-service policy](https://operations.osmfoundation.org/policies/nominatim/)
