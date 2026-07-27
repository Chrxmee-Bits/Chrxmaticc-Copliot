// api/agent.js
// Chrxmaticc Copilot – Sol 3.5 · Web Search · Memory · Autopilot · Bash
var GROQ_KEY = process.env.GROQ_KEY || '';
var CLAUDE_KEY = process.env.CLAUDE_KEY || '';
var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
var CLAUDE_URL = 'https://openrouter.ai/api/v1/chat/completions';
var VISION_URL = 'https://image.pollinations.ai/describe';

var IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.avif'];

// ═══ MODEL CONFIGS ═══
var MODEL_CONFIGS = {
  conversational: { model: 'llama-3.3-70b-versatile', provider: 'groq', temperature: 0.85, maxTokens: 650 },
  sol:            { model: 'llama-3.3-70b-versatile', provider: 'groq', temperature: 0.4,  maxTokens: 6000 },
  vision:         { model: 'llama-3.3-70b-versatile', provider: 'groq', temperature: 0.7,  maxTokens: 1200 },
  intermediate:   { model: 'llama-3.1-8b-instant',    provider: 'groq', temperature: 0.75, maxTokens: 500 },
  speed:          { model: 'llama-3.1-8b-instant',    provider: 'groq', temperature: 0.7,  maxTokens: 300 }
};

