// Yandex SmartCaptcha для входа — тот же HTML, что в totus_APP (component/UI/YandexSmartCaptcha),
// но события уходят в хост через preload webview (window.desktopCaptchaPost).
export const YANDEX_SMARTCAPTCHA_SITEKEY = 'ysc1_cexvjBkBEaJafTiS4ZU31kHRKtvWGrPZJxJHEli9a614fb8b';
export const CAPTCHA_PAGE_URL = 'https://totus.club/desktop-captcha';
export const CAPTCHA_PARTITION = 'persist:totus-captcha';
const CHECKBOX_HEIGHT = 100;

export function buildCaptchaHtml(sitekey: string = YANDEX_SMARTCAPTCHA_SITEKEY): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
    #captcha-container { display: flex; justify-content: flex-start; align-items: flex-start; min-height: ${CHECKBOX_HEIGHT}px; width: 100%; padding: 2px 0; box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="captcha-container"></div>
  <script>
    function post(type, payload) {
      if (window.desktopCaptchaPost) { window.desktopCaptchaPost(type, payload || {}); }
    }
    function reportHeight() {
      var h = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0,
        (document.getElementById('captcha-container') || {}).scrollHeight || 0, ${CHECKBOX_HEIGHT});
      post('height', { height: h });
    }
    function renderCaptcha() {
      if (!window.smartCaptcha) { post('error', {}); return; }
      try {
        window.smartCaptcha.render('captcha-container', {
          sitekey: ${JSON.stringify(sitekey)},
          hl: 'ru',
          callback: function (token) { post('success', { token: token || '' }); setTimeout(reportHeight, 50); },
          'error-callback': function () { post('error', {}); },
          'network-error-callback': function () { post('network_error', {}); },
          'token-expired-callback': function () { post('expired', {}); },
          'challenge-visible-callback': function () { post('challenge', { open: true }); setTimeout(reportHeight, 80); },
          'challenge-hidden-callback': function () { post('challenge', { open: false }); setTimeout(reportHeight, 80); }
        });
        post('ready', {});
        setTimeout(reportHeight, 120);
        setTimeout(reportHeight, 500);
      } catch (e) { post('error', {}); }
    }
    var script = document.createElement('script');
    script.src = 'https://smartcaptcha.yandexcloud.net/captcha.js';
    script.async = true;
    script.onload = function () { renderCaptcha(); };
    script.onerror = function () { post('error', {}); };
    document.head.appendChild(script);
    window.addEventListener('resize', reportHeight);
    setInterval(reportHeight, 1000);
  </script>
</body>
</html>`;
}
