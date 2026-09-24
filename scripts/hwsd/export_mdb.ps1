# Exports every table of the official HWSD2.mdb to CSV (one-time step before build_hwsd.py).
# Requires the 64-bit "Microsoft Access Driver (*.mdb, *.accdb)" ODBC driver (ships with Windows/Office).
param(
    [string]$Mdb = "data/hwsd/raw/HWSD2.mdb",
    [string]$Out = "data/hwsd/raw/csv"
)
$Mdb = (Resolve-Path $Mdb).Path
New-Item -ItemType Directory -Force $Out | Out-Null
$c = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$Mdb;")
$c.Open()
foreach ($r in ($c.GetSchema("Tables") | Where-Object TABLE_TYPE -eq "TABLE")) {
    $n = $r.TABLE_NAME
    $cmd = $c.CreateCommand()
    $cmd.CommandText = "SELECT * FROM [$n]"
    $dt = New-Object System.Data.DataTable
    [void](New-Object System.Data.Odbc.OdbcDataAdapter($cmd)).Fill($dt)
    $dt | Export-Csv -NoTypeInformation -Encoding utf8 -Path (Join-Path $Out "$n.csv")
    "$n $($dt.Rows.Count)"
}
$c.Close()
