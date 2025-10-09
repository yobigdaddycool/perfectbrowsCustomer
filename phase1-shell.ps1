# phase1-shell.ps1
# One-shot Phase 1 setup: styles, routes, app shell, and correctly named page components.
# Run this from your Angular project root (folder that contains angular.json).
# Usage:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   .\phase1-shell.ps1

$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "==> $m" -ForegroundColor Cyan }
function Ensure-Dir($p){ if(!(Test-Path $p)){ New-Item -ItemType Directory -Force -Path $p | Out-Null } }

# --- Verify Angular project root ---
if (!(Test-Path ".\angular.json")) {
  throw "Not an Angular project root. cd into your Angular app folder and run again."
}

# --- Ensure pages directories ---
$pages = @("register","search","scan")
foreach($name in $pages){
  Ensure-Dir ".\src\app\pages\$name"
}

# --- Write brand styles ---
Info "Writing src/styles.css"
@'
:root{ --brand:#d946ef; --brand-bg:#F9E0E6; }
html,body{height:100%;margin:0;font-family:system-ui,Segoe UI,Roboto,Arial;background:var(--brand-bg)}
.app-shell{max-width:1100px;margin:24px auto;padding:16px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 10px 25px rgba(17,24,39,.08)}
.header{display:flex;gap:12px;align-items:center;padding:14px 18px;background:linear-gradient(180deg, rgba(217,70,239,.12), rgba(217,70,239,0));border-bottom:1px solid #e5e7eb}
.logo{width:28px;height:28px;border-radius:8px;background:var(--brand)}
.nav{display:flex;gap:10px;flex-wrap:wrap;padding:12px 18px;border-bottom:1px dashed #e5e7eb}
.nav a{padding:8px 12px;border-radius:999px;border:1px solid #e5e7eb;color:#374151;text-decoration:none}
.nav a.active{background:var(--brand);color:#fff;border-color:transparent}
.content{padding:18px}
'@ | Set-Content .\src\styles.css -Encoding UTF8

# --- Write app shell ---
Info "Writing src/app/app.component.html"
@'
<div class="app-shell card">
  <div class="header">
    <div class="logo" aria-hidden="true"></div>
    <h1 style="margin:0;font-size:18px">Salon Customer Manager</h1>
  </div>
  <nav class="nav">
    <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Register</a>
    <a routerLink="/search" routerLinkActive="active">Search</a>
    <a routerLink="/scan" routerLinkActive="active">QR Scanner</a>
  </nav>
  <div class="content">
    <router-outlet></router-outlet>
  </div>
</div>
'@ | Set-Content .\src\app\app.component.html -Encoding UTF8

# --- Write correct standalone components (*.component.ts/html/css) and remove misnamed files ---
$defs = @(
  @{ name="register"; class="RegisterComponent"; title="Register"; note="Phase 2 will add full form." },
  @{ name="search";   class="SearchComponent";   title="Search";   note="Phase 3 will add search UI." },
  @{ name="scan";     class="ScanComponent";     title="QR Scanner"; note="Phase 4 will add camera + scanning." }
)

foreach($d in $defs){
  $dir = ".\src\app\pages\$($d.name)"
  # Remove misnamed files if present
  @("$dir\$($d.name).ts", "$dir\$($d.name).html", "$dir\$($d.name).css") | ForEach-Object {
    if(Test-Path $_){ Remove-Item $_ -Force }
  }

  # Component TS
  $ts = @"
import { Component } from '@angular/core';

@Component({
  selector: 'app-$($d.name)',
  standalone: true,
  templateUrl: './$($d.name).component.html',
  styleUrls: ['./$($d.name).component.css']
})
export class $($d.class) {}
"@
  $ts | Set-Content "$dir\$($d.name).component.ts" -Encoding UTF8

  # Component HTML
  $html = @"
<h2 style="margin:0 0 12px 0">$($d.title)</h2>
<p>Placeholder - $($d.note)</p>
"@
  $html | Set-Content "$dir\$($d.name).component.html" -Encoding UTF8

  # Component CSS (empty okay)
  "" | Set-Content "$dir\$($d.name).component.css" -Encoding UTF8

  Info "Ensured $($d.name) component files (*.component.ts/html/css)"
}

# --- Write routes with dynamic lazy imports ---
Info "Writing src/app/app.routes.ts"
@'
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), title: 'Register' },
  { path: 'search', loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent), title: 'Search' },
  { path: 'scan', loadComponent: () => import('./pages/scan/scan.component').then(m => m.ScanComponent), title: 'QR Scanner' },
  { path: '**', redirectTo: '' }
];
'@ | Set-Content .\src\app\app.routes.ts -Encoding UTF8

# --- Harmonize PWA manifest (if present) ---
$manifestPath = ".\src\manifest.webmanifest"
if (Test-Path $manifestPath) {
  try {
    $json = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $json.background_color = "#F9E0E6"
    $json.theme_color = "#d946ef"

    if (-not $json.shortcuts) { $json | Add-Member -NotePropertyName shortcuts -NotePropertyValue @() }
    # Ensure three shortcuts
    $need = @(
      @{ name="Register"; short_name="Register"; url="/" },
      @{ name="Search";   short_name="Search";   url="/search" },
      @{ name="QR Scanner"; short_name="Scan";   url="/scan" }
    )
    foreach($s in $need){
      if (-not ($json.shortcuts | Where-Object { $_.url -eq $s.url })) {
        $json.shortcuts += [PSCustomObject]$s
      }
    }
    ($json | ConvertTo-Json -Depth 8) | Set-Content $manifestPath -Encoding UTF8
    Info "Updated manifest.webmanifest (colors + shortcuts)"
  } catch {
    Write-Warning "Could not parse manifest.webmanifest; skipping update."
  }
}

Write-Host "`nPhase 1 shell complete." -ForegroundColor Green
Write-Host "Try: ng serve" -ForegroundColor Green
