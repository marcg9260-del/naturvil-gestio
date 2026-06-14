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
    const res = await fetch('https://naturvil.odoo.com/web/dataset/call_kw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('marcgarvil@hotmail.com:2806956948a18b1b6b34c83c7608c3560d105743')
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: 1,
        params: {
          model: 'res.partner',
          method: 'search_read',
          args: [[['customer_rank', '>', 0]]],
          kwargs: {
            fields: ['id', 'name', 'city'],
            limit: 200,
            context: { 'allowed_company_ids': [1] }
          }
        }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.data?.message || data.error.message);
    return new Response(JSON.stringify({ ok: true, clients: data.result || [] }), {
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

export const config = { path: '/api/clients' };
