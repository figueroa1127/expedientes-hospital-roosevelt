<#
  crear-paquete.ps1
  ----------------------------------------------------------------------------
  Genera el paquete de entrega del sistema de Expedientes Medicos Digitales
  del Hospital Roosevelt con TODO en conjunto:
    - Codigo fuente completo (frontend + backend)
    - Base de datos: volcado local (PostgreSQL) y de la nube (Neon)
    - Documentacion (DOCUMENTACION.md y los PDF)
    - Archivos de configuracion (.env)
    - Repositorio git (.git)

  Produce dos archivos en el Escritorio:
    expedientes-hospital-roosevelt-COMPLETO.zip  (incluye node_modules)
    expedientes-hospital-roosevelt.zip           (ligero, sin node_modules)

  Uso:
    powershell -ExecutionPolicy Bypass -File .\crear-paquete.ps1
    powershell -ExecutionPolicy Bypass -File .\crear-paquete.ps1 -NeonUrl "postgresql://..."
#>

param(
  [string]$NeonUrl = "",
  [string]$Destino = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'
$proyecto = Split-Path -Parent $MyInvocation.MyCommand.Path
$pgDump = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
if (-not (Test-Path $pgDump)) {
  $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($cmd) { $pgDump = $cmd.Source }
}

function Escribir($texto) { Write-Host $texto }

Escribir '== Paquete de entrega - Expedientes Medicos Digitales (Hospital Roosevelt) =='
Escribir ''

$fecha = Get-Date -Format 'yyyy-MM-dd HH:mm'

# --- Leer la contrasena local desde backend\.env ---------------------------
$envFile = Join-Path $proyecto 'backend\.env'
if (Test-Path $envFile) {
  foreach ($linea in Get-Content $envFile) {
    if ($linea -match '^\s*PGPASSWORD\s*=\s*(.+)$') { $env:PGPASSWORD = $matches[1].Trim() }
  }
}

# --- Preparar carpetas temporales -----------------------------------------
$tempRaiz = Join-Path $env:TEMP 'paquete-hr'
if (Test-Path $tempRaiz) { Remove-Item -LiteralPath $tempRaiz -Recurse -Force }
$completo = Join-Path $tempRaiz 'completo'
$ligero = Join-Path $tempRaiz 'ligero'
New-Item -ItemType Directory -Path $completo, $ligero -Force | Out-Null

# --- Volcados de base de datos --------------------------------------------
$dirBd = Join-Path $tempRaiz 'base-de-datos'
New-Item -ItemType Directory -Path $dirBd -Force | Out-Null

if ($pgDump) {
  Escribir "Volcando base de datos local (PostgreSQL)..."
  & $pgDump -U postgres -d expedientes_hospital -f (Join-Path $dirBd '02_postgresql_local.sql')
  Escribir "  -> 02_postgresql_local.sql"

  if ($NeonUrl) {
    Escribir "Volcando base de datos en la nube (Neon)..."
    & $pgDump $NeonUrl -f (Join-Path $dirBd '01_neon_nube.sql')
    Escribir "  -> 01_neon_nube.sql"
  } else {
    Escribir "  (Sin -NeonUrl: no se volco la base de la nube)"
  }
} else {
  Escribir "  (No se encontro pg_dump; se omiten los volcados)"
}

# --- Copiar el codigo fuente ----------------------------------------------
Escribir 'Copiando codigo fuente...'
robocopy $proyecto (Join-Path $completo 'expedientes-hospital-roosevelt') /E /XF vite.log /NFL /NDL /NJH /NJS /NP | Out-Null
robocopy $proyecto (Join-Path $ligero 'expedientes-hospital-roosevelt') /E /XD node_modules .git /XF .env vite.log /NFL /NDL /NJH /NJS /NP | Out-Null

# --- Documentos y dumps a ambas carpetas ----------------------------------
# Se copian todos los PDF cuyo nombre contenga "Documentaci..." o "Guia/Guia"
$pdfs = @()
if (Test-Path $Destino) {
  $pdfs = Get-ChildItem -LiteralPath $Destino -Filter '*.pdf' -File |
          Where-Object { $_.Name -match 'Documentaci' -or $_.Name -match '^Gu.a' }
}
if ($pdfs.Count -eq 0) { Escribir "  (Aviso: no se encontraron PDFs en $Destino)" }

foreach ($carpeta in @($completo, $ligero)) {
  Copy-Item -LiteralPath $dirBd -Destination $carpeta -Recurse -Force
  foreach ($pdf in $pdfs) {
    Copy-Item -LiteralPath $pdf.FullName -Destination $carpeta -Force
  }

  $leeme = @"
PAQUETE DE ENTREGA - EXPEDIENTES MEDICOS DIGITALES
Hospital Roosevelt
Generado el $fecha

CONTENIDO
  expedientes-hospital-roosevelt/   Codigo completo (frontend + backend)
  base-de-datos/                    Volcados de PostgreSQL
      01_neon_nube.sql              Base de datos en la nube (Neon)
      02_postgresql_local.sql       Base de datos local
  *.pdf                             Documentacion tecnica y guia del sistema

COMO LEVANTAR EL SISTEMA (resumen)
  1. Instalar PostgreSQL y crear la base:  CREATE DATABASE expedientes_hospital;
  2. Restaurar los datos:  psql -U postgres -d expedientes_hospital -f base-de-datos/02_postgresql_local.sql
  3. En backend/:   copiar .env.example a .env y ajustar la conexion
                    npm install   y   npm run seed   y   npm run dev
  4. En frontend/:  npm install   y   npm run dev   ->  http://localhost:5173

CUENTAS DE PRUEBA
  admin@hospitalroosevelt.gt / Admin123!   (Administrador)
  admision@hospitalroosevelt.gt / Admision123!
  enfermeria@hospitalroosevelt.gt / Enfermeria123!
  medico@hospitalroosevelt.gt / Medico123!
  paciente@hospitalroosevelt.gt / Paciente123!
"@
  Set-Content -LiteralPath (Join-Path $carpeta 'LEEME.txt') -Value $leeme -Encoding UTF8
}

# --- Comprimir -------------------------------------------------------------
$zCompleto = Join-Path $Destino 'expedientes-hospital-roosevelt-COMPLETO.zip'
$zLigero = Join-Path $Destino 'expedientes-hospital-roosevelt.zip'
Remove-Item -LiteralPath $zCompleto, $zLigero -ErrorAction SilentlyContinue

Escribir 'Comprimiendo paquete COMPLETO...'
$lista = @('expedientes-hospital-roosevelt', 'base-de-datos', 'LEEME.txt') + ($pdfs | ForEach-Object { $_.Name })
tar.exe -a -c -f $zCompleto -C $completo @lista
if ($LASTEXITCODE -ne 0) { Escribir "  Aviso: tar termino con codigo $LASTEXITCODE" }
Escribir 'Comprimiendo paquete LIGERO...'
Compress-Archive -Path (Join-Path $ligero '*') -DestinationPath $zLigero -CompressionLevel Optimal

# --- Resumen ---------------------------------------------------------------
Escribir ''
Escribir 'Listo. Archivos generados:'
Get-ChildItem $zCompleto, $zLigero | ForEach-Object {
  Escribir ("  {0}  ({1} MB)" -f $_.Name, [math]::Round($_.Length / 1MB, 1))
}
Remove-Item -LiteralPath $tempRaiz -Recurse -Force
