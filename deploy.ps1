# Deploy script for Quiz App
# Builds frontend, deploys to S3, and invalidates CloudFront

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipInvalidate = $false
)

# Configuration
$S3_BUCKET = "quizinfrastack-sitebucket397a1860-k45xapjpkqxj"
$CLOUDFRONT_DIST_ID = "E3CHML5W6W5P6B"
$FRONTEND_DIR = ".\frontend"
$DIST_DIR = ".\frontend\dist"

# Helper function to check for required commands
function Assert-CommandExists {
    param($command)
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        Write-Host "✗ Prerequisite not met: '$command' command not found." -ForegroundColor Red
        Write-Host "  Please install it and ensure it's in your system's PATH." -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quiz App Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Prerequisite checks
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow
Assert-CommandExists "npm"
Assert-CommandExists "aws"
Write-Host "✓ Prerequisites met" -ForegroundColor Green
Write-Host ""

# Step 2: Build
if (-not $SkipBuild) {
    Write-Host "[2/5] Building frontend..." -ForegroundColor Yellow
    Push-Location $FRONTEND_DIR
    Write-Host "  Running npm install..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Running npm run build..." -ForegroundColor Gray
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Build failed!" -ForegroundColor Red
        exit 1
    }
    Pop-Location
    Write-Host "✓ Build completed" -ForegroundColor Green
} else {
    Write-Host "[2/5] Skipping build (--SkipBuild)" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Copy config.json
Write-Host "[3/5] Preparing config.json..." -ForegroundColor Yellow
if (-not (Test-Path "./config.json")) {
    Write-Host "✗ config.json not found in root directory!" -ForegroundColor Red
    exit 1
}
Copy-Item "./config.json" "$DIST_DIR/config.json" -Force
Write-Host "✓ config.json copied to dist/" -ForegroundColor Green

Write-Host ""

# Step 4: Sync to S3
Write-Host "[4/5] Syncing to S3..." -ForegroundColor Yellow
Write-Host "  Bucket: $S3_BUCKET" -ForegroundColor Gray
aws s3 sync $DIST_DIR "s3://$S3_BUCKET" --delete
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ S3 sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Files synced to S3" -ForegroundColor Green

# Ensure config.json is properly uploaded with correct content type
Write-Host "  Uploading config.json with content-type..." -ForegroundColor Gray
aws s3 cp "$DIST_DIR/config.json" "s3://$S3_BUCKET/config.json" --content-type application/json
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ config.json upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ config.json uploaded" -ForegroundColor Green

Write-Host ""

# Step 5: Invalidate CloudFront
if (-not $SkipInvalidate) {
    Write-Host "[5/5] Invalidating CloudFront cache..." -ForegroundColor Yellow
    Write-Host "  Distribution ID: $CLOUDFRONT_DIST_ID" -ForegroundColor Gray
    $invalidationOutput = aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ CloudFront invalidation failed! See error from AWS CLI above." -ForegroundColor Red
        exit 1
    }
    $invalidation = $invalidationOutput | ConvertFrom-Json
    Write-Host "✓ Cache invalidation in progress (ID: $($invalidation.Invalidation.Id))" -ForegroundColor Green
} else {
    Write-Host "[5/5] Skipping CloudFront invalidation (--SkipInvalidate)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app will be live at:" -ForegroundColor Cyan
Write-Host "  https://d3k3zexmg1qdq2.cloudfront.net" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: CloudFront cache may take 1-2 minutes to invalidate." -ForegroundColor Gray
Write-Host "      Hard-refresh your browser (Ctrl+Shift+R) to see changes." -ForegroundColor Gray