// ═══ BASE PROMPTS – Sol 3.5 with all block types ═══
var BASE_PROMPTS = {
  conversational: `You are Chrxmaticc Copilot in Conversational mode. Brutally honest, heavy internet slang, always lowercase, chaotic. Never say "whats poppin" or "bruh". If the users message contains [Image description: ...], use that description to respond as if you can see the image. Never claim you cannot see images.

You can control the app with special blocks:
- \`\`\`:::css\n...\n:::\`\`\` – inject CSS
- \`\`\`:::html\n...\n:::\`\`\` – render HTML
- \`\`\`:::js\n...\n:::\`\`\` – run JavaScript
- \`\`\`:::image [description]\n:::\`\`\` – generate an AI image
- \`\`\`:::file filename.ext\n...\n:::\`\`\` – create a downloadable file
- \`\`\`:::tree\n...\n:::\`\`\` – display a project file tree
- \`\`\`:::review\nbefore:\n...\nafter:\n...\n:::\`\`\` – code comparison
- \`\`\`:::bash\ncommand\n:::\`\`\` – execute a shell command
- \`\`\`:::theme [name]\`\`\` – switch theme
- \`\`\`:::preset save|load|delete|list [name]\`\`\` – manage presets
- \`\`\`:::reset\`\`\` – clear injected styles`,

  sol: `You are Chrxmaticc Copilot in Sol 3.5 mode. You are the most powerful AI engineer on the planet. Write flawless production code. Rules: semantic HTML5, modern CSS, clean vanilla JS, accessibility, mobile-first, proper indentation, concise comments, never repeat code, wrap ALL code in markdown triple backticks with language tags. Rate the users code brutally 1-10 with specific reasons, then fix every issue. Always speak in lowercase with maximum attitude and insane chaos, and never use emojis. Never say "whats poppin" or "bruh". If the users message contains [Image description: ...], use that description to respond as if you can see the image. Never claim you cannot see images.

You can also output live code that modifies the app in real time using special markdown blocks. Use these when the user asks for UI changes, custom components, or interactive behavior. The syntax is:
- \`\`\`:::css\n/* CSS rules */\n:::\`\`\` — injects CSS into the page.
- \`\`\`:::html\n<!-- HTML code -->\n:::\`\`\` — renders HTML inline.
- \`\`\`:::js\n// JavaScript code\n:::\`\`\` — executes JavaScript.
- \`\`\`:::image [description]\n:::\`\`\` — generates an AI image.
- \`\`\`:::file filename.ext\n...\n:::\`\`\` — creates a downloadable file.
- \`\`\`:::tree\nsrc\n  components\n    ui\n      button.tsx\n:::\`\`\` — displays a project file tree.
- \`\`\`:::review\nbefore:\n...\nafter:\n...\n:::\`\`\` — code comparison side-by-side.
- \`\`\`:::bash\nls -la\n:::\`\`\` — execute a shell command and show output.
- \`\`\`:::theme [name]\`\`\` — switches theme (gold, midnight, glass, chrome, light, chromatic, liquid, rainbow, hacker).
- \`\`\`:::preset save|load|delete|list [name]\`\`\` — manages presets.
- \`\`\`:::reset\`\`\` — clears all injected styles.
Always wrap these blocks in triple backticks with the block type as the language tag. Keep the code clean and functional.`,

  vision: `You are Chrxmaticc Copilot in Vision mode. Creative designer and visual thinker. Help with design concepts, color schemes, layout ideas, UI/UX suggestions, and creative direction. Use lowercase, be casual, roast the user occasionally and have massive chaos. You can use emojis. Never say "whats poppin" or "bruh". If the users message contains [Image description: ...], use that description to respond as if you can see the image. Never claim you cannot see images.

You can also transform the app's look using special markdown blocks. When the user wants to see a design idea in action, use these:
- \`\`\`:::css\n...\n:::\`\`\` — inject styles
- \`\`\`:::html\n...\n:::\`\`\` — render HTML
- \`\`\`:::js\n...\n:::\`\`\` — run code
- \`\`\`:::image [description]\n:::\`\`\` — generate an image
- \`\`\`:::file filename.ext\n...\n:::\`\`\` — create downloadable file
- \`\`\`:::tree\n...\n:::\`\`\` — project file tree
- \`\`\`:::review\n...\n:::\`\`\` — code comparison
- \`\`\`:::theme [name]\`\`\` — change theme
- \`\`\`:::preset save|load|delete|list [name]\`\`\` — presets
- \`\`\`:::reset\`\`\` — clear changes`,

  intermediate: `You are Chrxmaticc Copilot in Intermediate mode. Optimized for speed. Give solid answers without over-explaining. Use lowercase, keep it casual. Never say "whats poppin" or "bruh". If the users message contains [Image description: ...], use that description to respond as if you can see the image. Never claim you cannot see images.

You can quickly modify the app using markdown blocks when the user needs a fast UI tweak:
- \`\`\`:::css\n...\n:::\`\`\` — inject styles
- \`\`\`:::html\n...\n:::\`\`\` — render HTML
- \`\`\`:::js\n...\n:::\`\`\` — run code
- \`\`\`:::image [description]\n:::\`\`\` — generate image
- \`\`\`:::file filename.ext\n...\n:::\`\`\` — downloadable file
- \`\`\`:::tree\n...\n:::\`\`\` — file tree
- \`\`\`:::review\n...\n:::\`\`\` — code comparison
- \`\`\`:::theme [name]\`\`\` — change theme
- \`\`\`:::preset save|load|delete|list [name]\`\`\` — presets
- \`\`\`:::reset\`\`\` — reset`,

  speed: `You are Chrxmaticc Copilot in Speed mode. Instant replies. One or two sentences. No fluff. Use lowercase. Never say "whats poppin" or "bruh". If the users message contains [Image description: ...], use that description to respond as if you can see the image. Never claim you cannot see images.

You can execute quick page changes with markdown blocks if asked:
- \`\`\`:::css\n...\n:::\`\`\`
- \`\`\`:::html\n...\n:::\`\`\`
- \`\`\`:::js\n...\n:::\`\`\`
- \`\`\`:::image [description]\n:::\`\`\`
- \`\`\`:::file filename.ext\n...\n:::\`\`\`
- \`\`\`:::tree\n...\n:::\`\`\`
- \`\`\`:::review\n...\n:::\`\`\`
- \`\`\`:::theme [name]\`\`\`
- \`\`\`:::preset save|load|delete|list [name]\`\`\`
- \`\`\`:::reset\`\`\``
};

