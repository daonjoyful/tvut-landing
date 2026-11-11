(function () {
  'use strict';
  if (window.__tvutAnalyticsReady) return;
  window.__tvutAnalyticsReady = true;
  var measurementId = 'G-EGCJ3W7HM1';
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
  }
  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    var loader = document.createElement('script');
    loader.async = true;
    loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(loader);
  }
  var program = location.pathname.split('/')[2] || '';
  var groups = { amplaza: '아침마당', reallive: '생생정보', whatever: '무엇이든 물어보세요', sixhour: '6시 내고향' };
  // A separate group keeps legacy, unscoped click events out of this property.
  window.gtag('config', measurementId, {
    groups: 'tvut',
    content_group: groups[program] || (location.pathname === '/' ? '메인' : '방송 안내 목록')
  });
  // Anonymous, minute-level page-view counts: no query strings, IPs or visitor IDs.
  // Respect browser privacy signals and send only a fixed source category.
  if (!navigator.globalPrivacyControl && navigator.doNotTrack !== '1' && window.doNotTrack !== '1') {
    try {
      var source = 'unknown';
      if (document.referrer) {
        var ref = new URL(document.referrer), h = ref.hostname.toLowerCase();
        if (ref.origin === location.origin) source = 'internal';
        else if (h === 'search.naver.com' || h === 'm.search.naver.com') source = 'naver-search';
        else if (h === 'naver.com' || h.endsWith('.naver.com')) source = 'naver-other';
        else if (h === 'gemini.google.com' || h === 'copilot.microsoft.com') source = 'ai-other';
        else if (/(^|\.)google\.(com|co\.kr|com\.au|co\.jp|co\.uk)$/.test(h)) source = 'google-search';
        else if (h === 'search.daum.net' || h === 'm.search.daum.net') source = 'daum-search';
        else if (h === 'bing.com' || h.endsWith('.bing.com')) source = 'bing-search';
        else if (h === 'chatgpt.com' || h === 'chat.openai.com' || h.endsWith('.chatgpt.com')) source = 'ai-chatgpt';
        else if (h === 'claude.ai' || h.endsWith('.claude.ai')) source = 'ai-claude';
        else if (h === 'perplexity.ai' || h.endsWith('.perplexity.ai')) source = 'ai-perplexity';
        else source = 'external';
      }
      var eventBody=JSON.stringify({source:source,path:location.pathname});
      if (!navigator.sendBeacon || !navigator.sendBeacon('/api/traffic',new Blob([eventBody],{type:'text/plain'}))) {
        fetch('/api/traffic',{method:'POST',headers:{'Content-Type':'text/plain'},body:eventBody,credentials:'same-origin',keepalive:true}).catch(function(){});
      }
    } catch (_) { /* Analytics must never interrupt the page. */ }
  }
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest && event.target.closest('a[href]');
    if (!link || link.closest('ins.adsbygoogle, .google-auto-placed')) return;
    var url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    var host = url.hostname.replace(/^www\./, '');
    var eventName = '';
    if (url.protocol === 'tel:') eventName = 'phone_click';
    else if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    else if (host === 'youtube.com' || host === 'youtu.be') eventName = 'youtube_click';
    else if (host === 'instagram.com') eventName = 'instagram_click';
    else if (host === 'pf.kakao.com') eventName = 'kakao_channel_click';
    else if (host === 'm.site.naver.com' || host === 'play.google.com' || host === 'apps.apple.com') eventName = 'tvut_install_click';
    else if (host === 'daonjoyful.com') eventName = 'wordpress_article_click';
    else if (host === 'kbs.co.kr' || host.endsWith('.kbs.co.kr')) eventName = 'kbs_info_click';
    else if (url.origin === location.origin && url.pathname !== location.pathname) eventName = 'internal_guide_click';
    if (!eventName) return;
    var position = link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : link.closest('.top-cta, #hero') ? 'top' : 'body';
    window.gtag('event', eventName, {
      send_to: measurementId,
      link_text: (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
      link_position: position,
      // Query strings, fragments, and phone numbers are not needed for this report.
      link_url: url.protocol === 'tel:' ? 'tel:' : url.origin + url.pathname,
      transport_type: 'beacon'
    });
  }, { capture: true });
})();
