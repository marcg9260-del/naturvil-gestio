export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' }
    });
  }
  try {
const ODOO_URL = process.env.odoo_url;
const ODOO_DB = process.env.odoo_db;
const ODOO_USER = process.env.odoo_user;
const ODOO_KEY = process.env.odoo_api_key;

    const authRes = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_KEY } })
    });
    const cookie = authRes.headers.get('set-cookie');
    const authData = await authRes.json();
    if (!authData.result?.uid) throw new Error('Auth fallida');

    const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie || '' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 2, params: { model: 'product.product', method: 'search_read', args: [[['sale_ok', '=', true]]], kwargs: { fields: ['id', 'name', 'list_price', 'uom_id'], limit: 200 } } })
    });
    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, products: data.result || [] }), {
      status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};

export const config = { path: '/api/productes' };
