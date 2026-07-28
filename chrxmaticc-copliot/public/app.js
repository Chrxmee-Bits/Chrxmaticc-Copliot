// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Engine v8.0       ║
// ║  v7.0 base + Web Search + Image         ║
// ║  + Emoji, Memory, Markdown, Cursor,     ║
// ║    Impact, Unhinged, Toolbox, Blend,    ║
// ║    WebGL, Autopilot                     ║
// ╚══════════════════════════════════════════╝

var messagesEl, inputEl, sendBtn, typingEl, statusDot, statusText, micBtn;
var sidebar, overlay, savedChatsList, profileName, profileAvatar, confettiCanvas;
var conversation = [], savedChats = {}, currentChatId = null;
var isListening = false, ttsEnabled = true, lastAIResponse = '', recognition = null;
var messageCount = 0, confettiActive = false, pendingFile = null;

/* ═══ DOM ═══ */
function grabDOM() {
  messagesEl = document.getElementById('messages');
  inputEl = document.getElementById('userInput');
  sendBtn = document.getElementById('sendBtn');
  typingEl = document.getElementById('typing');
  statusDot = document.getElementById('statusDot');
  statusText = document.getElementById('statusText');
  micBtn = document.getElementById('micBtn');
  sidebar = document.getElementById('sidebar');
  overlay = document.getElementById('overlay');
  savedChatsList = document.getElementById('savedChatsList');
  profileName = document.getElementById('profileName');
  profileAvatar = document.getElementById('profileAvatar');
  confettiCanvas = document.getElementById('confettiCanvas');
}

/* ═══ SCROLL ═══ */
function scrollToBottom() {
  if (!messagesEl) return;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function checkScrollButton() {
  var btn = document.getElementById('scrollBtm');
  if (!messagesEl || !btn) return;
  var nearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 200;
  btn.classList.toggle('visible', !nearBottom);
}

/* ═══ INIT ═══ */
function init() {
  grabDOM();
  try { savedChats = JSON.parse(localStorage.getItem('chrxmaticc_chats') || '{}'); } catch(e) { savedChats = {}; }
  ttsEnabled = localStorage.getItem('chrxmaticc_tts') !== 'false';

  if (Object.keys(savedChats).length === 0) {
    var id = 'chat_' + Date.now();
    savedChats[id] = { name: 'New Chat', conversation: [], timestamp: Date.now() };
    currentChatId = id;
  } else {
    currentChatId = Object.keys(savedChats).sort(function(a,b){ return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0); })[0];
    conversation = savedChats[currentChatId]?.conversation || [];
  }
  localStorage.setItem('chrxmaticc_chats', JSON.stringify(savedChats));
  loadSavedChats();
  updateSidebarProfile();

  if (conversation.length > 0 && messagesEl) {
    messagesEl.innerHTML = '';
    conversation.forEach(function(m) { addBubbleNoSave(m.content, m.role === 'user' ? 'user' : 'ai'); });
    messagesEl.appendChild(typingEl);
  }

  setupSpeech();

  // Scroll listener
  if (messagesEl) {
    messagesEl.addEventListener('scroll', checkScrollButton);
    var obs = new MutationObserver(function() {
      scrollToBottom();
      checkScrollButton();
    });
    obs.observe(messagesEl, { childList: true, subtree: true, characterData: true });
  }

  // GitHub callback
  var params = new URLSearchParams(window.location.search);
  var userParam = params.get('user');
  if (userParam) {
    try {
      var userData = JSON.parse(decodeURIComponent(userParam));
      localStorage.setItem('chrxmaticc_user', JSON.stringify(userData));
      if (userData.provider === 'github' && userData.githubToken) {
        localStorage.setItem('chrxmaticc_github_token', userData.githubToken);
        if (typeof updateGitHubUI === 'function') updateGitHubUI();
        toast('GitHub connected!');
      }
      window.history.replaceState({}, document.title, '/app.html');
    } catch(e) {}
  }

  // ── NEW: initialise extra systems (if their scripts are loaded) ──
  if (typeof initUnhinged === 'function') initUnhinged();
  if (typeof initCursor === 'function') initCursor();
  if (typeof initProcrastinationDetector === 'function') initProcrastinationDetector();
}

/* ═══ SIDEBAR ═══ */
function toggleSidebar() {
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('on');
}
window.toggleSidebar = toggleSidebar;

