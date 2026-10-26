-- Apply to the configured Flow 1 database before deploying one-step submission.
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'SubmissionContentHash') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD SubmissionContentHash varchar(64) NULL;
