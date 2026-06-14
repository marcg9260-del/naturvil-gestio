export default async (req, context) => {
  try {
    const ODOO_URL = process.env.odoo_url;
    const ODOO_DB = process.env.odoo_db;
    const ODOO_USER = process.env.odoo_user;
    const ODOO_KEY = process.env.odoo_api_key;

    const authRes = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'authenticate',
          args: [ODOO_DB, ODOO_USER, ODOO_KEY, {}]
        },
        id: Date.now()
      })
    });

    const authData = await authRes.json();
    const uid = authData.result;

    if (!uid) {
  throw new Error(JSON.stringify({
    error: 'Auth fallida',
    odoo_url: ODOO_URL,
    odoo_db: ODOO_DB,
    odoo_user: ODOO_USER,
    te_api_key: !!ODOO_KEY,
    mida_api_key: ODOO_KEY ? ODOO_KEY.length : 0,
    resposta_odoo: authData
  }));
}

    const res = await fetch(`${ODOO_URL}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            ODOO_DB,
            uid,
            ODOO_KEY,
            'product.product',
            'search_read',
            [[['sale_ok', '=', true]]],
            {
              fields: ['id', 'name', 'list_price', 'default_code', 'type'],
              limit: 200,
              order: 'name asc'
            }
          ]
        },
        id: Date.now()
      })
    });

    const data = await res.json();

    return new Response(JSON.stringify({
      ok: true,
      products: data.result || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
