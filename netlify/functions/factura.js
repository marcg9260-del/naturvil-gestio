export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  try {
    const ODOO_URL = 'https://naturvil.odoo.com';
    const ODOO_DB = 'naturvil';
    const ODOO_USER = 'marcgarvil@hotmail.com';
    const ODOO_KEY = 'b58cb57fdab170a0acbaa674c7247347cb1b09fa';

    const body = await req.json();
    const { client_id, date, vat, description, lines } = body;

    const authRes = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_KEY } })
    });
    const authData = await authRes.json();
    const uid = authData.result?.uid;
    if (!uid) throw new Error('Autenticació fallida');

    const invoiceLines = (lines || []).map(line => [0, 0, {
      name: line.concept,
      quantity: line.quantity,
      price_unit: line.price_unit,
      tax_ids: vat > 0 ? [[6, 0, []]] : [],
    }]);

    const invoiceRes = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 2,
        params: {
          model: 'account.move',
          method: 'create',
          args: [{
            move_type: 'out_invoice',
            partner_id: client_id,
            invoice_date: date,
            narration: description,
