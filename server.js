const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '50mb' }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.use(express.static('public'));

const ODOO_URL = process.env.ODOO_URL || 'https://naturvil.odoo.com';
const ODOO_DB = process.env.ODOO_DB || 'naturvil';
const ODOO_USER = process.env.ODOO_USER || 'marcgarvil@hotmail.com';
const ODOO_API_KEY = process.env.ODOO_API_KEY || 'b58cb57fdab170a0acbaa674c7247347cb1b09fa';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// ── ODOO ──────────────────────────────────────────────────
async function odooAuth() {
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_API_KEY }
    })
  });
  const data = await res.json();
  return data.result?.uid;
}

async function odooCall(model, method, args, kwargs = {}) {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { model, method, args, kwargs }
    })
  });
  const data = await res.json();
  return data.result;
}

// ── CLAUDE ────────────────────────────────────────────────
async function claudeExtract(prompt, imageBase64 = null, mediaType = null) {
  const content = [];
  if (imageBase64) {
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } });
  }
  content.push({ type: 'text', text: prompt });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content }]
    })
  });
  const data = await res.json();
  return data.content[0].text;
}

// ── RUTES ─────────────────────────────────────────────────

// Crear client
app.post('/api/client', async (req, res) => {
  try {
    const data = req.body.payload || req.body;
const { name, email, phone, city } = data;
    await odooAuth();
    const id = await odooCall('res.partner', 'create', [{ name, email, phone, city, customer_rank: 1 }]);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Crear factura
app.post('/api/factura', async (req, res) => {
  try {
    const { partner_id, descripcio, import: imp } = req.body;
    await odooAuth();
    const id = await odooCall('account.move', 'create', [{
      move_type: 'out_invoice',
      partner_id,
      invoice_line_ids: [[0, 0, { name: descripcio, price_unit: imp }]]
    }]);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Processar foto (factura/tiquet)
app.post('/api/foto', upload.single('foto'), async (req, res) => {
  try {
    const imageData = fs.readFileSync(req.file.path);
    const base64 = imageData.toString('base64');
    const mediaType = req.file.mimetype;

    const prompt = `Extreu les dades d'aquesta factura o tiquet en format JSON. Retorna NOMÉS el JSON, sense cap text addicional. Format:
{
  "proveidor": "nom del proveïdor",
  "nif": "NIF/CIF si apareix",
  "numero_factura": "número si apareix",
  "data": "data en format YYYY-MM-DD",
  "descripcio": "descripció dels articles",
  "base_imponible": número,
  "iva_percentatge": número,
  "iva_import": número,
  "total": número,
  "forma_pagament": "efectiu/targeta/transferència"
}`;

    const resultat = await claudeExtract(prompt, base64, mediaType);
    const dades = JSON.parse(resultat.replace(/```json|```/g, '').trim());

    // Crear despesa a Odoo
    await odooAuth();
    const id = await odooCall('account.move', 'create', [{
      move_type: 'in_invoice',
      ref: dades.numero_factura || '',
      invoice_date: dades.data || new Date().toISOString().split('T')[0],
      invoice_line_ids: [[0, 0, {
        name: dades.descripcio || 'Despesa',
        price_unit: dades.base_imponible || dades.total || 0
      }]]
    }]);

    fs.unlinkSync(req.file.path);
    res.json({ ok: true, dades, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Llistar clients
app.get('/api/clients', async (req, res) => {
  try {
    await odooAuth();
    const clients = await odooCall('res.partner', 'search_read',
      [[['customer_rank', '>', 0]]],
      { fields: ['id', 'name', 'email', 'phone', 'city'], limit: 100 }
    );
    res.json({ ok: true, clients });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Llistar factures
app.get('/api/factures', async (req, res) => {
  try {
    await odooAuth();
    const factures = await odooCall('account.move', 'search_read',
      [[['move_type', '=', 'out_invoice']]],
      { fields: ['id', 'name', 'partner_id', 'invoice_date', 'amount_total', 'state'], limit: 100, order: 'id desc' }
    );
    res.json({ ok: true, factures });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Naturvil servidor actiu al port ${PORT}`));
