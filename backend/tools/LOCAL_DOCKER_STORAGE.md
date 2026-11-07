# Local Docker: persistent Flow 1 files and settings

The backend mounts the `backend_app_data` Docker volume at `/app/App_Data`.
Recreating or rebuilding the container preserves private horse documents, PDFs
and conversion data. Keep this volume backed up with the matching SQL database.
Do not use `docker compose down --volumes` or prune this volume while its files
are referenced by SQL.

Before starting Compose on a new machine, create this local file:

```powershell
New-Item -ItemType Directory -Force backend/WebApi/App_Data/flow1/runtime-config
Copy-Item backend/WebApi/appsettings.Local.example.json backend/WebApi/App_Data/flow1/runtime-config/appsettings.Flow1Sandbox.Local.json
```

Edit the copied file locally. It is ignored by Git and mounted read-only as
`/app/appsettings.Flow1Sandbox.Local.json`, loaded in Development. Set Docker
paths: `Flow1:PrivateFiles:Root=/app/App_Data/flow1/private-bytes`,
`Flow1:Contracts:WorkRoot=/app/App_Data/flow1/conversion`, and
`Flow1:Contracts:LibreOfficePath=/usr/bin/soffice`. Fill all nine issuer fields
with clearly marked DEMO details for local testing. Configure private OTP and
Sandbox provider keys locally; never commit them. Omit any example connection
string that should not override your actual container connection configuration.
Restart the backend after changing these settings.

The configuration mount deliberately fails if the source file is missing,
rather than creating a directory in its place. Existing machines must preserve
their actual settings instead of copying the example over them.

Adding a mount does not recover files from an already deleted container. Restore
the original content-addressed bytes from backup and verify SHA-256 against SQL
references before use. Do not generate replacement evidence or modify an issued
PDF to make a missing-file error disappear.
