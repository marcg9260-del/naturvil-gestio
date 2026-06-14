export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  try {
    const ODOO_URL = 'https://naturvil.odoo.com';
    const ODOO_DB = 'naturvil';
    const ODOO_USER = 'marcgarvil@hotmail.com';
    const ODOO_KEY = 'b58cb57fdab170a0acbaa674c7247347cb1b09fa';

    const credentials = btoa(`${ODOO_USER}:${ODOO_KEY}`);

    const prodRes = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 1,
        params: {
          model: 'product.product',
          method: 'search_read',
          args: [[['sale_ok', '=', true]]],
          kwargs: { fields: ['id', 'name', 'list_price', 'uom_id'], limit: 200 }
        }
      })
    });
    const prodData = await prodRes.json();
    if (prodData.error) throw new Error(prodData.error.data?.message || prodData.error.message);
    return new Response(JSON.stringify({ ok: true, products: prodData.result || [] }), {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};

export const config = { path: '/api/productes' };