function loadSavedChats() {
  if (!savedChatsList) return;
  savedChatsList.innerHTML = '';
  var ids = Object.keys(savedChats).sort(function(a,b){ return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0); });
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i], c = savedChats[id];
    var d = document.createElement('div');
    d.className = 'chat-item' + (id === currentChatId ? ' active' : '');
    d.innerHTML = '<img src="icon.png" alt="Chat"><div class="chat-item-name" onclick="loadChat(\''+id+'\')">'+(c.name||'Chat')+'</div>';
    savedChatsList.appendChild(d);
  }
}

function newChat() { saveCurrentChat(); if (typeof goToLanding === 'function') goToLanding(); }

function loadChat(id) {
  if (id === currentChatId) { toggleSidebar(); return; }
  saveCurrentChat();
  currentChatId = id;
  conversation = savedChats[id]?.conversation || [];
  if (messagesEl) {
    messagesEl.innerHTML = '';
    conversation.forEach(function(m) { addBubbleNoSave(m.content, m.role === 'user' ? 'user' : 'ai'); });
    messagesEl.appendChild(typingEl);
  }
  loadSavedChats();
  toggleSidebar();
}

function saveCurrentChat() {
  if (!currentChatId || !conversation.length) return;
  if (!savedChats[currentChatId]) savedChats[currentChatId] = { name: 'Chat', conversation: [], timestamp: Date.now() };
  savedChats[currentChatId].conversation = conversation.slice(-50);
  savedChats[currentChatId].timestamp = Date.now();
  var preview = conversation[0]?.content?.slice(0, 30) || 'Chat';
  if (!savedChats[currentChatId].name || savedChats[currentChatId].name === 'New Chat' || savedChats[currentChatId].name === 'Chat') {
    savedChats[currentChatId].name = preview;
  }
  localStorage.setItem('chrxmaticc_chats', JSON.stringify(savedChats));
  loadSavedChats();
}

function updateSidebarProfile() {
  var u = null;
  try { u = JSON.parse(localStorage.getItem('chrxmaticc_user')); } catch(e) {}
  var prof = {};
  try { prof = JSON.parse(localStorage.getItem('chrxmaticc_profile') || '{}'); } catch(e) {}
  var name = (u && u.displayName) || prof.displayName || 'Guest';
  if (profileName) profileName.textContent = name;
  if (profileAvatar && u && u.avatar) profileAvatar.src = u.avatar;
}

/* ═══ PRESENCE ═══ */
function setPresence(s) {
  if (!statusDot || !statusText) return;
  statusDot.className = 'sdot ' + s;
  var labels = { online: 'Online', thinking: 'Thinking…', offline: 'Offline', lurking: 'Lurking…', locked: 'Locked In', judging: 'Judging…' };
  statusText.textContent = labels[s] || 'Online';
}

/* ═══ FILE ═══ */
function readFileContent(file) {
  return new Promise(function(resolve) {
    if (!file) { resolve(null); return; }
    if (file.type.startsWith('image/')) { resolve(null); return; }
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { resolve(null); };
    if (file.type.startsWith('text/') || file.name.match(/\.(js|json|html|css|md|txt|py|glsl|yml|yaml|xml|svg)$/)) {
      reader.readAsText(file);
    } else { resolve('[Binary file: ' + file.name + ']'); }
  });
}

function handleFileUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  pendingFile = file;
  var bar = document.getElementById('fileBar');
  var info = document.getElementById('fileInfo');
  var img = document.getElementById('filePreviewImg');
  if (bar) bar.classList.add('on');
  if (info) info.textContent = file.name;
  if (img && file.type.startsWith('image/')) {
    img.src = URL.createObjectURL(file);
    img.style.display = 'block';
  }
}

function clearFile() {
  pendingFile = null;
  var bar = document.getElementById('fileBar');
  if (bar) bar.classList.remove('on');
}

