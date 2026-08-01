# Vyomanta Web Application Security Roadmap

This document outlines the security architecture, controls, and best practices that should be implemented in the Vyomanta web application. It covers authentication, authorization, api security, data protection, and general web security principles.

---

## 1. Authentication (AuthN)
Authentication verifies *who* the user is. Protecting user credentials and session tokens is the first line of defense.

### A. Password Storage & Hashing
*   **Hash Function**: Never store plain-text passwords. Use **Argon2id** (preferred) or **bcrypt** with a work factor (salt rounds) of at least `10` or `12`.
*   **Salt**: Ensure every password has a unique, cryptographical salt automatically handled by the hashing library.
*   **Implementation Example (bcrypt)**:
    ```javascript
    import bcrypt from 'bcrypt';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    ```

### B. Session Management & Token Security
*   **JWT vs Sessions**: For Next.js, JWT-based sessions are common, but they must be stored securely.
*   **Cookie Storage**: Store authentication tokens (JWT or Session ID) in **HTTP-only, Secure, SameSite=Lax/Strict** cookies.
    *   `HttpOnly`: Prevents client-side scripts (JS) from reading the cookie, mitigating Cross-Site Scripting (XSS) token theft.
    *   `Secure`: Ensures cookies are only sent over encrypted HTTPS connections.
    *   `SameSite=Lax` or `SameSite=Strict`: Protects against Cross-Site Request Forgery (CSRF).
*   **Short Token Lifespans & Refresh Tokens**:
    *   *Access Tokens*: Short-lived (e.g., 15 minutes).
    *   *Refresh Tokens*: Longer-lived (e.g., 7 days) and stored securely in a database. Implement **Refresh Token Rotation (RTR)**: when a refresh token is used, invalidate it and issue a new one to prevent replay attacks.
*   **Session Invalidation**: Provide a clear logout endpoint that deletes the cookie client-side and invalidates/blacklists the token in the database/cache (e.g., Redis).

### C. Multi-Factor Authentication (MFA)
*   Integrate MFA (Time-based One-Time Passwords - TOTP) using authenticator apps (Google Authenticator, Duo) or WebAuthn (Passkeys/Security Keys) for high-privilege roles (like administrators).

### D. Rate Limiting on Auth Endpoints
*   Implement strict rate limiting on `/api/auth/login`, `/api/auth/signup`, and `/api/auth/reset-password` routes to prevent brute-force and credential-stuffing attacks.

---

## 2. Authorization (AuthZ)
Authorization verifies *what* an authenticated user is allowed to do.

### A. Role-Based Access Control (RBAC)
Define explicit user roles (e.g., `student`, `instructor`, `admin`) and map permissions to these roles.
*   **Student**: Access to quizzes, flashcards, lessons, and progress tracking.
*   **Instructor**: Manage courses, assignments, and view student progress.
*   **Admin**: Complete system access, audit logs, and user management.

### B. Middleware-Level Route Guards (Next.js)
Guard both frontend pages and backend API routes. Use Next.js `middleware.js` to inspect JWT tokens and verify access roles before serving pages or routing requests.
*   **Example Middleware Outline**:
    ```javascript
    // middleware.js
    import { NextResponse } from 'next/server';
    import { decrypt } from '@/lib/auth'; // Custom decryption helper

    export async function middleware(request) {
      const token = request.cookies.get('session')?.value;
      if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
      const session = await decrypt(token);
      const { pathname } = request.nextUrl;
      
      // Admin route guard
      if (pathname.startsWith('/admin') && session.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      
      return NextResponse.next();
    }
    ```

### C. Broken Object Level Authorization (BOLA / IDOR)
Ensure users cannot access or modify records belonging to other users simply by changing an ID parameter in the URL or API request.
*   **Rule**: Always query database records using the user ID extracted from the verified session/token, rather than relying solely on the ID supplied in the request body or query parameter.
*   **Vulnerable**: `SELECT * FROM progress WHERE id = ?` (where ID comes from client)
*   **Secure**: `SELECT * FROM progress WHERE id = ? AND user_id = ?` (where user_id comes from verified session token)

---

## 3. Web Application Security (OWASP Top 10 Mitigation)

