// server.js
// Relay + static site + webhook → SSE + proxy to /twoleg and /hangup (recording stripped on /twoleg)

require('dotenv').config(); // load .env (npm i dotenv)

const express = require('express');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 9000;
const API_BASE = (process.env.API_BASE || 'http://35.239.188.72:8080').replace(/\/+$/, '');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const AUTH_TOKEN = process.env.AUTH_TOKEN || null; // <— attaches to proxied calls if set

// debug logging (enable with DEBUG=1)
const DBG = process.env.DEBUG === "1";
const log  = (...args) => { if (DBG) console.log(...args); };
const loge = (...args) => { if (DBG) console.error(...args); };

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

/** @type {{[callId: string]: Array<object>}} */
const eventsByCall = {};
/** @type {{[callId: string]: Set<import('express').Response>}} */
const subscribers = {};

function addEvent(callId, evt) {
  const key = callId || 'global';
  (eventsByCall[key] ||= []).push(evt);
  const subs = subscribers[key];
  if (subs && subs.size) {
    const payload = `event: update\ndata: ${JSON.stringify(evt)}\n\n`;
    for (const res of subs) { try { res.write(payload); } catch {} }
  }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => res.json({ ok: true, api_base: API_BASE }));

// webhook receiver (no auth/security)
app.post('/webhook', (req, res) => {
  const p = req.body?.payload || {};
  addEvent(p.call_id || null, req.body || {});
  // create new files in ./logs to log raw webhooks. file name should be p.call_id. append mode.
  require('fs').appendFileSync(`./logs/${p.call_id}.log`, JSON.stringify(req.body) + "\n");
  
  res.json({ ok: true });
});

// SSE stream
app.get('/events', (req, res) => {
  const callId = req.query.call_id;
  if (!callId) return res.status(400).json({ error: 'Missing call_id' });

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  });
  res.flushHeaders?.();

  (subscribers[callId] ||= new Set()).add(res);
  for (const evt of (eventsByCall[callId] || [])) {
    res.write(`event: update\ndata: ${JSON.stringify(evt)}\n\n`);
  }

  const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000);
  req.on('close', () => {
    clearInterval(ping);
    subscribers[callId].delete(res);
    if (!subscribers[callId].size) delete subscribers[callId];
  });
});

// Proxy: browser → /api/twoleg → API_BASE/twoleg (strip "record", auto-attach AUTH_TOKEN)
app.post('/api/twoleg', async (req, res) => {
  try {
    const cleanBody = { ...req.body };
    if ('record' in cleanBody) delete cleanBody.record;

    // auto-attach token if configured
    if (AUTH_TOKEN) cleanBody.auth_token = AUTH_TOKEN;

    const upstream = await fetch(`${API_BASE}/twoleg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanBody),
    });

    const text = await upstream.text();
    const type = upstream.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      try { res.status(upstream.status).json(JSON.parse(text)); }
      catch { res.status(upstream.status).send(text); }
    } else {
      res.status(upstream.status).send(text);
    }
  } catch (err) {
    loge("Proxy error (twoleg):", err.message);
    res.status(502).json({ error: 'bad_gateway', detail: String(err?.message || err) });
  }
});

// Proxy: browser → /api/hangup → API_BASE/hangup (auto-attach AUTH_TOKEN)
app.post('/api/hangup', async (req, res) => {
  try {
    const body = {
      call_id: req.body?.call_id,
    };
    if (!body.call_id) return res.status(400).json({ error: 'Missing call_id' });

    // auto-attach token if configured
    if (AUTH_TOKEN) body.auth_token = AUTH_TOKEN;

    const upstream = await fetch(`${API_BASE}/hangup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    const type = upstream.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      try { res.status(upstream.status).json(JSON.parse(text)); }
      catch { res.status(upstream.status).send(text); }
    } else {
      res.status(upstream.status).send(text);
    }
  } catch (err) {
    loge("Proxy error (hangup):", err.message);
    res.status(502).json({ error: 'bad_gateway', detail: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Relay listening on http://0.0.0.0:${PORT}`);
  console.log(`Serving static from ${path.join(__dirname, 'public')}`);
  console.log(`Webhook: POST /webhook   SSE: GET /events?call_id=...`);
  console.log(`Proxy: POST /api/twoleg  → ${API_BASE}/twoleg (auth auto-attached${AUTH_TOKEN?' ✅':' ❌'})`);
  console.log(`Proxy: POST /api/hangup  → ${API_BASE}/hangup (auth auto-attached${AUTH_TOKEN?' ✅':' ❌'})`);
});

