const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const SETTING_KEY = "payroll_price_per_employee_eur";
const DEFAULT_PRICE = 10;

function authorized(request, env) {
  const configured =
    String(env.ECBTAX_ADMIN_TOKEN || "").trim();

  const supplied =
    String(request.headers.get("x-admin-token") || "").trim();

  return configured && supplied === configured;
}

async function ensurePricing(db) {

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS a2a_settings(
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
    INSERT OR IGNORE INTO a2a_settings(
      setting_key,
      setting_value,
      updated_at
    )
    VALUES(?,?,?)
  `)
  .bind(
    SETTING_KEY,
    String(DEFAULT_PRICE),
    new Date().toISOString()
  )
  .run();
}

export async function onRequestGet({request, env}) {

  if (!authorized(request, env)) {
    return json({error:"UNAUTHORIZED"},401);
  }

  if (!env.A2A_DB) {
    return json({error:"A2A_DB_NOT_CONFIGURED"},500);
  }

  const db = env.A2A_DB;

  await ensurePricing(db);

  const row = await db.prepare(`
    SELECT setting_value, updated_at
    FROM a2a_settings
    WHERE setting_key=?
  `)
  .bind(SETTING_KEY)
  .first();

  const price =
    Number(row?.setting_value || DEFAULT_PRICE);

  return json({
    ok:true,
    active:true,
    currency:"EUR",
    unit:"employee/month",
    price_per_employee_month:price,
    updated_at:row?.updated_at || null
  });
}

export async function onRequestPost({request, env}) {

  if (!authorized(request, env)) {
    return json({error:"UNAUTHORIZED"},401);
  }

  if (!env.A2A_DB) {
    return json({error:"A2A_DB_NOT_CONFIGURED"},500);
  }

  let body={};

  try {
    body=await request.json();
  } catch {
    return json({error:"INVALID_JSON"},400);
  }

  const price =
    Number(body.price_per_employee_month);

  if (!Number.isFinite(price) || price < 0) {
    return json({error:"INVALID_PRICE"},400);
  }

  const db=env.A2A_DB;

  await ensurePricing(db);

  const updatedAt =
    new Date().toISOString();

  await db.prepare(`
    INSERT INTO a2a_settings(
      setting_key,
      setting_value,
      updated_at
    )
    VALUES(?,?,?)

    ON CONFLICT(setting_key)
    DO UPDATE SET
      setting_value=excluded.setting_value,
      updated_at=excluded.updated_at
  `)
  .bind(
    SETTING_KEY,
    String(price),
    updatedAt
  )
  .run();

  return json({
    ok:true,
    active:true,

    currency:"EUR",
    unit:"employee/month",

    price_per_employee_month:price,

    example:{
      employees:5,
      price_per_employee:price,
      total_eur_month:
        Number((5*price).toFixed(2))
    },

    updated_at:updatedAt
  });
}
