@echo off
REM Deploy script for Quiz App (Batch version)
REM Builds frontend, deploys to S3, and invalidates CloudFront

setlocal enabledelayedexpansion

REM Configuration
set S3_BUCKET=quizinfrastack-sitebucket397a1860-k45xapjpkqxj
set CLOUDFRONT_DIST_ID=E3CHML5W6W5P6B
set FRONTEND_DIR=frontend
set DIST_DIR=frontend\dist

echo.
echo ========================================
echo Quiz App Deployment Script
echo ========================================
echo.

REM Step 1: Build
echo [1/4] Building frontend...
cd %FRONTEND_DIR%
echo   Running npm install...
call npm install
if errorlevel 1 (
    echo npm install failed!
    cd ..
    exit /b 1
)
echo   Running npm run build...
call npm run build
if errorlevel 1 (
    echo Build failed!
    cd ..
    exit /b 1
)
cd ..
echo [OK] Build completed
echo.

REM Step 2: Copy config.json
echo [2/4] Preparing config.json...
if not exist config.json (
    echo ERROR: config.json not found in root directory!
    exit /b 1
)
copy config.json %DIST_DIR%\config.json /Y >nul
echo [OK] config.json copied to dist/
echo.

REM Step 3: Sync to S3
echo [3/4] Syncing to S3...
echo   Bucket: %S3_BUCKET%
aws s3 sync %DIST_DIR% s3://%S3_BUCKET% --delete
if errorlevel 1 (
    echo S3 sync failed!
    exit /b 1
)
echo [OK] Files synced to S3

echo   Uploading config.json with content-type...
aws s3 cp %DIST_DIR%\config.json s3://%S3_BUCKET%/config.json --content-type application/json
echo [OK] config.json uploaded
echo.

REM Step 4: Invalidate CloudFront
echo [4/4] Invalidating CloudFront cache...
echo   Distribution ID: %CLOUDFRONT_DIST_ID%
aws cloudfront create-invalidation --distribution-id %CLOUDFRONT_DIST_ID% --paths "/*" >nul
echo [OK] Cache invalidation in progress
echo.

echo ========================================
echo [OK] Deployment complete!
echo ========================================
echo.
echo Your app is live at:
echo   https://d3k3zexmg1qdq2.cloudfront.net
echo.
echo Note: CloudFront cache may take 1-2 minutes to invalidate.
echo       Hard-refresh your browser (Ctrl+Shift+R) to see changes.
echo.

timeout /t 300
