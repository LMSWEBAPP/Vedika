import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sim = searchParams.get('sim');
  const customUrl = searchParams.get('url');

  let targetUrl = customUrl;
  if (!targetUrl && sim) {
    targetUrl = `https://phet.colorado.edu/sims/html/${sim}/latest/${sim}_all.html`;
  }

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing sim or url parameter' }, { status: 400 });
  }

  // Append query flags to disable default PhET navbar & header
  if (!targetUrl.includes('navbar=false')) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl += `${separator}navbar=false&phetMode=embed`;
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      next: { revalidate: 86400 }
    });

    if (!res.ok) {
      return NextResponse.json({ error: `PhET server returned status ${res.status}` }, { status: res.status });
    }

    let html = await res.text();

    // Replace all text references to PhET on loading screen and title with Vedika Labs
    html = html.replaceAll('PhET Interactive Simulations', 'Vedika Virtual Labs');
    html = html.replaceAll('PhET', 'Vedika');

    // Inject base tag for CDN assets
    const cleanBaseUrl = targetUrl.split('?')[0];
    const baseUrl = cleanBaseUrl.substring(0, cleanBaseUrl.lastIndexOf('/') + 1);
    if (!html.includes('<base')) {
      html = html.replace('<head>', `<head><base href="${baseUrl}" />`);
    }

    // Inject custom CSS & JS to completely hide logos, navbars, menus, and branding
    const hideBrandingCode = `
      <style id="clean-lab-theme">
        /* Hide all bottom navigation bars, logo buttons, and PhET menus */
        div[class*="NavigationBar"],
        div[class*="NavigationBar-background"],
        div[class*="PhetButton"],
        div[class*="PhetMenu"],
        div[aria-label*="PhET"],
        div[aria-label*="phet"],
        .navigation-bar,
        #navigation-bar,
        button[title*="PhET"],
        a[href*="phet.colorado.edu"],
        svg[class*="phet"],
        img[src*="phet"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
        }
        body, html {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          height: 100% !important;
          background: #090B13 !important;
        }
      </style>
      <script>
        (function() {
          function purgeLogos() {
            var targets = document.querySelectorAll('div[class*="NavigationBar"], div[class*="PhetButton"], div[aria-label*="PhET"], div[aria-label*="phet"], a[href*="phet"]');
            targets.forEach(function(el) {
              if (el && el.parentNode) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.height = '0px';
              }
            });
          }
          setInterval(purgeLogos, 300);
          window.addEventListener('DOMContentLoaded', purgeLogos);
        })();
      </script>
    `;

    html = html.replace('</head>', `${hideBrandingCode}</head>`);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error('Error proxying simulation:', err);
    return NextResponse.json({ error: 'Failed to load simulation' }, { status: 500 });
  }
}
