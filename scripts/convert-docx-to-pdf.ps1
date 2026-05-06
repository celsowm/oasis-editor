param(
  [Parameter(Mandatory = $true)]
  [string]$DocxPath,

  [Parameter(Mandatory = $true)]
  [string]$PdfPath
)

$word = $null
$document = $null

try {
  $resolvedDocx = (Resolve-Path -LiteralPath $DocxPath).Path
  $pdfDirectory = Split-Path -Parent $PdfPath
  if (-not [string]::IsNullOrWhiteSpace($pdfDirectory)) {
    New-Item -ItemType Directory -Force -Path $pdfDirectory | Out-Null
  }

  $resolvedPdf = [System.IO.Path]::GetFullPath($PdfPath)

  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  $readOnly = $true
  $isVisible = $false
  $document = $word.Documents.Open($resolvedDocx, [ref]$false, [ref]$readOnly, [ref]$false, "", "", $isVisible)

  $wdExportFormatPdf = 17
  $wdExportOptimizeForPrint = 0
  $wdExportAllDocument = 0
  $wdExportDocumentContent = 0
  $wdExportCreateNoBookmarks = 0

  $document.ExportAsFixedFormat(
    $resolvedPdf,
    $wdExportFormatPdf,
    $false,
    $wdExportOptimizeForPrint,
    0,
    0,
    $wdExportAllDocument,
    $wdExportDocumentContent,
    $false,
    $true,
    $wdExportCreateNoBookmarks,
    $true,
    $false,
    $false
  )
}
finally {
  if ($document -ne $null) {
    $document.Close([ref]$false)
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($document) | Out-Null
  }

  if ($word -ne $null) {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