/* ═══ MESSAGING ═══ */
async function sendMessage() {
  if (!inputEl) return;
  var text = inputEl.value.trim();
  if (!text && !pendingFile) return;

  var displayText = text || (pendingFile ? pendingFile.name : '');

  // ── NEW: apply custom emoji to displayed message (if emoji module is loaded) ──
  var parsedDisplay = (typeof parseCustomEmojis === 'function') ? parseCustomEmojis(displayText) : displayText;

  // ── NEW: Process markdown blocks in user's own message ──
  var userCleanText = displayText;
  if (typeof parseChrxMarkdown === 'function') {
    var userParsed = parseChrxMarkdown(displayText);
    userCleanText = userParsed.cleanText || displayText;
    // Render any blocks the user included
    userParsed.blocks.forEach(function(block) {
      if (typeof executeChrxBlock === 'function') {
        var blockResult = executeChrxBlock(block);
        if (blockResult && blockResult.html) {
          addBubble(blockResult.html, 'ai');  // show as separate system bubble
          if (blockResult.onRender) {
            setTimeout(function() { blockResult.onRender(); }, 10);
          }
        }
      }
    });
  }

  // Apply emoji to cleaned text for the bubble
  var finalUserDisplay = (typeof parseCustomEmojis === 'function') ? parseCustomEmojis(userCleanText) : userCleanText;
  addBubble(finalUserDisplay, 'user');
  conversation.push({ role: 'user', content: displayText });  // store original text

  inputEl.value = '';
  inputEl.style.height = 'auto';
  if (sendBtn) sendBtn.disabled = true;
  if (typingEl) typingEl.classList.add('on');
  setPresence('thinking');
  scrollToBottom();
  messageCount++;

  // Get settings from inline script
  var settings = {};
  if (typeof getSettings === 'function') settings = getSettings();
  var workflow = settings.workflow || 'code';
  var model = settings.model || 'sonnet';
  var effort = settings.effort || 'medium';
  var buttons = settings.buttons || [];
  var roastLevel = settings.roastLevel || 0;

  // Thinking block
  var thinkBlock = null;
  if (typeof addThinkingBlock === 'function') {
    thinkBlock = addThinkingBlock('Thinking…', '');
    var tt = thinkBlock.querySelector('.think-text');
    if (tt) tt.textContent = 'analyzing: "' + displayText.slice(0, 80) + '"…';
  }

  try {
    var body = {
      message: text,
      model: model,
      workflow: workflow,
      effort: effort,
      buttons: buttons,
      roastLevel: roastLevel,
      webSearch: true   // ← always on
    };

    // File upload
    if (pendingFile) {
      body.fileName = pendingFile.name;
      body.fileType = pendingFile.type;
      if (pendingFile.type.startsWith('image/')) {
        body.imageUrl = URL.createObjectURL(pendingFile);
      } else {
        body.fileContent = await readFileContent(pendingFile);
      }
    }

    // Personal info
    try {
      var prof = JSON.parse(localStorage.getItem('chrxmaticc_profile') || '{}');
      var parts = [];
      if (prof.displayName) parts.push('Call me ' + prof.displayName);
      if (prof.personalInfo) parts.push('About me: ' + prof.personalInfo);
      if (parts.length) body.personalInfo = parts.join('. ');
    } catch(e) {}

    // GitHub context
    var token = localStorage.getItem('chrxmaticc_github_token');
    var repo = localStorage.getItem('chrxmaticc_github_repo');
    if (token && repo) {
      body.personalInfo = (body.personalInfo || '') + '\nConnected GitHub repository: ' + repo;
    }

    // ── NEW: inject memory context into the API call (if memory module is loaded) ──
    if (typeof getMemoryContext === 'function') {
      var memoryCtx = getMemoryContext();
      if (memoryCtx) body.memory = memoryCtx;
    }

    var endpoint = (workflow === 'cancel') ? '/api/chat' : '/api/agent';
    var res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await res.json();

    if (thinkBlock && typeof finishThinkingBlock === 'function') {
      finishThinkingBlock(thinkBlock, 'Thinking — done');
    }
    if (typingEl) typingEl.classList.remove('on');

    if (data.type === 'qa' && typeof createPlanBlock === 'function') {
      var planBlock = createPlanBlock(data.question, data.options, data.qNum, data.qTotal);
      if (messagesEl) messagesEl.appendChild(planBlock);
      setPresence('online');
    } else if (data.thinking) {
      if (thinkBlock) {
        var ttx = thinkBlock.querySelector('.think-text');
        if (ttx) ttx.textContent = data.thinking;
      }
      if (data.todo && data.todo.length && typeof addTodoBlock === 'function') {
        addTodoBlock(data.todo);
      }
      if (data.response) {
        var finalResponse = data.response;

        // ── NEW: process markdown blocks (if markdown module is loaded) ──
        if (typeof parseChrxMarkdown === 'function') {
          var parsed = parseChrxMarkdown(finalResponse);
          finalResponse = parsed.cleanText || finalResponse;
          parsed.blocks.forEach(function(block) {
            if (typeof executeChrxBlock === 'function') {
              var blockResult = executeChrxBlock(block);
              if (blockResult && blockResult.html) {
                addBubble(blockResult.html, 'ai');
                if (blockResult.onRender) {
                  setTimeout(function() { blockResult.onRender(); }, 10);
                }
              }
            }
          });
        }

        // ── NEW: apply custom emojis to AI response (if emoji module is loaded) ──
        if (typeof parseCustomEmojis === 'function') {
          finalResponse = parseCustomEmojis(finalResponse);
        }

        // ── NEW: screen shake / mood ring (if impact module is loaded) ──
        if (typeof onMessageImpact === 'function') {
          onMessageImpact(displayText, finalResponse);
        }

        setPresence('online');
        lastAIResponse = finalResponse;
        typeBubble(finalResponse, 'ai', data.provider, data.codePreview);
        conversation.push({ role: 'assistant', content: finalResponse });
        if (ttsEnabled) speakText(finalResponse);
        saveCurrentChat();

        // ── NEW: update memory with this exchange (if memory module is loaded) ──
        if (typeof updateMemory === 'function') {
          updateMemory(displayText, finalResponse, workflow, model);
        }
      }
    } else if (data.response) {
      var finalResponse2 = data.response;

      // ── NEW: same processing for plain response ──
      if (typeof parseChrxMarkdown === 'function') {
        var parsed2 = parseChrxMarkdown(finalResponse2);
        finalResponse2 = parsed2.cleanText || finalResponse2;
        parsed2.blocks.forEach(function(block) {
          if (typeof executeChrxBlock === 'function') {
            var blockResult = executeChrxBlock(block);
            if (blockResult && blockResult.html) {
              addBubble(blockResult.html, 'ai');
              if (blockResult.onRender) {
                setTimeout(function() { blockResult.onRender(); }, 10);
              }
            }
          }
        });
      }

      if (typeof parseCustomEmojis === 'function') {
        finalResponse2 = parseCustomEmojis(finalResponse2);
      }

      if (typeof onMessageImpact === 'function') {
        onMessageImpact(displayText, finalResponse2);
      }

      setPresence('online');
      lastAIResponse = finalResponse2;
      typeBubble(finalResponse2, 'ai', data.provider, data.codePreview);
      conversation.push({ role: 'assistant', content: finalResponse2 });
      if (ttsEnabled) speakText(finalResponse2);
      saveCurrentChat();

      if (typeof updateMemory === 'function') {
        updateMemory(displayText, finalResponse2, workflow, model);
      }
    } else {
      setPresence('online');
      addError(data.error || 'Something went wrong.');
    }
  } catch(e) {
    if (typingEl) typingEl.classList.remove('on');
    if (thinkBlock && typeof finishThinkingBlock === 'function') {
      finishThinkingBlock(thinkBlock, 'Thinking — error');
    }
    setPresence('offline');
    addError('Connection lost. Try again.');
  }

  if (sendBtn) sendBtn.disabled = false;
  if (inputEl) inputEl.focus();
  pendingFile = null;
  if (typeof resetChipsAfterSend === 'function') resetChipsAfterSend();
}

