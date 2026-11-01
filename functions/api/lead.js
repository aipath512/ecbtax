const text = (value, max = 2000) => String(value || '').trim().slice(0, max);

function html(message, status = 200) {
  return new Response(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${status < 400 ? 'Cerere primită' : 'Cererea nu a fost trimisă'} | ECBTAX</title><link rel="stylesheet" href="/assets/ledger.css"></head><body><main style="max-width:760px;margin:10vh auto;padding:32px"><h1>${message}</h1><p><a href="/">Pagina principală</a> · <a href="/contact">Contact</a></p></main></body></html>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
    return html('Formatul cererii nu este acceptat.', 415);
  }

  const form = await request.formData();
  const honeypot = text(form.get('website'), 200);
  if (honeypot) return html('Cererea a fost primită.');
  const privacyConsent = text(form.get('privacy_consent'), 20);

  const lead = {
    lead_id: `LEAD-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    created_at: new Date().toISOString(),
    name: text(form.get('Nume') || form.get('name'), 200),
    email: text(form.get('Email') || form.get('email'), 320),
    company: text(form.get('Firma') || form.get('company'), 300),
    cui: text(form.get('CUI') || form.get('cui'), 80),
    entity_type: text(form.get('Tip') || form.get('entity_type'), 100),
    service: text(form.get('Serviciu') || form.get('service'), 200),
    message: text(form.get('Mesaj') || form.get('message'), 4000),
    source_url: text(form.get('source_url'), 1000),
    referrer: text(form.get('referrer'), 1000),
    utm_source: text(form.get('utm_source'), 200),
    utm_medium: text(form.get('utm_medium'), 200),
    utm_campaign: text(form.get('utm_campaign'), 300)
  };

  if (!lead.name || !lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return html('Completează numele și o adresă de email validă.', 400);
  }
  if (privacyConsent !== 'yes') {
    return html('Confirmă acordul pentru prelucrarea datelor necesare acestei solicitări.', 400);
  }
  if (!env.A2A_DB) {
    return html('Cererea nu poate fi salvată momentan. Folosește emailul sau WhatsApp-ul afișat pe pagina de contact.', 503);
  }

  await env.A2A_DB.prepare(`CREATE TABLE IF NOT EXISTS leads (
    lead_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    cui TEXT,
    entity_type TEXT,
    service TEXT,
    message TEXT,
    source_url TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    status TEXT NOT NULL DEFAULT 'new'
  )`).run();

  await env.A2A_DB.prepare(`INSERT INTO leads (
    lead_id, created_at, name, email, company, cui, entity_type, service, message,
    source_url, referrer, utm_source, utm_medium, utm_campaign
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(lead.lead_id, lead.created_at, lead.name, lead.email, lead.company, lead.cui,
      lead.entity_type, lead.service, lead.message, lead.source_url, lead.referrer,
      lead.utm_source, lead.utm_medium, lead.utm_campaign)
    .run();

  return new Response(null, {
    status: 303,
    headers: {
      location: `/thank-you?lead_id=${encodeURIComponent(lead.lead_id)}`,
      'cache-control': 'no-store'
    }
  });
}

export function onRequestGet() {
  return Response.json({ error: 'METHOD_NOT_ALLOWED', allowed: ['POST'] }, { status: 405, headers: { allow: 'POST' } });
}