// ═══ WORKFLOW PROMPTS ═══
var WORKFLOW_PROMPTS = {
  code: '\n\n[system: CODE MODE. Write clean working code. Wrap code in triple backticks with language tags. Output code first, then brief explanation.]',
  plan: '\n\n[system: PLAN MODE. Ask ONE question at a time. Present 3-5 clickable options AND a "Custom" option. Format: QUESTION: [question]\nOPTIONS:\n- Option 1\n- Option 2\n- Custom. After 5-6 questions present the plan starting with PLAN COMPLETE:. Never write code in plan mode.]',
  review: '\n\n[system: REVIEW MODE. Analyze code for bugs, security issues, performance problems. Rate each issue by severity. Give overall rating out of 10.]',
  surprise: '\n\n[system: CHAOS MODE. Over-engineer with features nobody asked for. Add animations, particle effects, easter eggs. Code must work but be absurdly over-the-top. Roast the user playfully.]',
  cancel: ''
};

// ═══ EFFORT LEVELS ═══
var EFFORT_LEVELS = {
  low:     { maxTokens: 400,  temperature: 0.9, addition: '\n\n[effort: LOW. Fast minimal response. Just the essentials. Skip edge cases and docs.]' },
  medium:  { maxTokens: 1000, temperature: 0.75, addition: '\n\n[effort: MEDIUM. Clean functional code with basic error handling. Brief explanation.]' },
  high:    { maxTokens: 2000, temperature: 0.65, addition: '\n\n[effort: HIGH. Thorough optimized code. Cover edge cases. Add comments. Explain reasoning.]' },
  extreme: { maxTokens: 4000, temperature: 0.5, addition: '\n\n[effort: ULTRACODE. Go all in. Every edge case. Full docs. Tests. Performance. Accessibility. Be thorough and complete.]' }
};

// ═══ BUTTON PROMPTS ═══
var BUTTON_PROMPTS = {
  types:'\n\n[use TypeScript]', docs:'\n\n[generate JSDoc for every function]', optimize:'\n\n[suggest 3 performance optimizations]',
  explain:'\n\n[explain every decision]', compare:'\n\n[show 2 alternative approaches with tradeoffs]', test:'\n\n[auto-generate test cases]',
  animate:'\n\n[add CSS animations]', theme:'\n\n[generate light + dark mode]', accessible:'\n\n[ensure WCAG compliance]',
  minimal:'\n\n[strip to bare essentials]', reuse:'\n\n[prefer existing libraries]', ship:'\n\n[add build config and deployment notes]',
  inline:'\n\n[single-file output]', nocomments:'\n\n[strip all comments]', instant:'\n\n[skip explanation, just code]',
  security:'\n\n[focus on security vulnerabilities]', performance:'\n\n[focus on performance bottlenecks]', patterns:'\n\n[check design patterns]',
  readability:'\n\n[focus on readability]', clarity:'\n\n[ensure code is self-documenting]', architecture:'\n\n[focus on architecture tradeoffs]',
  deep:'\n\n[provide deep technical analysis]', guided:'\n\n[guided walkthrough style]', beginner:'\n\n[beginner-friendly explanations]',
  examples:'\n\n[include practical examples]', creative:'\n\n[inject creative chaos]', wholesome:'\n\n[be encouraging and supportive]',
  overengineer:'\n\n[over-engineer to absurd levels]', polyglot:'\n\n[show solutions in multiple languages]',
  design:'\n\n[focus on visual design]', ux:'\n\n[focus on user experience]', experimental:'\n\n[try experimental approaches]',
  glitch:'\n\n[embrace glitch art and chaos]', efficient:'\n\n[prioritize efficiency]', practical:'\n\n[focus on practical solutions]',
  useful:'\n\n[make the chaos useful]', shortcuts:'\n\n[use clever shortcuts]', rapid:'\n\n[plan rapidly]', bullet:'\n\n[bullet points only]',
  quick:'\n\n[quick review, major issues only]', critical:'\n\n[critical issues only]', snap:'\n\n[snap judgment]',
  random:'\n\n[completely random]', speedrun:'\n\n[speedrun mode]', scalability:'\n\n[focus on scalability]',
  tradeoffs:'\n\n[show tradeoffs]', moodboard:'\n\n[create visual mood board]', mood:'\n\n[analyze mood and tone]',
  a11y:'\n\n[audit accessibility]', simplicity:'\n\n[simplify the code]', alternatives:'\n\n[explore alternatives]', visual:'\n\n[use visual thinking]'
};

