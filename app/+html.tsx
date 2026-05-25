import { type PropsWithChildren } from 'react';

import { ScrollViewStyleReset } from 'expo-router/html';

import {
  APP_DEEP_LINK_HOST,
  APP_SCHEME,
  APP_STORE_URL,
  IOS_UNIVERSAL_LINK,
  PLAY_STORE_URL,
  WEBSITE_URL,
} from '@/constants/app-links';

const redirectScript = `(function() {
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  const APP_SCHEME = '${APP_SCHEME}';
  const APP_DEEP_LINK_HOST = '${APP_DEEP_LINK_HOST}';
  const IOS_UNIVERSAL_LINK = '${IOS_UNIVERSAL_LINK}';
  const REDIRECT_HOSTS = ['maps-tracking-cuq2vl.web.app'];
  const APP_STORE_URL = '${APP_STORE_URL}';
  const PLAY_STORE_URL = '${PLAY_STORE_URL}';
  const WEBSITE_URL = '${WEBSITE_URL}';

  function shouldHandleRedirect() {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }

    return REDIRECT_HOSTS.indexOf(hostname) >= 0;
  }

  function detectPlatform() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'ios';
    }

    if (/android/i.test(userAgent)) {
      return 'android';
    }

    return 'web';
  }

  function attemptAppRedirect() {
    const platform = detectPlatform();

    if (platform === 'ios' || platform === 'android') {
      const normalizedPath = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
      const deepLink = platform === 'ios'
        ? IOS_UNIVERSAL_LINK + (normalizedPath ? '?path=' + encodeURIComponent(normalizedPath) : '')
        : APP_SCHEME + APP_DEEP_LINK_HOST + '/' + normalizedPath;
      const iframe = document.createElement('iframe');

      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      setTimeout(function() {
        if (document.hidden || document.webkitHidden) {
          return;
        }

        window.location.href = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
      }, 2500);

      setTimeout(function() {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 3000);

      return;
    }

    window.location.href = WEBSITE_URL;
  }

  function redirect() {
    if (!shouldHandleRedirect()) {
      return;
    }

    document.body.setAttribute('data-deep-link-redirect', 'active');
    attemptAppRedirect();
  }

  document.addEventListener('DOMContentLoaded', function() {
    const manualRedirect = document.getElementById('manual-redirect');

    if (manualRedirect) {
      manualRedirect.addEventListener('click', function(event) {
        event.preventDefault();
        redirect();
      });
    }

    setTimeout(redirect, 1500);
  });
})();`;

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr" className="bg-background">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Aficab - Redirecting...</title>
        <meta
          name="description"
          content="Aficab est une plateforme de location de vehicules avec chauffeur"
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Aficab - Louez en toute simplicite, roulez avec discretion"
        />
        <meta
          property="og:description"
          content="Aficab est une plateforme de location de vehicules avec chauffeur, specialisee dans la location journaliere et les transferts aeroport. Elle permet de reserver en ligne facilement un vehicule pour tous types de besoins, avec un service professionnel, flexible et securise."
        />
        <meta
          property="og:image"
          content="https://firebasestorage.googleapis.com/v0/b/maps-tracking-cuq2vl.firebasestorage.app/o/aficab-icon-white.png?alt=media&token=fa8dbd05-004c-4546-965f-df85fe39394d"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://maps-tracking-cuq2vl.web.app" />
        <meta property="og:site_name" content="Aficab" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@yourtwitterhandle" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                background: #f5f5f5;
                color: #333;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                min-height: 100vh;
              }

              #deep-link-redirect {
                display: none;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 24px;
                text-align: center;
              }

              #deep-link-redirect .container {
                max-width: 480px;
              }

              #deep-link-redirect h1 {
                font-size: 24px;
                margin-bottom: 10px;
                font-weight: 600;
              }

              #deep-link-redirect h3 {
                font-size: 18px;
                margin-bottom: 10px;
                font-weight: 400;
              }

              #deep-link-redirect p {
                font-size: 16px;
                color: #666;
                margin-bottom: 20px;
              }

              #deep-link-redirect .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #FE5900;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: deep-link-spin 1s linear infinite;
                margin: 20px auto;
              }

              @keyframes deep-link-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }

              #deep-link-redirect .manual-link {
                margin-top: 30px;
                font-size: 14px;
                color: #999;
              }

              #deep-link-redirect .manual-link a {
                color: #3498db;
                text-decoration: none;
              }

              #deep-link-redirect .manual-link a:hover {
                text-decoration: underline;
              }

              body[data-deep-link-redirect='active'] #deep-link-redirect {
                display: flex;
              }

              body[data-deep-link-redirect='active'] #root,
              body[data-deep-link-redirect='active'] > div[data-expo-router-root] {
                display: none;
              }
            `,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      </head>
      <body>
        <div id="deep-link-redirect">
          <div className="container">
            <h1>Aficab</h1>
            <h3>Louez en toute simplicite, roulez avec discretion</h3>
            <p>Redirection vers l'emplacement approprie...</p>
            <div className="spinner" />
            <div className="manual-link">
              Pas de redirection ?{' '}
              <a href="https://aficab.com" id="manual-redirect">
                Cliquez ici
              </a>
            </div>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