/* ═══ BUBBLES ═══ */
function addBubble(text, who) {
  if (!messagesEl) return;
  if (typingEl?.parentNode) typingEl.remove();

  // ── NEW: apply custom emojis if not already done (safety) ──
  if (typeof parseCustomEmojis === 'function') {
    text = parseCustomEmojis(text);
  }

  var row = document.createElement('div');
  row.className = 'bubble-row ' + who;
  var b = document.createElement('div');
  b.className = 'bubble';
  b.innerHTML = formatCodeBlocks(text);

  if (who === 'user') {
    b.ondblclick = function() {
      var current = b.innerText;
      inputEl.value = current;
      inputEl.focus();
      row.remove();
    };
  }

  row.appendChild(b);

  if (who === 'ai') {
    var qr = document.createElement('div');
    qr.className = 'quick-replies';
    qr.innerHTML = '<button class="qr-btn" onclick="quickReply(\'Can you explain this in more detail?\')">Explain more</button>'
      + '<button class="qr-btn" onclick="quickReply(\'Show me an example\')">Show example</button>'
      + '<button class="qr-btn" onclick="quickReply(\'Make this simpler\')">Simplify</button>';
    row.appendChild(qr);
  }

  var actions = document.createElement('div');
  actions.className = 'msg-actions';
  if (who === 'ai') {
    actions.innerHTML = '<button class="msg-act-btn" onclick="copyBubbleText(this)">Copy</button>'
      + '<button class="msg-act-btn" onclick="retryMessage()">Retry</button>';
  } else {
    actions.innerHTML = '<button class="msg-act-btn" onclick="editBubble(this)">Edit</button>'
      + '<button class="msg-act-btn" onclick="this.closest(\'.bubble-row\').remove()">Delete</button>';
  }
  row.appendChild(actions);

  var ts = document.createElement('div');
  ts.className = 'ts';
  ts.textContent = getTime();
  row.appendChild(ts);

  messagesEl.appendChild(row);
  if (typingEl) messagesEl.appendChild(typingEl);
  scrollToBottom();
}

