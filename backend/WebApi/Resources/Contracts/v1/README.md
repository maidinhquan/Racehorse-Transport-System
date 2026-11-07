# Reference contract template v1

`contract-template.docx` is a byte-for-byte copy of the user project's existing
`data/HOP_DONG_DICH_VU_VAN_CHUYEN_NGUA_DUA_TEMPLATE.docx`. The source folder is Git-ignored,
so the runtime reference is retained here for reproducible future development.
`template-manifest.json` records SHA-256 and the 67 placeholders found in Word text nodes.

This is **not yet a production-ready issued contract template**:

- There is no dedicated CompletionDeadline placeholder; phase 4 must add the agreed
  deadline wording and bind it before hashing/issuing a PDF.
- The reference contains raw OTP/digital-signature placeholders. Never insert a raw
  OTP or claim an OTP equals a certificate-backed digital signature. Store acceptance
  evidence separately and update the customer-facing wording in phase 4.
- TripID and actual handover/receiver/signing timestamps do not exist before payment.
  Use Request/plan references and leave future milestones explicitly unperformed.
- The 40/30/30 example schedule does not authorize additional payment phases here;
  Flow 1 implements the initial 40% only. Later obligations require their own flow.

The phase-1 conversion spike passed with project-private LibreOffice 26.8.1.1:
109 occurrences bound, 12 PDF pages rendered and all 12 visually inspected. The generated
copy prevents split table rows and fills the existing footer's PAGE field; the reference
DOCX hash is unchanged. See `backend/tools/PDF_SPIKE.md` for preparation/reproduction and
`contracts/API-Flow/FLOW1_PHASE1_REPORT.md` for evidence. This validates local rendering;
the deployment runtime and production .NET adapter still require phase-4 validation.

Static signature/OTP-verified and microchip-matched assertions, USD labels and the
24-hour automatic cancellation clause must also be corrected in phase 4. Keep
`productionReady: false`; a successful converter does not approve template content.

Static resources are copied to build/publish output. Generated PDFs and all private
metadata belong under configured App_Data/storage and are excluded from Git/publish.
