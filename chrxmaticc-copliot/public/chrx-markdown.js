/* ═══════════════════════════════════════════
   chrx-markdown.js — Live Code Execution v1.1
   :::css :::html :::js :::theme :::preset :::reset :::image :::file
   ═══════════════════════════════════════════ */

var CHRX_PRESETS = {};
var INJECTED_CSS_ID = 'chrx-injected-css';
var INJECTED_STYLES = [];

(function initMarkdown() {
  try {
    CHRX_PRESETS = JSON.parse(localStorage.getItem('chrx_presets') || '{}');
    INJECTED_STYLES = JSON.parse(localStorage.getItem('chrx_injected_styles') || '[]');
    if (INJECTED_STYLES.length > 0) injectCSS(INJECTED_STYLES.join('\n'));
  } catch(e) {}
})();

function parseChrxMarkdown(text) {
  if (!text || typeof text !== 'string') return { cleanText: text || '', blocks: [] };
  var blocks = [];
  var regex = /:::(\w+)(?:\s+(.+?))?\n([\s\S]*?):::/g;
  var match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ type: match[1], param: match[2] || '', content: match[3].trim(), raw: match[0] });
  }
  var cleanText = text.replace(regex, '').trim();
  return { cleanText: cleanText, blocks: blocks };
}

function executeChrxBlock(block) {
  switch (block.type) {
    case 'theme':
      var themeMap = { gold: 'gold', midnight: 'midnight', glass: 'glass', chrome: 'chrome', white: 'white', light: 'white', chromatic: 'chromatic', liquid: 'liquid', rainbow: 'rainbow', hacker: 'hacker' };
      var t = themeMap[block.param] || block.param || 'gold';
      if (typeof setTheme === 'function') setTheme(t);
      return { html: (typeof getEmojiHTML === 'function' ? getEmojiHTML(':geto:') : '') + ' Theme: <strong>' + t + '</strong>', type: 'system' };
    
    case 'css':
      injectCSS(block.content);
      return { html: '✨ CSS injected (' + block.content.length + ' chars)', type: 'system' };
    
    case 'html':
      return { html: '<div class="chrx-html-block" style="border-radius:12px;overflow:hidden;margin:8px 0">' + block.content + '</div>', type: 'html' };
    
    case 'js':
      try {
        var result = new Function('"use strict";' + block.content)();
        return { html: '✅ JS executed' + (result !== undefined ? ': ' + String(result).slice(0, 100) : ''), type: 'system' };
      } catch(e) {
        return { html: '❌ JS Error: ' + e.message, type: 'error' };
      }
    
    case 'preset':
      var parts = (block.param || '').split(' ');
      if (parts[0] === 'save' && parts[1]) {
        CHRX_PRESETS[parts[1]] = INJECTED_STYLES.join('\n');
        localStorage.setItem('chrx_presets', JSON.stringify(CHRX_PRESETS));
        return { html: '💾 Preset <strong>' + parts[1] + '</strong> saved', type: 'system' };
      } else if (parts[0] === 'load' && parts[1] && CHRX_PRESETS[parts[1]]) {
        injectCSS(CHRX_PRESETS[parts[1]]);
        return { html: '📂 Preset <strong>' + parts[1] + '</strong> loaded', type: 'system' };
      } else if (parts[0] === 'delete' && parts[1]) {
        delete CHRX_PRESETS[parts[1]];
        localStorage.setItem('chrx_presets', JSON.stringify(CHRX_PRESETS));
        return { html: '🗑️ Preset <strong>' + parts[1] + '</strong> deleted', type: 'system' };
      } else if (parts[0] === 'list') {
        var names = Object.keys(CHRX_PRESETS);
        return { html: '📋 Presets: ' + (names.length ? names.join(', ') : 'none'), type: 'system' };
      }
      return { html: '❌ Usage: :::preset save|load|delete|list [name]', type: 'error' };
    
    case 'reset':
      resetAllInjections();
      return { html: '🔄 All customizations cleared ' + (typeof getEmojiHTML === 'function' ? getEmojiHTML(':geto:') : ''), type: 'system' };

    case 'image':
      var prompt = (block.param ? block.param + ' ' : '') + block.content;
      var imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt.trim());
      return { html: '<img src="' + imgUrl + '" alt="' + prompt + '" style="width:100%;max-width:512px;border-radius:16px;margin:8px 0;" loading="lazy">', type: 'html' };

    case 'file':
      // Generate a downloadable file from the content
      var filename = block.param || 'download.txt';
      var mime = 'text/plain';
      var ext = filename.split('.').pop().toLowerCase();
      var mimeMap = {
        'obj': 'text/plain',
        'stl': 'text/plain',
        'js': 'application/javascript',
        'html': 'text/html',
        'css': 'text/css',
        'json': 'application/json',
        'py': 'text/x-python',
        'md': 'text/markdown',
        'txt': 'text/plain',
        'glb': 'model/gltf-binary',
        'gltf': 'model/gltf+json'
      };
      if (mimeMap[ext]) mime = mimeMap[ext];
      var blob = new Blob([block.content], { type: mime });
      var url = URL.createObjectURL(blob);
      var sizeKB = (blob.size / 1024).toFixed(1);
      return {
        html: '<div style="display:flex;align-items:center;gap:12px;background:var(--surf);border:1px solid var(--brd);border-radius:14px;padding:14px 18px;margin:8px 0;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 24px rgba(0,0,0,.2)">' +
          '<div style="font-size:28px;">📦</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + filename + '</div>' +
            '<div style="font-size:10px;color:var(--mut);margin-top:2px">' + sizeKB + ' KB • ' + ext.toUpperCase() + ' file</div>' +
          '</div>' +
          '<a href="' + url + '" download="' + filename + '" style="background:linear-gradient(135deg,var(--a2),var(--a));color:var(--bg);padding:8px 16px;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;transition:transform .2s,box-shadow .2s;cursor:pointer;flex-shrink:0" onmouseover="this.style.transform=\'scale(1.05)\';this.style.boxShadow=\'0 0 16px var(--glow)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'none\'">⬇ Download</a>' +
        '</div>',
        type: 'html'
      };
    
    default:
      return null;
  }
}

function injectCSS(css) {
  var styleEl = document.getElementById(INJECTED_CSS_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = INJECTED_CSS_ID;
    document.head.appendChild(styleEl);
  }
  INJECTED_STYLES.push(css);
  styleEl.textContent = INJECTED_STYLES.join('\n');
  try { localStorage.setItem('chrx_injected_styles', JSON.stringify(INJECTED_STYLES)); } catch(e) {}
}

function resetAllInjections() {
  // Remove the injected style element
  var styleEl = document.getElementById(INJECTED_CSS_ID);
  if (styleEl) styleEl.remove();
  INJECTED_STYLES = [];
  localStorage.removeItem('chrx_injected_styles');

  // Remove any external font links added via :::html or :::css
  var links = document.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(function(link) {
    if (link.href && (link.href.includes('fonts.googleapis.com') || link.href.includes('fonts.gstatic.com'))) {
      link.remove();
    }
  });

  // Remove any HTML blocks rendered by :::html
  var htmlBlocks = document.querySelectorAll('.chrx-html-block');
  htmlBlocks.forEach(function(block) { block.remove(); });

  // Reset body font to original default
  document.body.style.fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  // Clear all saved presets
  CHRX_PRESETS = {};
  localStorage.removeItem('chrx_presets');
}

console.log(':fire: chrx-markdown.js loaded — live code execution ready (v1.1 with :::file)');
