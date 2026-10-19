-- Explicit upgrade only. Never execute automatically on WebApi startup.
-- Four existing owner tables; two columns each. No new persistent table or seed.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF COL_LENGTH(N'dbo.CONTRACT', N'RequestID') IS NULL OR COL_LENGTH(N'dbo.CONTRACT', N'CompletionDeadline') IS NULL
        THROW 51040, 'Apply/verify 003_flow1_minimal_schema.sql before the SQL-state upgrade.', 1;

    DECLARE @table sysname, @sql nvarchar(max), @object int, @check sysname, @definition nvarchar(max), @expected nvarchar(max);
    DECLARE targets CURSOR LOCAL FAST_FORWARD FOR
        SELECT Name FROM (VALUES (N'HORSE'), (N'TRANSPORT_REQUEST'), (N'CONTRACT'), (N'USER')) AS t(Name);
    OPEN targets;
    FETCH NEXT FROM targets INTO @table;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @object = OBJECT_ID(N'dbo.' + QUOTENAME(@table), N'U');
        IF @object IS NULL THROW 51041, 'An existing Flow 1 owner table is missing.', 1;
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=@object AND name=N'Flow1StateJson'
            AND (TYPE_NAME(user_type_id)<>N'nvarchar' OR max_length<>-1 OR is_nullable<>1 OR is_computed<>0))
            THROW 51042, 'Unexpected Flow1StateJson schema. Refuse implicit conversion.', 1;
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=@object AND name=N'Flow1StateVersion'
            AND (TYPE_NAME(user_type_id)<>N'bigint' OR is_nullable<>0 OR is_computed<>0))
            THROW 51042, 'Unexpected Flow1StateVersion schema. Refuse implicit conversion.', 1;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=@object AND name=N'Flow1StateJson')
        BEGIN
            SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@table)+N' ADD Flow1StateJson nvarchar(max) NULL;';
            EXEC sys.sp_executesql @sql;
        END;
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=@object AND name=N'Flow1StateVersion')
        BEGIN
            SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@table)+N' ADD Flow1StateVersion bigint NOT NULL CONSTRAINT '+QUOTENAME(N'DF_'+@table+N'_Flow1StateVersion')+N' DEFAULT(0) WITH VALUES;';
            EXEC sys.sp_executesql @sql;
        END;
        SET @definition=NULL;
        SELECT @definition=d.definition FROM sys.default_constraints d JOIN sys.columns c
            ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
            WHERE c.object_id=@object AND c.name=N'Flow1StateVersion';
        IF @definition IS NULL
        BEGIN
            SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@table)+N' ADD CONSTRAINT '+QUOTENAME(N'DF_'+@table+N'_Flow1StateVersion')+N' DEFAULT(0) FOR Flow1StateVersion;';
            EXEC sys.sp_executesql @sql;
        END
        ELSE IF REPLACE(REPLACE(REPLACE(@definition,N'(',N''),N')',N''),N' ',N'')<>N'0'
            THROW 51043, 'Unexpected SQL state version default; migration rolled back.', 1;

        DECLARE @kind int=0;
        WHILE @kind<2
        BEGIN
            SET @check=N'CK_'+@table+CASE WHEN @kind=0 THEN N'_Flow1StateJson' ELSE N'_Flow1StateVersion' END;
            SET @expected=CASE WHEN @kind=0 THEN N'Flow1StateJson IS NULL OR ISJSON(Flow1StateJson)=1' ELSE N'Flow1StateVersion>=0' END;
            IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=@object AND name=@check)
            BEGIN
                SET @sql=N'ALTER TABLE dbo.'+QUOTENAME(@table)+N' WITH CHECK ADD CONSTRAINT '+QUOTENAME(@check)+N' CHECK ('+@expected+N');';
                EXEC sys.sp_executesql @sql;
            END;
            SELECT @definition=definition FROM sys.check_constraints WHERE parent_object_id=@object AND name=@check;
            IF LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@definition,N'[',N''),N']',N''),N'(',N''),N')',N''),N' ',N''))<>
               LOWER(REPLACE(REPLACE(REPLACE(@expected,N'(',N''),N')',N''),N' ',N''))
                OR EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=@object AND name=@check AND (is_disabled=1 OR is_not_trusted=1))
                THROW 51044, 'SQL state CHECK constraint is incompatible, disabled or untrusted.', 1;
            SET @kind+=1;
        END;
        FETCH NEXT FROM targets INTO @table;
    END;
    CLOSE targets;
    DEALLOCATE targets;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