function addBubbleNoSave(text, who) {
  if (!messagesEl) return;
  // ── NEW: apply custom emojis ──
  if (typeof parseCustomEmojis === 'function') {
    text = parseCustomEmojis(text);
  }
  var row = document.createElement('div');
  row.className = 'bubble-row ' + who;
  var b = document.createElement('div');
  b.className = 'bubble';
  b.innerHTML = formatCodeBlocks(text);
  row.appendChild(b);
  messagesEl.appendChild(row);
}

function addError(msg) {
  if (!messagesEl) return;
  if (typingEl?.parentNode) typingEl.remove();
  var el = document.createElement('div');
  el.style.cssText = 'align-self:center;background:rgba(255,69,58,0.1);color:#ff453a;border-radius:12px;padding:8px 14px;font-size:12px;';
  el.textContent = msg;
  messagesEl.appendChild(el);
  if (typingEl) messagesEl.appendChild(typingEl);
  scrollToBottom();
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ═══ QUICK ACTIONS ═══ */
function quickReply(text) {
  if (inputEl) { inputEl.value = text; sendMessage(); }
}

function copyBubbleText(btn) {
  var text = btn.closest('.bubble-row').querySelector('.bubble').innerText;
  navigator.clipboard.writeText(text);
  btn.textContent = 'Copied!';
  setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
}

function retryMessage() {
  if (conversation.length < 2) return;
  var lastUser = conversation[conversation.length - 2];
  if (lastUser && lastUser.role === 'user') {
    conversation.pop();
    if (inputEl) { inputEl.value = lastUser.content; sendMessage(); }
  }
}

function editBubble(btn) {
  var bubble = btn.closest('.bubble-row').querySelector('.bubble');
  var text = bubble.innerText;
  inputEl.value = text;
  inputEl.focus();
  btn.closest('.bubble-row').remove();
}

/* ═══ TYPING ═══ */
function typeBubble(text, who, provider, isCode) {
  if (!messagesEl) return;
  if (typingEl?.parentNode) typingEl.remove();

  // ── NEW: apply custom emojis ──
  if (typeof parseCustomEmojis === 'function') {
    text = parseCustomEmojis(text);
  }

  var row = document.createElement('div');
  row.className = 'bubble-row ' + who;
  var b = document.createElement('div');
  b.className = 'bubble';
  row.appendChild(b);

  if (provider && who === 'ai') {
    var badge = document.createElement('div');
    badge.className = 'pbadge';
    badge.textContent = provider;
    row.appendChild(badge);
  }
  messagesEl.appendChild(row);
  if (typingEl) messagesEl.appendChild(typingEl);

  var formatted = formatCodeBlocks(text);
  var speed = parseInt(localStorage.getItem('chrxmaticc_typing_speed') || '10');
  if (speed === 0) {
    b.innerHTML = formatted;
    if (isCode) addCodeActions(row, text);
    scrollToBottom();
    return;
  }

  var temp = document.createElement('div');
  temp.innerHTML = formatted;
  var plain = temp.textContent;
  var i = 0;
  b.innerHTML = '';
  function typeChar() {
    if (i < plain.length) {
      b.textContent = plain.slice(0, i + 1);
      b.innerHTML += '<span class="typing-cur">|</span>';
      i++;
      scrollToBottom();
      var delay = (8 + Math.random() * 12) / (speed / 10);
      setTimeout(typeChar, delay);
    } else {
      b.innerHTML = formatted;
      if (isCode) addCodeActions(row, text);
      var qr = document.createElement('div');
      qr.className = 'quick-replies';
      qr.innerHTML = '<button class="qr-btn" onclick="quickReply(\'Can you explain this in more detail?\')">Explain more</button>'
        + '<button class="qr-btn" onclick="quickReply(\'Show me an example\')">Show example</button>'
        + '<button class="qr-btn" onclick="quickReply(\'Make this simpler\')">Simplify</button>';
      row.appendChild(qr);
      var actions = document.createElement('div');
      actions.className = 'msg-actions';
      actions.innerHTML = '<button class="msg-act-btn" onclick="copyBubbleText(this)">Copy</button>'
        + '<button class="msg-act-btn" onclick="retryMessage()">Retry</button>';
      row.appendChild(actions);
      var ts = document.createElement('div');
      ts.className = 'ts';
      ts.textContent = getTime();
      row.appendChild(ts);
    }
  }
  typeChar();
}

function addCodeActions(row, text) {
  var hasHTML = text.indexOf('<!DOCTYPE') !== -1 || text.indexOf('<html') !== -1;
  var actions = document.createElement('div');
  actions.className = 'code-actions';
  actions.innerHTML = '<button class="caction accept" onclick="acceptCode(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Accept</button>'
    + '<button class="caction reject" onclick="rejectCode(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Reject</button>'
    + (hasHTML ? '<button class="caction preview" onclick="previewCode(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>Preview</button>' : '');
  row.appendChild(actions);
}

function acceptCode(btn) {
  var code = btn.closest('.bubble-row').querySelector('code')?.textContent || '';
  navigator.clipboard.writeText(code);
  btn.textContent = 'Accepted ✓';
  btn.style.borderColor = '#30d158';
}

function rejectCode(btn) {
  btn.textContent = 'Rejected';
  btn.style.borderColor = '#ff453a';
  if (inputEl) { inputEl.value = 'improve the last code'; sendMessage(); }
}

function previewCode(btn) {
  var code = btn.closest('.bubble-row').querySelector('code')?.textContent || '';
  var panel = document.getElementById('previewPanel');
  var iframe = document.getElementById('previewIframe');
  if (!panel || !iframe) return;
  iframe.srcdoc = code;
  panel.classList.add('on');
}

/* ═══ CODE FORMATTING ═══ */
function formatCodeBlocks(text) {
  return text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m, lang, code) {
    return '<div class="code-block"><div class="code-hdr"><span>'+(lang||'code')+'</span><button class="code-copy" onclick="copyCode(this)">Copy</button></div><pre><code>'+escapeHtml(code.trim())+'</code></pre></div>';
  }).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyCode(btn) {
  var code = btn.closest('.code-block').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(function() {
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy'; }, 2000);
  });
}