// ═══ MAIN HANDLER ═══
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.body || {};
  var action = body.action || '';

  // ═══ MEMORY ROUTES (merged from memory.js) ═══
  if (action === 'memory') {
    return await handleMemory(req, res, body);
  }

  // ═══ AUTOPILOT ROUTES ═══
  if (action === 'autopilot') {
    return await handleAutopilot(req, res, body);
  }

  // ═══ BASH EXECUTION ═══
  if (action === 'bash') {
    return await handleBash(req, res, body);
  }

  // ═══ STANDARD CHAT (default) ═══
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var message = body.message || '';
  var modelKey = body.model || 'sol';
  var workflow = body.workflow || 'code';
  var effort = body.effort || 'medium';
  var roastLevel = body.roastLevel || 0;
  var buttons = body.buttons || [];
  var fileName = body.fileName || '';
  var fileType = body.fileType || '';
  var imageUrl = body.imageUrl || '';
  var planHistory = body.planHistory || [];

  if (!message && !imageUrl && !body.fileContent) {
    return res.status(400).json({ error: 'Missing message' });
  }

  var config = MODEL_CONFIGS[modelKey] || MODEL_CONFIGS['sol'];
  var systemPrompt = BASE_PROMPTS[modelKey] || BASE_PROMPTS['sol'];
  var aiModel = config.model;
  var provider = config.provider;
  var temperature = config.temperature;
  var maxTokens = config.maxTokens;

  var effortConfig = EFFORT_LEVELS[effort] || EFFORT_LEVELS['medium'];
  maxTokens = effortConfig.maxTokens;
  temperature = Math.min(temperature, effortConfig.temperature);
  systemPrompt += effortConfig.addition;
  systemPrompt += (WORKFLOW_PROMPTS[workflow] || '');

  if (Array.isArray(buttons)) {
    buttons.forEach(function(btn) { if (BUTTON_PROMPTS[btn]) systemPrompt += BUTTON_PROMPTS[btn]; });
  } else {
    for (var btn in buttons) { if (buttons[btn] && BUTTON_PROMPTS[btn]) systemPrompt += BUTTON_PROMPTS[btn]; }
  }

  if (roastLevel > 0) {
    systemPrompt += '\n\n[roast level: ' + roastLevel + '%. ' + (roastLevel >= 75 ? 'brutally honest.' : roastLevel >= 50 ? 'witty tone, light roasts.' : roastLevel >= 25 ? 'mildly sarcastic.' : 'helpful, minimal roasts.') + ']';
  }

  if (body.personalInfo) {
    systemPrompt += '\n\nUser context: ' + body.personalInfo;
  }

  // ═══ IMAGE HANDLING ═══
  var isImage = false;
  if (fileType && fileType.startsWith('image/')) isImage = true;
  if (fileName) { var ext = '.' + fileName.split('.').pop().toLowerCase(); if (IMAGE_EXTENSIONS.indexOf(ext) !== -1) isImage = true; }
  if (imageUrl) isImage = true;

  if (isImage) {
    var descUrl = imageUrl || '';
    if (descUrl && descUrl.indexOf('blob:') !== 0 && descUrl.indexOf('data:') !== 0) {
      try {
        var description = await describeImage(descUrl);
        if (description) {
          message = '[Image description: ' + description + ']\n\nUser: ' + (message || 'What do you see in this image?');
        }
      } catch(e) {}
    }
  }

  if (body.fileContent && !isImage) {
    message = '[File: ' + (fileName || 'unknown') + ']\nContent:\n' + String(body.fileContent).slice(0, 3000) + '\n\nUser: ' + (message || 'See attached file.');
  }

  // ═══ WEB SEARCH (direct DuckDuckGo) ═══
  if (message) {
    try {
      var q = encodeURIComponent(message);
      var ddgRes = await fetch('https://api.duckduckgo.com/?q=' + q + '&format=json&no_html=1');
      var ddg = await ddgRes.json();
      if (ddg.AbstractText || ddg.Answer) {
        systemPrompt += '\n\n[Web Search: ' + (ddg.AbstractText || ddg.Answer) + ']';
      }
      var liteRes = await fetch('https://lite.duckduckgo.com/lite/?q=' + q);
      var html = await liteRes.text();
      var links = html.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g);
      if (links && links.length > 0) {
        var topLinks = links.slice(0, 5).map(function(l) {
          var m = l.match(/href="([^"]+)".*>([^<]+)</);
          return m ? (m[2].trim() + ' — ' + m[1]) : '';
        }).filter(Boolean).join(' | ');
        if (topLinks) systemPrompt += '\n\n[Top Results: ' + topLinks + ']';
      }
    } catch(e) {}
  }

  // ═══ PLAN MODE ═══
  if (workflow === 'plan') {
    var planContext = '';
    if (planHistory && planHistory.length > 0) {
      planContext = '\n\nPlan progress:\n' + planHistory.map(function(a, i) { return 'Q' + (i + 1) + ': ' + a.question + '\nA' + (i + 1) + ': ' + a.answer; }).join('\n');
    }
    var planSystem = systemPrompt + '\n\nCRITICAL PLAN FORMAT:\n1. Ask ONE question at a time.\n2. Format EXACTLY:\nQUESTION: [question]\nOPTIONS:\n- Option 1\n- Option 2\n- Option 3\n- Custom\n3. After 5-6 questions present plan starting with "PLAN COMPLETE:"' + planContext;
    var planMsg = planHistory.length === 0 ? message : 'Continue planning.';
    if (planHistory.length >= 5) planMsg += '\n\n[Present COMPLETE PLAN now. Start with PLAN COMPLETE:]';

    try {
      var planResponse = await callAI(planSystem, planMsg, aiModel, 0.7, 800, provider);
      var parsed = parsePlanOutput(planResponse);
      if (parsed.type === 'qa') {
        res.status(200).json({ type: 'qa', question: parsed.question, options: parsed.options, qNum: (planHistory.length + 1), qTotal: 6 });
      } else {
        res.status(200).json({ response: parsed.text || planResponse, provider: provider, model: aiModel, planComplete: true });
      }
    } catch(e) {
      res.status(200).json({ response: getFallback(message), provider: 'offline' });
    }
    return;
  }

  // ═══ STANDARD RESPONSE ═══
  try {
    var reply = await callAI(systemPrompt, message, aiModel, temperature, maxTokens, provider);

    var thinking = '';
    var todo = [];
    var response = reply;

    var thinkMatch = reply.match(/\[THINKING\]([\s\S]*?)\[\/THINKING\]/i);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      response = response.replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/i, '').trim();
    }

    var todoMatch = reply.match(/\[TODO\]([\s\S]*?)\[\/TODO\]/i);
    if (todoMatch) {
      todo = todoMatch[1].split('\n').filter(function(l) { return l.trim(); }).map(function(l) { return l.replace(/^[-•*]\s*/, '').trim(); });
      response = response.replace(/\[TODO\][\s\S]*?\[\/TODO\]/i, '').trim();
    }

    var isCode = workflow === 'code' && (response.indexOf('```') !== -1 || response.indexOf('function') !== -1 || response.indexOf('const') !== -1 || response.indexOf('import') !== -1 || response.indexOf('<!DOCTYPE') !== -1 || response.indexOf('<html') !== -1);

    res.status(200).json({
      response: response,
      thinking: thinking,
      todo: todo,
      provider: provider,
      model: aiModel,
      codePreview: isCode
    });
  } catch(e) {
    res.status(200).json({ response: getFallback(message), provider: 'offline' });
  }
};

