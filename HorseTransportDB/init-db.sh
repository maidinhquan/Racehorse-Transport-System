#!/bin/bash
set -e

echo "=========================================================="
echo "Horse Transport System - Database Auto-Initialization"
echo "=========================================================="

echo "Waiting for SQL Server service (db:1433) to accept connections..."
SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
if [ ! -f "$SQLCMD" ]; then
    SQLCMD="/opt/mssql-tools/bin/sqlcmd"
fi

for i in {1..60}; do
    if $SQLCMD -S db,1433 -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "SELECT 1" > /dev/null 2>&1; then
        echo "SQL Server is UP and READY!"
        break
    fi
    echo "Still waiting for SQL Server... ($i/60)"
    sleep 2
done

echo "Checking if database [HorseTransportDB] exists..."
DB_EXISTS=$($SQLCMD -S db,1433 -U sa -P "$MSSQL_SA_PASSWORD" -C -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = 'HorseTransportDB'")

if [ "$DB_EXISTS" -eq "0" ] 2>/dev/null || [ -z "$DB_EXISTS" ]; then
    echo "Database [HorseTransportDB] does not exist. Creating schema and seeding data..."
    $SQLCMD -S db,1433 -U sa -P "$MSSQL_SA_PASSWORD" -C -i /init/HorseTransportDB.sql
    echo "=========================================================="
    echo "HorseTransportDB successfully created and seeded!"
    echo "=========================================================="
else
    echo "Database [HorseTransportDB] already exists ($DB_EXISTS database found). Preserving data."
fi
