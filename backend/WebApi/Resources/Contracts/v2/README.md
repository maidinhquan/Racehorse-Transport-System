# Contract template v2

`template-patch.json` is the versioned production-binding transformation of the
retained v1 DOCX, whose SHA-256 is pinned. The renderer refuses an unexpected source.
No generated DOCX/PDF is checked in. The issued metadata records the patch SHA-256,
document SHA-256, full public binding model and frozen Draft hash.

The patch corrects the original completion deadline, pre-signed/OTP-verified labels,
raw OTP field, premature Trip/handover/microchip assertions, fixed USD labels and
24-hour automatic cancellation wording. It adds selling lines, uses Request/plan
references, repeats the horse table row for every horse, and labels unverified health
information accurately. It preserves the remaining bilingual reference terms and
page structure. Remaining 40/30/30 terms do not implement later payment flows.

This version passed local .NET/LibreOffice rendering and 13-page visual QA with a
two-horse fictional fixture. It is not legal or operational approval of inherited
reference clauses, nor deployment-runtime verification. Phase 4 remains in progress
until OTP/sign/decline/extension and their financial-receipt recovery are verified.

Use explicit server configuration `Flow1:Contracts` from the example local config.
Windows requires `soffice.com`; the console entry point and unique profile behavior
follow [LibreOffice CLI documentation](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).
The issuer fields are required; the application does not invent a company or bank
account. Tests/harness use conspicuously fictional values and never send email.

The renderer uses a short per-job profile in the current user's temporary directory
to avoid nested registry paths exceeding Windows path limits. Both successful jobs
and profiles are cleaned. Failed jobs remain under the configured private work root
for diagnosis; transient profile cleanup retries are bounded. A residual profile is
listed in private `cleanup-pending.log` for controlled cleanup after processes exit.
Never expose conversion work directories, metadata or PDF storage through wwwroot.