### A. Cross-Site Scripting (XSS) Protection
XSS occurs when malicious scripts are injected into trusted websites.
*   **Automatic Escaping**: React/Next.js automatically escapes values rendered in JSX.
*   **Dangerous Rendering**: Avoid `dangerouslySetInnerHTML` unless input is strictly sanitized using a library like **DOMPurify** (for Node.js/client).
*   **Content Security Policy (CSP)**: Implement a strict CSP header to restrict where scripts, styles, and media can be loaded from.
    *   Define headers in `next.config.js` or middleware:
        ```text
        default-src 'self'; script-src 'self' 'unsafe-eval' https://apis.google.com; style-src 'self' 'unsafe-inline';
        ```

### B. Cross-Site Request Forgery (CSRF) Mitigation
CSRF forces an authenticated user to execute unwanted actions on a web application.
*   **SameSite Cookies**: Setting cookies with `SameSite=Lax` or `Strict` prevents the browser from sending cookies along with cross-site requests.
*   **Anti-CSRF Tokens**: For highly critical state-changing requests (like changing passwords or emails), require a double-submit CSRF token passed in custom HTTP request headers (e.g., `X-CSRF-Token`).

### C. SQL Injection (SQLi) Prevention
SQLi occurs when untrusted input is concatenated directly into SQL statements.
*   **Prepared Statements**: Always use prepared statements/parameterized queries. Never concatenate variables directly into SQL queries.
*   **Example (MySQL2)**:
    ```javascript
    // Secure
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    // Insecure
    const [rows] = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
    ```
*   Alternatively, use a trusted ORM like **Prisma** or **Sequelize** which parameterize queries by default.

### D. Security Headers
Inject HTTP response headers that instruct the browser on how to behave safely.
*   `Strict-Transport-Security (HSTS)`: Forces connections over HTTPS.
*   `X-Frame-Options: DENY` or `SAMEORIGIN`: Prevents Clickjacking attacks.
*   `X-Content-Type-Options: nosniff`: Prevents mime-type sniffing.
*   `Referrer-Policy: strict-origin-when-cross-origin`: Controls referrer headers.
*   `Permissions-Policy`: Restricts browser features (like camera, microphone, geolocation) unless explicitly allowed.

---

## 4. API Security

### A. Input Validation & Sanitization
*   Never trust input from the client. Validate all incoming request schemas (body, query, and headers).
*   Use validation libraries like **Zod** or **Joi** to enforce strict type checking, string limits, and schemas.
    ```javascript
    import { z } from 'zod';
    
    const registrationSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8).max(100),
    });
    ```

### B. CORS (Cross-Origin Resource Sharing)
*   Restrain CORS policies. Do not set `Access-Control-Allow-Origin: *` in production.
*   Explicitly whitelist only the domain name(s) that should be allowed to make API requests to your server (e.g., your frontend domain).

### C. Rate Limiting (DOS & DDOS Protection)
*   Protect your API from abuse by limiting the number of requests a single IP address can make in a given timeframe.
*   Implement rate limiting middleware using an in-memory cache or a shared distributed cache (like Redis / Upstash Redis).

### D. Safe Secret Management
*   **Never commit API keys, database credentials, or JWT secrets to Git.**
*   Store secrets in `.env.local` or environment variables on your deployment platform (Vercel, Render, AWS).
*   Add `.env` and `.env.local` to your `.gitignore`.
*   For enterprise deployments, retrieve credentials at runtime using key managers like HashiCorp Vault or AWS Secrets Manager.

---

## 5. Data Encryption & Logs

### A. HTTPS (Encryption in Transit)
*   Ensure SSL/TLS is enabled on your domain. Force redirect all HTTP traffic to HTTPS.
*   Configure SSL labs Grade A settings on servers.

### B. Database Encryption (Encryption at Rest)
*   Encrypt database backups and filesystems.
*   Encrypt highly sensitive database columns (like personal identifiable information or custom API integration keys) using symmetric encryption algorithms (AES-256-GCM).

### C. Clean Logging
*   Inspect application loggers. Ensure that raw query payloads, password strings, raw JWTs, and full credit card/PII details are filtered out of log outputs to prevent data exposure in monitoring systems (like Datadog, Loggly, or CloudWatch).
