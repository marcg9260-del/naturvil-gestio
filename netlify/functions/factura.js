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
    const body = await req.json();
    const { client_id, date, vat, description, lines } = body;

    const invoiceLines = (lines || []).map(line => [0, 0, {
      name: line.concept,
      quantity: line.quantity,
      price_unit: line.price_unit,
      tax_ids: [],
    }]);

    const invoiceRes = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 1,
        params: {
          model: 'account.move',
          method: 'create',
          args: [{
            move_type: 'out_invoice',
            partner_id: client_id,
            invoice_date: date,
            narration: description,
            invoice_line_ids: invoiceLines,
          }],
          kwargs: {}
        }
      })
    });
    const invoiceData = await invoiceRes.json();
    if (invoiceData.error) throw new Error(invoiceData.error.data?.message || invoiceData.error.message);

    return new Response(JSON.stringify({ ok: true, invoice_id: invoiceData.result }), {
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

export const config = { path: '/api/factura' };
