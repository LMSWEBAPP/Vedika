# Hosting & Wrapping Guide: Next.js Frontend & Frappe Backend

Since Next.js runs on **Node.js (JavaScript)** and Frappe runs on **Python/WSGI**, you cannot merge them into a single executable or project folder. They must run as two separate processes.

However, you can host them under a **single domain** (e.g., `my-lms.com`) so that they feel like a single application to the browser. This resolves any CORS (Cross-Origin Resource Sharing) issues and simplifies SSL configuration.

Here are the three best ways to achieve this.

---

## Method 1: Reverse Proxy with Nginx (Recommended for Production)

This is the standard, most robust method. You host both Next.js and Docker on the same server, and use **Nginx** as a traffic cop. Nginx listens on port 80/443 (HTTP/HTTPS) and routes traffic based on the URL path.

```mermaid
graph TD
    User([User Request]) -->|my-lms.com| Nginx[Nginx Reverse Proxy]
    
    Nginx -->|/api/* or /assets/*| Frappe[Frappe Backend (Port 8080)]
    Nginx -->|Everything Else: /course, /dashboard| NextJS[Next.js Frontend (Port 3000)]
```

### Nginx Configuration Example
Create a server block in your Nginx configuration:

```nginx
server {
    listen 80;
    server_name my-lms.com;

    # 1. Route frontend requests to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. Route backend API and Resource requests to Frappe
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Route backend file uploads & static assets to Frappe
    location /files/ {
        proxy_pass http://localhost:8080/files/;
        proxy_set_header Host $host;
    }
}
```

---

## Method 2: Next.js Rewrites (`next.config.js`)

If you want the Next.js server to act as the entry point directly without setting up Nginx, you can configure **Next.js Rewrites**. Next.js will proxy requests starting with `/api` to the Frappe backend.

### How to configure `next.config.js`:
Modify your `next.config.js` to look like this:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*', // Proxy to Frappe backend
      },
      {
        source: '/files/:path*',
        destination: 'http://localhost:8080/files/:path*', // Proxy uploads
      }
    ]
  },
};

module.exports = nextConfig;
```

* **Pros**: Easy to configure, works out of the box in development and production without managing Nginx files.
* **Cons**: Next.js server must process the API proxy overhead, which can slow it down slightly under heavy traffic.

---

## Method 3: Subdomain Hosting (CORS Method)

If you are using cloud providers like Vercel (for frontend) and a VPS (for backend), a single-server reverse proxy might not be possible. Instead, you host them on separate domains:
* Frontend: `my-lms.com` (Vercel)
* Backend: `api.my-lms.com` (Docker container on VPS)

To make this work:
1. Set `FRAPPE_URL` in Next.js to `"https://api.my-lms.com"`.
2. Configure **CORS** inside the Frappe site config (`site_config.json`) to allow requests from your frontend:
   ```json
   "allow_cors": "https://my-lms.com"
   ```