/* ═══ TTS ═══ */
function toggleTTS() {
  ttsEnabled = !ttsEnabled;
  localStorage.setItem('chrxmaticc_tts', ttsEnabled);
  if (ttsEnabled && lastAIResponse) speakText(lastAIResponse);
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, '').slice(0, 300));
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
  window.speechSynthesis.speak(u);
}

/* ═══ SPEECH ═══ */
function setupSpeech() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onresult = function(e) {
    if (inputEl) { inputEl.value = e.results[0][0].transcript; sendMessage(); }
  };
  recognition.onerror = function() {};
  recognition.onend = function() {};
}

function toggleMic() {
  if (!recognition) return;
  if (isListening) { recognition.stop(); isListening = false; }
  else { try { recognition.start(); isListening = true; } catch(e) {} }
}

/* ═══ CONFETTI ═══ */
function launchConfetti() {
  if (confettiActive || !confettiCanvas) return;
  confettiActive = true;
  var ctx = confettiCanvas.getContext('2d');
  if (!ctx) { confettiActive = false; return; }
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = 'block';
  var particles = [];
  for (var i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width, y: -20,
      vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4 + 2,
      size: Math.random() * 5 + 2,
      color: 'hsl(' + Math.random() * 360 + ',70%,60%)',
      rot: Math.random() * 360
    });
  }
  function anim() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    var alive = false;
    particles.forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.rot += 2;
      if (p.y < confettiCanvas.height + 20) {
        alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      }
    });
    if (alive) requestAnimationFrame(anim);
    else { confettiCanvas.style.display = 'none'; confettiActive = false; }
  }
  anim();
}

/* ═══ HELPERS ═══ */
function toast(msg) {
  var t = document.createElement('div');
  t.className = 'app-toast';
  t.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 0l2.5 7.5L22 3l-4 7.5L24 12l-8 1.5L18 21l-3-6.5L10 22l1-8.5L2 15l5-5.5L0 6l8-3L12 0z" fill="var(--a)"/></svg>' + msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.remove(); }, 3000);
}

function togglePreview() {
  var p = document.getElementById('previewPanel');
  if (p) p.classList.toggle('on');
}

function toggleChatSearch() { toast('wait properly for search, jk'); }

function changeTypingSpeed(v) { localStorage.setItem('chrxmaticc_typing_speed', v); }

function commitToRepo() {
  var repo = localStorage.getItem('chrxmaticc_github_repo');
  if (!repo) { toast('Select a repo in settings first'); return; }
  toast('Committing to ' + repo + '…');
}

