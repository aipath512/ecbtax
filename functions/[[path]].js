export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (response.status === 200 && contentType.includes('text/html')) {
    const body = await response.clone().text();
    if (body.includes('data-http-status="404"')) {
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex, follow');
      headers.set('Cache-Control', 'no-store');
      return new Response(body, { status: 404, headers });
    }
  }

  return response;
}
