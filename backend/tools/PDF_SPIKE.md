# Flow 1 DOCX to PDF runtime spike

This is a local technical fixture, not a customer-issued contract or a production
signature workflow. It never writes SQL or replaces the reference DOCX.

## Runtime preparation on Windows x64

```powershell
pwsh -File backend/tools/Install-Flow1LibreOffice.ps1
```

The provisioner pins LibreOffice 26.8.1, verifies the package against the official
SHA-256, and extracts an administrative image under the private project App_Data.
It does not install a desktop shortcut or change document file associations. Source
and digest: [The Document Foundation mirror manifest](https://download.documentfoundation.org/libreoffice/stable/26.8.1/win/x86_64/LibreOffice_26.8.1_Win_x86-64.msi.mirrorlist).

Runtime/executable metadata is saved in the private runtime folder. The binary,
MSI, generated PDFs, profile and page PNGs are excluded from Git and publish output.
If a download fails its hash, do not run it; retry from an official manifest mirror.
Administrative extraction may take several minutes. Do not start a second extraction
while the recorded installer is still running.

## Bind and render

Supply the Python runtime resolved by Codex workspace dependencies, with lxml/pypdf:

```powershell
pwsh -File backend/tools/Invoke-ContractPdfSpike.ps1 `
  -PythonPath 'ABSOLUTE_PATH_TO_BUNDLED_PYTHON' `
  -OutputDirectory 'D:\Racehorse-Transport-System\backend\WebApi\App_Data\flow1\pdf-spike-new-run'
```

An existing PDF in the output folder causes failure to avoid accepting stale output.
`-LibreOfficePath` overrides the explicitly supplied soffice executable; Linux can
run `contract_pdf_spike.py` directly against its own provisioned headless runtime.
The CLI uses an isolated user profile and a timeout. It neither opens WPS/Word nor
uploads documents to an external converter. Command syntax follows the official
[LibreOffice CLI documentation](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).

`contract_pdf_spike.py` replaces visible placeholders even across Word runs while
retaining paragraph/run/table formatting and namespace declarations. It prevents
split table rows and fills the existing footer's PAGE field on the **generated copy**.
The original template hash remains unchanged. The fixture has 67 unique keys; the
reference has 109 visible occurrences across body/header/footer.

The helper checks PDF structure, absence of remaining placeholders, customer demo
name, total and 40% deposit. It records version, source/PDF hashes, page count and
conversion logs. **Text extraction is not visual QA.** Render and inspect every page:

```powershell
pdftoppm -r 110 -png PATH_TO_PDF PATH_TO_OUTPUT_PAGE_PREFIX
```

## Remaining production work

The retained contract contains static wording beyond the agreed MVP (including
signature assertions, an automatic 24-hour cancellation statement, hardcoded USD
labels and later payment/hand-over clauses). Phase 4 must version and correct the
production template, bind CompletionDeadline, and avoid claiming that unsigned or
unperformed events already happened. Successful rendering proves converter/layout
capability, not business/legal approval of the source template.

Phase 4 increment A now supplies the .NET `IFlow1ContractDocumentGenerator` adapter,
bounded conversion, immutable private PDF storage and publication SQL/metadata recovery.
See `contracts/API-Flow/FLOW1_PHASE4_REPORT.md`; the full phase is still in progress.
The v1 spike remains a technical fixture. Production binding uses the v2 text patch.

On Windows use `soffice.com` and a short unique user profile under the current user's
temporary directory. Long nested job/profile paths produced exit 0 with no PDF in
this workspace; the .NET renderer and Python spike now use short profiles and clean
them after conversion. A process exit code alone never establishes PDF success.
