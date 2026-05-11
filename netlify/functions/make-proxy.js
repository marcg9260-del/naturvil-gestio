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
    const body = await req.text();
    const response = await fetch('https://hook.eu1.make.com/l4s5upe6u4air211dtylehqour4chjj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};

export const config = { path: '/api/make' };
