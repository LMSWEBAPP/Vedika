# Google OAuth 500 Error Resolution & Integration Plan

This plan addresses the `FrappeTypeError` (HTTP 417) error encountered when attempting to call the Google authorize URL initializer, and handles the cross-site session cookie sharing.

## Root Cause Analysis

1. **Parameter Type Mismatch / Strict Type Checking:** 
   In Frappe v15, whitelisted API endpoints called over HTTP require explicit type annotations for parameter validation. The patched methods `get_google_auth_url(redirect_to)` and `test_google_auth_traceback(redirect_to)` did not have type annotations on the `redirect_to` parameter. This caused Frappe's API request handler to raise a `FrappeTypeError` (HTTP 417 Expectation Failed) before the methods could execute.
2. **Cross-Site Cookie Restrictions:** 
   Because the Next.js frontend runs on a different domain (`localhost:3000` in dev, or Vercel/Render) than the backend (`vyomanta.onrender.com`), session cookies (`sid`) set on the backend will not be sent back in cross-site fetch requests (e.g. from the callback page) unless the cookie is configured with `SameSite=None; Secure`. By default, Frappe sets `SameSite=Lax`, which blocks cross-site authentication.

---

## Proposed Changes

### Backend (LMS Docker Container)

#### [MODIFY] [patch_api.py](file:///c:/Users/seshu/vyomanta/backend/patch_api.py)
- Update whitelisted Google login methods to include explicit type annotations: `redirect_to: str = None`.

#### [MODIFY] [init-render-web.sh](file:///c:/Users/seshu/vyomanta/backend/init-render-web.sh)
- Add `"session_cookie_samesite": "None"` to `site_config.json` configuration so that session cookies (`sid`) are issued with the `SameSite=None; Secure` flags. This enables cross-site cookie sharing from the frontend.

---

## Verification Plan

### Automated Database Seeding Check
- Verify that `tabSocial Login Key` contains the correct Google credentials:
  ```bash
  node seed_google_oauth.js
  ```

### Redeploy Backend
- Commit and push changes to trigger a Render build:
  ```bash
  git add backend/
  git commit -m "fix: add parameter type annotations and configure SameSite=None for OAuth session cookies"
  git push
  ```

### Manual Verification
- Access the Next.js login screen.
- Click "Continue with Google".
- Confirm the endpoint returns a valid auth URL, redirects to Google, redirects back to Next.js callback, and successfully signs in.
