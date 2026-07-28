/* ═══════════════════════════════════════════
   chrx-markdown.js — Live Code Execution v1.2
   :::css :::html :::js :::theme :::preset :::reset
   :::image :::file :::tree :::review :::bash :::terminal
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
  var result;
  switch (block.type) {
    case 'theme':
      var themeMap = { gold: 'gold', midnight: 'midnight', glass: 'glass', chrome: 'chrome', white: 'white', light: 'white', chromatic: 'chromatic', liquid: 'liquid', rainbow: 'rainbow', hacker: 'hacker' };
      var t = themeMap[block.param] || block.param || 'gold';
      if (typeof setTheme === 'function') setTheme(t);
      result = { html: (typeof getEmojiHTML === 'function' ? getEmojiHTML(':geto:') : '') + ' Theme: <strong>' + t + '</strong>', type: 'system' };
      break;

    case 'css':
      injectCSS(block.content);
      result = { html: '✨ CSS injected (' + block.content.length + ' chars)', type: 'system' };
      break;

    case 'html':
      result = { html: '<div class="chrx-html-block" style="border-radius:12px;overflow:hidden;margin:8px 0">' + block.content + '</div>', type: 'html' };
      break;

    case 'js':
      var blocked = /\bfetch\b|\bXMLHttpRequest\b|\blocalStorage\b|\bdocument\.cookie\b|\bwindow\.location\b|\beval\b|\bFunction\b/i;
      if (blocked.test(block.content)) {
        result = { html: '🔒 Blocked for safety — no fetch, localStorage, or redirects allowed in :::js', type: 'error' };
      } else {
        try {
          var jsResult = new Function('"use strict";' + block.content)();
          result = { html: '✅ JS executed' + (jsResult !== undefined ? ': ' + String(jsResult).slice(0, 100) : ''), type: 'system' };
        } catch(e) {
          result = { html: '❌ JS Error: ' + e.message, type: 'error' };
        }
      }
      break;

    case 'preset':
      var parts = (block.param || '').split(' ');
      if (parts[0] === 'save' && parts[1]) {
        CHRX_PRESETS[parts[1]] = INJECTED_STYLES.join('\n');
        localStorage.setItem('chrx_presets', JSON.stringify(CHRX_PRESETS));
        result = { html: '💾 Preset <strong>' + parts[1] + '</strong> saved', type: 'system' };
      } else if (parts[0] === 'load' && parts[1] && CHRX_PRESETS[parts[1]]) {
        injectCSS(CHRX_PRESETS[parts[1]]);
        result = { html: '📂 Preset <strong>' + parts[1] + '</strong> loaded', type: 'system' };
      } else if (parts[0] === 'delete' && parts[1]) {
        delete CHRX_PRESETS[parts[1]];
        localStorage.setItem('chrx_presets', JSON.stringify(CHRX_PRESETS));
        result = { html: '🗑️ Preset <strong>' + parts[1] + '</strong> deleted', type: 'system' };
      } else if (parts[0] === 'list') {
        var names = Object.keys(CHRX_PRESETS);
        result = { html: '📋 Presets: ' + (names.length ? names.join(', ') : 'none'), type: 'system' };
      } else {
        result = { html: '❌ Usage: :::preset save|load|delete|list [name]', type: 'error' };
      }
      break;

    case 'reset':
      resetAllInjections();
      result = { html: '🔄 All customizations cleared ' + (typeof getEmojiHTML === 'function' ? getEmojiHTML(':geto:') : ''), type: 'system' };
      break;

    case 'image':
      var prompt = (block.param ? block.param + ' ' : '') + block.content;
      var imgUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt.trim());
      result = { html: '<img src="' + imgUrl + '" alt="' + prompt + '" style="width:100%;max-width:512px;border-radius:16px;margin:8px 0;" loading="lazy">', type: 'html' };
      break;

    case 'file':
      var filename = block.param || 'download.txt';
      var mime = 'text/plain';
      var ext = filename.split('.').pop().toLowerCase();
      var mimeMap = { 'obj':'text/plain', 'stl':'text/plain', 'js':'application/javascript', 'html':'text/html', 'css':'text/css', 'json':'application/json', 'py':'text/x-python', 'md':'text/markdown', 'txt':'text/plain', 'glb':'model/gltf-binary', 'gltf':'model/gltf+json' };
      if (mimeMap[ext]) mime = mimeMap[ext];
      var blob = new Blob([block.content], { type: mime });
      var url = URL.createObjectURL(blob);
      var sizeKB = (blob.size / 1024).toFixed(1);
      result = {
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
      break;

    case 'tree':
      var lines = block.content.split('\n').filter(function(l) { return l.trim(); });
      var root = { name: 'root', type: 'folder', children: [] };
      var stack = [{ node: root, indent: -1 }];
      lines.forEach(function(line) {
        var indent = line.search(/\S/);
        var name = line.trim();
        var type = name.indexOf('.') !== -1 ? 'file' : 'folder';
        var newNode = { name: name, type: type, children: type === 'folder' ? [] : undefined };
        while (stack.length > 1 && stack[stack.length-1].indent >= indent) stack.pop();
        stack[stack.length-1].node.children.push(newNode);
        stack.push({ node: newNode, indent: indent });
      });
      function renderTree(nodes) {
        var html = '<ul style="list-style:none;padding-left:16px;margin:4px 0;">';
        nodes.forEach(function(n) {
          html += '<li style="margin:2px 0;"><span style="color:' + (n.type==='folder'?'var(--a)':'var(--txt)') + '">' + (n.type==='folder'?'📁 ':'📄 ') + n.name + '</span>';
          if (n.children && n.children.length > 0) html += renderTree(n.children);
          html += '</li>';
        });
        html += '</ul>';
        return html;
      }
      result = { html: '<div style="background:var(--surf);border:1px solid var(--brd);border-radius:12px;padding:12px 16px;margin:8px 0;font-family:monospace;font-size:13px;">' + renderTree(root.children) + '</div>', type: 'html' };
      break;

    case 'review':
      var beforeMatch = block.content.match(/(?:^|\n)before:\n([\s\S]*?)(?:\nafter:|$)/i);
      var afterMatch = block.content.match(/\nafter:\n([\s\S]*?)$/i);
      var beforeCode = beforeMatch ? beforeMatch[1].trim() : '';
      var afterCode = afterMatch ? afterMatch[1].trim() : '';
      var reviewId = 'review-' + Math.random().toString(36).slice(2,8);
      result = {
        html: '<div id="' + reviewId + '" class="code-comparison" style="display:flex;gap:1rem;flex-wrap:wrap;margin:8px 0;"></div>',
        type: 'html',
        onRender: function() {
          var container = document.getElementById(reviewId);
          if (!container) return;
          function renderPanel(code, title, badge) {
            var panel = document.createElement('div');
            panel.className = 'code-panel';
            panel.innerHTML = '<div class="panel-header"><span>' + title + '</span><span class="panel-badge">' + badge + '</span></div><div class="code-content"><pre>' + code.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre></div>';
            container.appendChild(panel);
          }
          renderPanel(beforeCode, 'Before', 'Original');
          renderPanel(afterCode, 'After', 'Refactored');
        }
      };
      break;

    case 'bash':
      var command = block.param || block.content.trim();
      if (!command) return { html: '❌ No command specified', type: 'error' };
      var bashId = 'bash-' + Math.random().toString(36).slice(2,8);
      result = {
        html: '<div style="background:#0d0d0d;border:1px solid #00ff41;border-radius:12px;padding:12px 16px;margin:8px 0;font-family:monospace;font-size:13px;color:#00ff41;">' +
          '<div style="color:#6272a4;">$ ' + command.replace(/</g,'&lt;') + '</div>' +
          '<div id="' + bashId + '" style="margin-top:8px;color:#50fa7b;">Executing...</div>' +
        '</div>',
        type: 'html',
        onRender: function() {
          var container = document.getElementById(bashId);
          if (!container) return;
          fetch('https://chrxmaticc-copliot.vercel.app/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bash', command: command })
          }).then(function(r) { return r.json(); }).then(function(d) {
            var out = d.output || d.error || 'No output';
            container.innerHTML = '<div style="color:#50fa7b;white-space:pre-wrap;font-family:monospace;">' + out.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
          }).catch(function() {
            container.innerHTML = '<div style="color:#ff453a;">Failed to execute command.</div>';
          });
        }
      };
      break;

    case 'terminal':
      var termId = 'term-' + Math.random().toString(36).slice(2,8);
      result = {
        html: '<div id="' + termId + '" class="chrx-terminal" style="background:#0d0d0d;border:1px solid #00ff41;border-radius:12px;padding:12px;font-family:monospace;font-size:13px;color:#00ff41;margin:8px 0;">' +
          '<div class="terminal-output" style="max-height:300px;overflow-y:auto;white-space:pre-wrap;margin-bottom:8px;min-height:100px;">' +
          '<span style="color:#6272a4;">chrxmaticc@sol:~$ </span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;">' +
          '<span style="color:#00ff41;margin-right:4px;">$</span>' +
          '<input type="text" class="terminal-input" style="flex:1;background:transparent;border:none;outline:none;color:#00ff41;font-family:inherit;font-size:inherit;caret-color:#00ff41;" placeholder="type a command..." autofocus>' +
          '</div>' +
        '</div>',
        type: 'html',
        onRender: function() {
          var container = document.getElementById(termId);
          if (!container) return;
          var input = container.querySelector('.terminal-input');
          var output = container.querySelector('.terminal-output');
          if (!input || !output) return;
          input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              var cmd = input.value.trim();
              if (!cmd) return;
              output.innerHTML += '<div><span style="color:#6272a4;">$ ' + cmd + '</span></div>';
              input.value = '';
              output.scrollTop = output.scrollHeight;
              fetch('https://chrxmaticc-copliot.vercel.app/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bash', command: cmd })
              }).then(function(r) { return r.json(); }).then(function(d) {
                var out = d.output || d.error || 'no output';
                output.innerHTML += '<div style="color:#50fa7b;">' + out.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
                output.scrollTop = output.scrollHeight;
              }).catch(function(err) {
                output.innerHTML += '<div style="color:#ff453a;">error: ' + err.message + '</div>';
                output.scrollTop = output.scrollHeight;
              });
            }
          });
          input.focus();
        }
      };
      break;

    default:
      return null;
  }
  return result;
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
  var styleEl = document.getElementById(INJECTED_CSS_ID);
  if (styleEl) styleEl.remove();
  INJECTED_STYLES = [];
  localStorage.removeItem('chrx_injected_styles');

  var links = document.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(function(link) {
    if (link.href && (link.href.includes('fonts.googleapis.com') || link.href.includes('fonts.gstatic.com'))) {
      link.remove();
    }
  });

  var htmlBlocks = document.querySelectorAll('.chrx-html-block');
  htmlBlocks.forEach(function(block) { block.remove(); });

  document.body.style.fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  CHRX_PRESETS = {};
  localStorage.removeItem('chrx_presets');
}

console.log(':fire: chrx-markdown.js loaded — live code execution ready (v1.2 with terminal)');
