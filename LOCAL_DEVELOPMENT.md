# Local Development Setup

This guide explains how to run the application locally for faster development without uploading to Bluehost every time.

## Prerequisites

- PHP installed locally (PHP 7.4 or higher)
- Node.js and npm (for Angular)

## Check if PHP is installed

```bash
php --version
```

If not installed, download from: https://www.php.net/downloads.php

## Running Locally

### Option 1: Two Terminal Approach (Recommended)

**Terminal 1 - Run PHP Backend:**
```bash
# Navigate to project root
cd C:\Users\bigda\OneDrive\mycode\perfect brows\perefectcustomer01\perfectbrowsCustomer

# Start PHP built-in server on port 4200 (same as Angular)
php -S localhost:4200
```

**Terminal 2 - Run Angular Frontend:**
```bash
# Navigate to project root
cd C:\Users\bigda\OneDrive\mycode\perfect brows\perefectcustomer01\perfectbrowsCustomer

# Start Angular dev server
npm start
```

This will serve:
- Angular app: `http://localhost:4200`
- PHP API: `http://localhost:4200/api.php`
- Photos: `http://localhost:4200/tempdata/customer_photos/`

### Option 2: Separate Ports with Proxy

**Terminal 1 - PHP on port 8000:**
```bash
php -S localhost:8000
```

**Terminal 2 - Angular on port 4200:**
```bash
npm start
```

Then configure Angular proxy (create `proxy.conf.json`):
```json
{
  "/api.php": {
    "target": "http://localhost:8000",
    "secure": false
  },
  "/tempdata": {
    "target": "http://localhost:8000",
    "secure": false
  }
}
```

Update `package.json`:
```json
"start": "ng serve --proxy-config proxy.conf.json"
```

## Testing Locally

1. Start both PHP and Angular servers
2. Open browser to `http://localhost:4200`
3. Capture a photo and save a customer
4. Check the `tempdata/customer_photos/` folder - you should see the uploaded photo file!

## Benefits of Local Development

✅ **Faster** - No need to upload via git/FTP
✅ **See files immediately** - Photos appear in your local `tempdata` folder
✅ **Debug easier** - Can add `var_dump()` in PHP and see results instantly
✅ **Database** - Still connects to remote Bluehost MySQL (configured in db-config.php)

## Production Deployment

When deploying to Bluehost:
1. Commit changes to git
2. Push to repository
3. Pull on Bluehost server
4. The relative URLs (`/api.php`, `/tempdata/...`) will automatically work on the live server

## Troubleshooting

### PHP Server Issues
- **Port already in use:** Try a different port: `php -S localhost:8001`
- **Permission denied:** Run terminal as administrator

### Angular Issues
- **Can't connect to API:** Make sure PHP server is running
- **Photos not loading:** Check that `tempdata/customer_photos/` exists and has write permissions

### Database Connection
- App still connects to **remote Bluehost MySQL** even when running locally
- No local MySQL setup needed
- Connection details in `db-config.php`