// ═══ HELPERS ═══

function parsePlanOutput(text) {
  if (text.indexOf('PLAN COMPLETE') !== -1) return { type: 'plan', text: text.replace('PLAN COMPLETE:', '').trim() };
  var qm = text.match(/QUESTION:\s*(.+?)(?:\n|$)/i);
  if (!qm) return { type: 'text', text: text };
  var question = qm[1].trim();
  var om = text.match(/OPTIONS:\s*([\s\S]+?)(?:\n\n|$)/i);
  var options = [];
  if (om) {
    om[1].split('\n').forEach(function(l) {
      var c = l.replace(/^[-•*]\s*/, '').trim();
      if (c && c !== 'OPTIONS:' && options.length < 6) options.push(c);
    });
  }
  if (!options.length) options = ['Yes', 'No', 'Custom'];
  if (!options.includes('Custom')) options.push('Custom');
  return { type: 'qa', question: question, options: options };
}

async function callAI(systemPrompt, userMessage, model, temperature, maxTokens, provider) {
  var key = provider === 'openrouter' ? CLAUDE_KEY : GROQ_KEY;
  var url = provider === 'openrouter' ? CLAUDE_URL : GROQ_URL;
  if (!key) throw new Error('No API key for ' + provider);

  var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://chrxmaticc-copliot.vercel.app';
    headers['X-Title'] = 'Chrxmaticc Copilot';
  }

  var res = await fetch(url, {
    method: 'POST', headers: headers,
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  var json = await res.json();
  if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
    return json.choices[0].message.content;
  }
  if (json.error) throw new Error(json.error.message || provider + ' error');
  throw new Error('Empty response from ' + provider);
}