/* ═══ BLEND FUNCTIONS ═══ */
function getBlendBaseUrl() { return 'https://chrxmaticc-copliot.vercel.app/api/blend'; }

async function createBlendRoom() {
  var name = prompt('Room name:', 'My Blend Room');
  if (!name) return;
  try {
    var res = await fetch(getBlendBaseUrl() + '?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name })
    });
    var data = await res.json();
    if (data.room_id) {
      toast('Room created! Invite: ' + data.invite_code);
      loadBlendRooms();
      joinBlendRoom(data.room_id, data.invite_code);
    } else {
      toast('Failed to create room.');
    }
  } catch(e) { toast('Error creating room.'); }
}

function loadBlendRooms() {
  var list = document.getElementById('blendRoomList');
  if (!list) return;
  list.innerHTML = '';
  if (window._blendRooms && window._blendRooms.length === 0) {
    list.innerHTML = '<div style="font-size:11px;color:var(--mut);padding:8px">No rooms yet.</div>';
    return;
  }
  window._blendRooms = window._blendRooms || [];
  window._blendRooms.forEach(function(room) {
    var item = document.createElement('div');
    item.className = 'blend-room-item' + (room.id === window._blendActiveRoomId ? ' active' : '');
    item.innerHTML = '<span class="blend-room-item-dot" style="background:' + (room.color || 'var(--a)') + ';box-shadow:0 0 8px ' + (room.color || 'var(--a)') + '"></span>' + (room.name || 'Room');
    item.onclick = function() { joinBlendRoom(room.id, room.invite_code); };
    list.appendChild(item);
  });
}

function joinBlendRoom(roomId, inviteCode) {
  window._blendActiveRoomId = roomId;
  var panel = document.getElementById('blendPanel');
  if (panel) panel.classList.add('open');
  document.getElementById('blendRoomName').textContent = 'Room';
  document.getElementById('blendRoomVibe').textContent = '🔥 active';
  document.getElementById('blendMessages').innerHTML = '';
  loadBlendMessages();
  if (window._blendPollInterval) clearInterval(window._blendPollInterval);
  window._blendPollInterval = setInterval(loadBlendMessages, 2000);
  if (!window._blendRooms.find(function(r) { return r.id === roomId; })) {
    window._blendRooms.push({ id: roomId, name: 'Room', invite_code: inviteCode, color: 'var(--a)' });
    loadBlendRooms();
  }
  loadBlendRooms();
}

async function loadBlendMessages() {
  if (!window._blendActiveRoomId) return;
  try {
    var res = await fetch(getBlendBaseUrl() + '?action=messages&room_id=' + window._blendActiveRoomId);
    var data = await res.json();
    var container = document.getElementById('blendMessages');
    if (!container) return;
    container.innerHTML = '';
    (data.messages || []).forEach(function(msg) {
      var row = document.createElement('div');
      row.className = 'blend-msg' + (msg.role === 'assistant' ? ' ai' : '');
      row.innerHTML = '<div class="blend-msg-user">' + (msg.username || 'User') + '</div><div class="blend-msg-content">' + msg.content + '</div>';
      container.appendChild(row);
    });
    container.scrollTop = container.scrollHeight;
  } catch(e) {}
}

async function sendBlendMessage() {
  var input = document.getElementById('blendInput');
  if (!input || !window._blendActiveRoomId) return;
  var content = input.value.trim();
  if (!content) return;
  input.value = '';
  try {
    await fetch(getBlendBaseUrl() + '?action=messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: window._blendActiveRoomId,
        user_id: window._blendCurrentUserId || 'anon',
        username: window._blendCurrentUsername || 'Guest',
        content: content
      })
    });
    loadBlendMessages();
    if (content.includes('@Chrxmaticc')) {
      triggerBlendAI();
    }
  } catch(e) {}
}

async function triggerBlendAI() {
  try {
    var recent = [];
    var container = document.getElementById('blendMessages');
    if (container) {
      var msgs = container.querySelectorAll('.blend-msg');
      msgs.forEach(function(m) {
        var user = m.querySelector('.blend-msg-user')?.textContent || 'User';
        var text = m.querySelector('.blend-msg-content')?.textContent || '';
        recent.push({ username: user, content: text });
      });
    }
    await fetch(getBlendBaseUrl() + '?action=ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: window._blendActiveRoomId, recent_messages: recent })
    });
    loadBlendMessages();
  } catch(e) {}
}

function toggleBlendPanel() {
  var panel = document.getElementById('blendPanel');
  if (panel) panel.classList.toggle('open');
}

