export async function POST(req) {
  try {
    const backendRes = await fetch('http://backend-service:5000/predict', {
      method: 'POST',
      headers: {
        ...Object.fromEntries(
          [...req.headers].filter(([key]) =>
            !['host', 'content-length'].includes(key.toLowerCase())
          )
        ),
      },
      body: req.body,
      duplex: 'half', 
    });

    const result = await backendRes.json();

    return new Response(JSON.stringify(result), {
      status: backendRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /predict] Proxy error:', error);
    return new Response(
      JSON.stringify({
        error: 'Proxy error',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
