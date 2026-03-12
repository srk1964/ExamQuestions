# Deployment Guide

Two deployment scripts are available to automate the build and AWS deployment process.

## Option 1: PowerShell Script (Recommended)

### Prerequisites
- AWS CLI configured with credentials
- Node.js and npm installed
- PowerShell 5.0 or later

### Usage

```powershell
# Basic deployment (builds, uploads to S3, invalidates CloudFront)
.\deploy.ps1

# Skip rebuild if you already built manually
.\deploy.ps1 -SkipBuild

# Skip CloudFront invalidation
.\deploy.ps1 -SkipInvalidate

# Skip both
.\deploy.ps1 -SkipBuild -SkipInvalidate
```

### What the script does:
1. **Builds** the frontend with `npm run build`
2. **Copies** `config.json` to the `frontend/dist/` folder
3. **Syncs** all files to S3 bucket with `--delete` flag
4. **Uploads** `config.json` with correct `application/json` content-type
5. **Invalidates** CloudFront distribution cache

### Output Example:
```
========================================
Quiz App Deployment Script
========================================

[1/4] Building frontend...
✓ Build completed

[2/4] Preparing config.json...
✓ config.json copied to dist/

[3/4] Syncing to S3...
✓ Files synced to S3
✓ config.json uploaded

[4/4] Invalidating CloudFront cache...
✓ Cache invalidation in progress (ID: I1D54VGNG0544OJHI0EXLEJWT8)

========================================
✓ Deployment complete!
========================================
```

## Option 2: Batch Script

### Usage

```batch
# Run from command prompt
deploy.bat
```

This performs the same steps as the PowerShell script. After completion, press any key to close the window.

## Configuration

Both scripts use the following hardcoded values from your AWS setup:
- **S3 Bucket:** `quizinfrastack-sitebucket397a1860-k45xapjpkqxj`
- **CloudFront Distribution ID:** `E3CHML5W6W5P6B`
- **Live URL:** `https://d3k3zexmg1qdq2.cloudfront.net`

To modify these, edit the configuration variables at the top of either script.

## After Deployment

1. **CloudFront Cache Invalidation:** Takes 1-2 minutes to propagate
2. **Hard-refresh your browser:** Use `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac) to bypass local cache
3. **Check deployment status:** Visit https://d3k3zexmg1qdq2.cloudfront.net

## Troubleshooting

### "AWS CLI not found"
- Install AWS CLI: https://aws.amazon.com/cli/
- Configure credentials: `aws configure`

### "npm run build failed"
- Navigate to `frontend/` directory
- Run `npm install` to ensure dependencies are installed
- Check for TypeScript errors in source code

### "S3 sync failed"
- Verify AWS credentials are configured
- Ensure you have permissions to the S3 bucket
- Check bucket name in the script configuration

### "config.json not found"
- Ensure `config.json` exists in the project root
- Check file permissions

### Changes not visible after deployment
- Wait for CloudFront invalidation to complete (1-2 minutes)
- Hard-refresh browser cache: `Ctrl+Shift+R` or `Cmd+Shift+R`
- Check browser DevTools > Network tab to confirm fresh files are being served

## Manual Deployment

If you prefer to run commands manually:

```powershell
# Build
cd frontend
npm run build
cd ..

# Prepare and sync
Copy-Item config.json frontend\dist\config.json
aws s3 sync frontend\dist s3://quizinfrastack-sitebucket397a1860-k45xapjpkqxj --delete
aws s3 cp frontend\dist\config.json s3://quizinfrastack-sitebucket397a1860-k45xapjpkqxj/config.json --content-type application/json

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id E3CHML5W6W5P6B --paths "/*"
```