function copyBlendInvite() {
  if (!window._blendActiveRoomId) return toast('No active room');
  var room = window._blendRooms.find(function(r) { return r.id === window._blendActiveRoomId; });
  if (!room) return toast('Room not found');
  var link = 'https://chrxmaticc-copliot.vercel.app/blend?join=' + room.invite_code;
  navigator.clipboard.writeText(link).then(function() { toast('Invite link copied!'); });
}

/* ═══ WEBGL VIEWER ═══ */
function openWebGLViewer() {
  var panel = document.getElementById('webglPanel');
  if (!panel) return;
  panel.classList.add('open');
  initWebGLScene();
}

function closeWebGLViewer() {
  var panel = document.getElementById('webglPanel');
  if (panel) panel.classList.remove('open');
}

var webglScene, webglCamera, webglRenderer, webglMesh;
function initWebGLScene() {
  if (typeof THREE === 'undefined') return;
  var wrap = document.getElementById('webglCanvasWrap');
  if (!wrap || webglRenderer) return;
  webglScene = new THREE.Scene();
  webglCamera = new THREE.PerspectiveCamera(45, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
  webglCamera.position.set(2, 1.5, 3);
  webglCamera.lookAt(0, 0, 0);
  webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  webglRenderer.setSize(wrap.clientWidth, wrap.clientHeight);
  webglRenderer.setClearColor(0x0b0b0a, 0);
  wrap.appendChild(webglRenderer.domElement);

  var light = new THREE.AmbientLight(0x404060);
  webglScene.add(light);
  var dirLight = new THREE.DirectionalLight(0xd4a574, 1);
  dirLight.position.set(5, 5, 5);
  webglScene.add(dirLight);

  var geo = new THREE.IcosahedronGeometry(1.1, 2);
  var edges = new THREE.EdgesGeometry(geo);
  var mat = new THREE.LineBasicMaterial({ color: 0xd4a574 });
  webglMesh = new THREE.LineSegments(edges, mat);
  webglScene.add(webglMesh);

  var orbitDots = [];
  var dotGeo = new THREE.SphereGeometry(0.04, 8, 8);
  var dotMat = new THREE.MeshBasicMaterial({ color: 0xd4a574 });
  for (var i = 0; i < 8; i++) {
    var dot = new THREE.Mesh(dotGeo, dotMat);
    dot.userData = { angle: (Math.PI * 2 * i) / 8, radius: 1.6, speed: 0.003 + Math.random() * 0.005, yOffset: (Math.random() - 0.5) * 1.5 };
    webglScene.add(dot);
    orbitDots.push(dot);
  }

  function animateWebGL() {
    if (!webglRenderer) return;
    requestAnimationFrame(animateWebGL);
    webglMesh.rotation.y += 0.005;
    webglMesh.rotation.x += 0.002;
    orbitDots.forEach(function(dot) {
      dot.userData.angle += dot.userData.speed;
      dot.position.x = Math.cos(dot.userData.angle) * dot.userData.radius;
      dot.position.z = Math.sin(dot.userData.angle) * dot.userData.radius;
      dot.position.y = dot.userData.yOffset + Math.sin(dot.userData.angle * 2) * 0.3;
    });
    webglRenderer.render(webglScene, webglCamera);
  }
  animateWebGL();
  window.addEventListener('resize', function() {
    if (!webglRenderer || !webglCamera) return;
    var wrap = document.getElementById('webglCanvasWrap');
    webglCamera.aspect = wrap.clientWidth / wrap.clientHeight;
    webglCamera.updateProjectionMatrix();
    webglRenderer.setSize(wrap.clientWidth, wrap.clientHeight);
  });
}

/* ═══ AUTOPILOT QUEUE (send current message to background) ═══ */
async function sendToAutopilot() {
  var text = inputEl ? inputEl.value.trim() : '';
  if (!text) return toast('Type a task first.');
  var token = localStorage.getItem('chrxmaticc_github_token');
  var repo = localStorage.getItem('chrxmaticc_github_repo');
  try {
    var res = await fetch('https://chrxmaticc-copliot.vercel.app/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'autopilot',
        subAction: 'enqueue',
        prompt: text,
        githubToken: token || '',
        repo: repo || '',
        userId: window._blendCurrentUserId || 'anon'
      })
    });
    var data = await res.json();
    if (data.taskId) {
      toast('Task queued for autopilot. Sol will work on it.');
      inputEl.value = '';
    } else {
      toast('Failed to queue task.');
    }
  } catch(e) { toast('Autopilot error.'); }
}

/* ═══ STARTUP ═══ */
init();