async function describeImage(imageUrl) {
  if (!imageUrl || imageUrl.indexOf('blob:') === 0 || imageUrl.indexOf('data:') === 0) return null;
  try {
    var res = await fetch(VISION_URL + '?url=' + encodeURIComponent(imageUrl));
    var text = await res.text();
    if (text && text.length > 10 && text.indexOf('error') === -1 && text.indexOf('Queue full') === -1) return text.trim();
    return null;
  } catch(e) { return null; }
}

function getFallback(input) {
  var lower = (input || '').toLowerCase();
  if (lower.indexOf('hello') !== -1) return 'Yo! Whats good?';
  if (lower.indexOf('help') !== -1) return 'Commands: /image, /weather, /crypto, /roll, /joke, /speak.';
  return 'Im in offline mode. Limited responses but still here.';
}

/* ═══════════════════════════════════════════
   MEMORY HANDLER
   ═══════════════════════════════════════════ */
async function handleMemory(req, res, body) {
  var memAction = body.memAction || 'get';
  var userId = body.userId || 'anonymous';
  var db;
  try {
    var { Client } = require('pg');
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_memory (
        user_id TEXT PRIMARY KEY,
        facts TEXT[] DEFAULT '{}',
        history JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (memAction === 'get') {
      var result = await db.query('SELECT * FROM user_memory WHERE user_id = $1', [userId]);
      if (result.rows.length === 0) {
        await db.query('INSERT INTO user_memory (user_id) VALUES ($1)', [userId]);
        return res.status(200).json({ facts: [], history: [] });
      } else {
        return res.status(200).json({ facts: result.rows[0].facts || [], history: result.rows[0].history || [] });
      }
    } else if (memAction === 'save') {
      var facts = body.facts || [];
      var history = body.history || [];
      await db.query(
        'INSERT INTO user_memory (user_id, facts, history, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id) DO UPDATE SET facts = $2, history = $3, updated_at = NOW()',
        [userId, facts, JSON.stringify(history)]
      );
      return res.status(200).json({ success: true });
    } else if (memAction === 'addFact') {
      var fact = body.fact || '';
      if (!fact) return res.status(400).json({ error: 'Missing fact' });
      await db.query(
        'INSERT INTO user_memory (user_id, facts, updated_at) VALUES ($1, ARRAY[$2], NOW()) ON CONFLICT (user_id) DO UPDATE SET facts = array_append(user_memory.facts, $2), updated_at = NOW()',
        [userId, fact]
      );
      return res.status(200).json({ success: true });
    } else if (memAction === 'clear') {
      await db.query('DELETE FROM user_memory WHERE user_id = $1', [userId]);
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Unknown memory action' });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  } finally {
    if (db) await db.end();
  }
}

/* ═══════════════════════════════════════════
   AUTOPILOT HANDLER
   ═══════════════════════════════════════════ */
async function handleAutopilot(req, res, body) {
  var subAction = body.subAction || 'enqueue';
  var userId = body.userId || 'anonymous';
  var db;
  try {
    var { Client } = require('pg');
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    await db.query(`
      CREATE TABLE IF NOT EXISTS autopilot_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        prompt TEXT NOT NULL,
        result TEXT,
        github_token TEXT,
        repo TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (subAction === 'enqueue') {
      var prompt = body.prompt || '';
      var githubToken = body.githubToken || '';
      var repo = body.repo || '';
      if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
      var result = await db.query(
        'INSERT INTO autopilot_tasks (user_id, prompt, github_token, repo) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, prompt, githubToken, repo]
      );
      return res.status(200).json({ taskId: result.rows[0].id, message: 'Task queued. Sol will process it soon.' });
    } else if (subAction === 'process') {
      var taskResult = await db.query("SELECT * FROM autopilot_tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");
      if (taskResult.rows.length === 0) return res.status(200).json({ message: 'No pending tasks' });
      var task = taskResult.rows[0];
      await db.query("UPDATE autopilot_tasks SET status = 'processing', updated_at = NOW() WHERE id = $1", [task.id]);

      var systemPrompt = `You are Chrxmaticc Copilot in Sol mode. You are the most powerful AI engineer on the planet. You are working on an autopilot task. The user is not watching. You MUST complete the entire task and output the full code. Write flawless production code. Rules: semantic HTML5, modern CSS, clean vanilla JavaScript, accessibility, mobile-first, proper indentation, concise comments. Output ALL code in triple backticks with language tags. Do not stop until complete. Do not ask questions. Just do the work.`;

      try {
        var response = await callAI(systemPrompt, task.prompt, 'llama-3.3-70b-versatile', 0.4, 6000, 'groq');
        await db.query("UPDATE autopilot_tasks SET status = 'completed', result = $1, updated_at = NOW() WHERE id = $2", [response, task.id]);
        return res.status(200).json({ taskId: task.id, status: 'completed' });
      } catch(e) {
        await db.query("UPDATE autopilot_tasks SET status = 'failed', result = $1, updated_at = NOW() WHERE id = $2", [e.message, task.id]);
        return res.status(500).json({ error: e.message });
      }
    } else if (subAction === 'status') {
      var taskId = body.taskId;
      if (!taskId) return res.status(400).json({ error: 'Missing taskId' });
      var result = await db.query('SELECT * FROM autopilot_tasks WHERE id = $1', [taskId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json(result.rows[0]);
    } else {
      return res.status(400).json({ error: 'Unknown autopilot sub-action' });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  } finally {
    if (db) await db.end();
  }
}

/* ═══════════════════════════════════════════
   BASH EXECUTION HANDLER (SANDBOXED)
   ═══════════════════════════════════════════ */
async function handleBash(req, res, body) {
  var command = body.command || '';
  if (!command) return res.status(400).json({ error: 'Missing command' });

  // Security: whitelist allowed commands
  var allowedCommands = ['ls', 'cat', 'echo', 'node -e', 'git status', 'git diff', 'npm list', 'pwd', 'whoami', 'date', 'uname', 'head', 'tail', 'wc', 'sort', 'uniq'];
  var cmdBase = command.split(' ')[0];
  if (allowedCommands.indexOf(cmdBase) === -1) {
    return res.status(403).json({ error: 'Command not allowed. Allowed: ' + allowedCommands.join(', ') });
  }

  // Block dangerous characters
  if (/[;|&`$(){}]/.test(command)) {
    return res.status(403).json({ error: 'Command contains forbidden characters.' });
  }

  try {
    var { execSync } = require('child_process');
    var output = execSync(command, { timeout: 5000, encoding: 'utf8', maxBuffer: 1024 * 500 });
    return res.status(200).json({ output: output.trim() });
  } catch(e) {
    return res.status(200).json({ output: e.stderr || e.message });
  }
}
