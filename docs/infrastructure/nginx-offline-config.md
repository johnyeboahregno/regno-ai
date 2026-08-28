# Nginx Configuration for Regno AI Error Pages

## Overview
This configuration enables nginx to serve custom error pages for:
- **404 Not Found** - Page doesn't exist
- **502/503/504 Offline** - Backend server unavailable

## Quick Start

1. **Verify files exist:**
   ```bash
   ls -lh /disks/disk1/chat/static/{404,offline}.html
   ```

2. **Add to your nginx config** (usually `/etc/nginx/sites-available/default` or `/etc/nginx/conf.d/regno.conf`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /disks/disk1/chat/static;

       error_page 404 /404.html;
       error_page 502 503 504 /offline.html;

       location / {
           proxy_pass http://127.0.0.1:5173;
           proxy_intercept_errors on;
       }

       location = /404.html { internal; }
       location = /offline.html { internal; }
   }
   ```

3. **Test and reload:**
   ```bash
   sudo nginx -t && sudo nginx -s reload
   ```

4. **Test the error pages:**
   ```bash
   # Test 404
   curl -I http://your-domain.com/nonexistent-page

   # Test offline (stop your app first)
   curl -I http://your-domain.com
   ```

## Configuration

### Basic Configuration

Add this to your nginx server block:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Root directory for static files
    root /path/to/chat/static;

    # Custom error pages
    error_page 404 /404.html;
    error_page 502 503 504 /offline.html;

    # Try to proxy to the backend
    location / {
        # Try backend first
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for detecting if backend is down
        proxy_connect_timeout 2s;
        proxy_send_timeout 5s;
        proxy_read_timeout 30s;

        # Intercept backend errors
        proxy_intercept_errors on;
    }

    # 404 error page
    location = /404.html {
        root /path/to/chat/static;
        internal;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Offline error page
    location = /offline.html {
        root /path/to/chat/static;
        internal;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Serve static assets normally (don't proxy these)
    location /static/ {
        alias /path/to/chat/static/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Allow error pages to load their resources
    location ~ ^/(404|offline)\.html$ {
        root /path/to/chat/static;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### Important: Set Correct Path

Replace `/path/to/chat/static` with your actual path, for example:

```nginx
root /disks/disk1/chat/static;
```

### Complete Example (Copy-Paste Ready)

Here's a complete working configuration:

```nginx
server {
    listen 80;
    server_name regno.yourdomain.com;

    # Path to static files
    root /disks/disk1/chat/static;

    # Enable custom error pages
    error_page 404 /404.html;
    error_page 502 503 504 /offline.html;

    # Main application proxy
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Detect backend failures quickly
        proxy_connect_timeout 2s;
        proxy_send_timeout 5s;
        proxy_read_timeout 30s;

        # Important: Intercept errors from backend
        proxy_intercept_errors on;
    }

    # Error page configurations
    location = /404.html {
        root /disks/disk1/chat/static;
        internal;
    }

    location = /offline.html {
        root /disks/disk1/chat/static;
        internal;
    }

    # Static assets
    location /static/ {
        alias /disks/disk1/chat/static/;
        expires 1d;
    }
}
```

## Alternative: Upstream with Health Checks

For production deployments with better failover:

```nginx
upstream regno_backend {
    server localhost:5173 max_fails=3 fail_timeout=10s;
    # Add more backend servers for redundancy
    # server localhost:5174 backup;
}

server {
    listen 80;
    server_name your-domain.com;

    root /path/to/chat/static;

    location / {
        proxy_pass http://regno_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Shorter timeouts to quickly detect backend failure
        proxy_connect_timeout 2s;
        proxy_send_timeout 5s;
        proxy_read_timeout 30s;

        # Show offline page on backend errors
        error_page 502 503 504 /offline.html;
    }

    location = /offline.html {
        root /path/to/chat/static;
        internal;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

## HTTPS Configuration

For SSL/TLS enabled sites:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    root /path/to/chat/static;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 2s;
        error_page 502 503 504 /offline.html;
    }

    location = /offline.html {
        root /path/to/chat/static;
        internal;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Testing the Configuration

1. **Test nginx configuration syntax:**
   ```bash
   sudo nginx -t
   ```

2. **Reload nginx:**
   ```bash
   sudo nginx -s reload
   # or
   sudo systemctl reload nginx
   ```

3. **Test offline page manually:**
   ```bash
   # Stop your Regno AI backend
   npm stop  # or however you stop your app

   # Visit your domain - should show offline page
   curl http://your-domain.com
   ```

4. **Verify auto-recovery:**
   ```bash
   # Start your Regno AI backend
   npm start

   # The offline page will auto-retry and redirect back to the app
   ```

## Features

### 404 Page (`404.html`)
- ✅ Matches Regno AI branding and color scheme
- ✅ Large "404" error code display
- ✅ Shows the URL that was not found
- ✅ Lists possible reasons for the error
- ✅ "Go to Home" and "Go Back" buttons
- ✅ Responsive design for mobile devices
- ✅ No external dependencies (fully self-contained)

### Offline Page (`offline.html`)
- ✅ Matches Regno AI branding and color scheme
- ✅ Auto-retries connection every 30 seconds (up to 10 times)
- ✅ Manual "Retry Connection" button
- ✅ "Return Home" button
- ✅ Animated status indicators with pulse effects
- ✅ Responsive design for mobile devices
- ✅ No external dependencies (fully self-contained)
- ✅ Shows last check time
- ✅ Service status badge

## Customization

To customize the offline page, edit `/path/to/chat/static/offline.html`:

- **Auto-retry interval:** Change `30000` (30 seconds) in the JavaScript
- **Max retry attempts:** Change `maxRetries = 10` in the JavaScript
- **Colors:** Modify the CSS custom properties
- **Messages:** Edit the HTML content

## Troubleshooting

**Offline page not showing:**
- Verify nginx has read permissions for `/path/to/chat/static/offline.html`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Ensure `internal;` directive doesn't prevent error page serving

**Backend not recovering:**
- Check backend logs for startup errors
- Verify backend is listening on the correct port
- Test backend directly: `curl http://localhost:5173`

**Offline page shows but assets missing:**
- Ensure all CSS/JS is inline (already done in the provided file)
- Check browser console for errors
