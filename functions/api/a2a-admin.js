const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const DEFAULT_PRICE = 10;

function authorized(request, env) {
  const configured = String(env.ECBTAX_ADMIN_TOKEN || "").trim();

  if (!configured) return false;

  const supplied = String(
    request.headers.get("x-admin-token") || ""
  ).trim();

  return supplied === configured;
}

async function ensureSettingsTable(env) {
  await env.A2A_DB
    .prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    .run();
}

export async function onRequestGet({ request, env }) {

  if (!authorized(request, env)) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  if (!env.A2A_DB) {
    return json({ error: "A2A_DB_NOT_CONFIGURED" }, 500);
  }

  await ensureSettingsTable(env);

  const row = await env.A2A_DB
    .prepare(`
      SELECT value, updated_at
      FROM settings
      WHERE key = 'payroll_price_per_employee_month'
      LIMIT 1
    `)
    .first();

  const price =
    row && Number(row.value) > 0
      ? Number(row.value)
      : DEFAULT_PRICE;

  return json({
    ok: true,
    currency: "EUR",
    unit: "employee/month",
    price_per_employee_month: price,
    updated_at: row?.updated_at || null
  });
}

export async function onRequestPost({ request, env }) {

  if (!authorized(request, env)) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  if (!env.A2A_DB) {
    return json({ error: "A2A_DB_NOT_CONFIGURED" }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const price = Number(body.price_per_employee_month);

  if (!Number.isFinite(price) || price <= 0) {
    return json({
      error: "INVALID_PRICE",
      message: "Price must be greater than zero."
    }, 400);
  }

  const updatedAt = new Date().toISOString();

  await ensureSettingsTable(env);

  await env.A2A_DB
    .prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key)
      DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)
    .bind(
      "payroll_price_per_employee_month",
      String(price),
      updatedAt
    )
    .run();

  return json({
    ok: true,
    active: true,
    currency: "EUR",
    unit: "employee/month",
    price_per_employee_month: price,
    example_5_employees: {
      employees: 5,
      total_eur_month: 5 * price
    },
    updated_at: updatedAt
  });
}
