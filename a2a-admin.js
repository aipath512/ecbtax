function reply(data,status=200){
  return Response.json(data,{status,headers:{
    "Cache-Control":"no-store",
    "Access-Control-Allow-Origin":"https://ecbtax.com",
    "Access-Control-Allow-Headers":"content-type,authorization",
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS"
  }});
}

export async function onRequestOptions(){ return reply({ok:true}); }

function authorized(request,env){
  const expected=String(env.ECBTAX_ADMIN_TOKEN||"");
  const got=String(request.headers.get("authorization")||"");
  return expected.length>=16 && got===`Bearer ${expected}`;
}

async function ensureSettings(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS a2a_settings(
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await db.prepare(`INSERT OR IGNORE INTO a2a_settings(setting_key,setting_value,updated_at)
    VALUES('payroll_price_per_employee_eur','10',?)`)
    .bind(new Date().toISOString()).run();
}

export async function onRequestGet({request,env}){
  if(!authorized(request,env)) return reply({error:"UNAUTHORIZED"},401);
  if(!env.A2A_DB) return reply({error:"A2A_DB_BINDING_NOT_FOUND"},500);
  await ensureSettings(env.A2A_DB);
  const row=await env.A2A_DB.prepare(`SELECT setting_value,updated_at FROM a2a_settings
    WHERE setting_key='payroll_price_per_employee_eur'`).first();
  return reply({
    service:"ECBTAX Payroll",
    currency:"EUR",
    billing_period:"month",
    price_per_employee:Number(row.setting_value),
    updated_at:row.updated_at
  });
}

export async function onRequestPost({request,env}){
  if(!authorized(request,env)) return reply({error:"UNAUTHORIZED"},401);
  if(!env.A2A_DB) return reply({error:"A2A_DB_BINDING_NOT_FOUND"},500);
  let body={};
  try{ body=await request.json(); }catch{ return reply({error:"INVALID_JSON"},400); }
  const price=Number(body.price_per_employee);
  if(!Number.isFinite(price) || price<0 || price>100000)
    return reply({error:"INVALID_PRICE_PER_EMPLOYEE"},400);
  await ensureSettings(env.A2A_DB);
  const at=new Date().toISOString();
  await env.A2A_DB.prepare(`INSERT INTO a2a_settings(setting_key,setting_value,updated_at)
    VALUES('payroll_price_per_employee_eur',?,?)
    ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at`)
    .bind(String(price),at).run();
  return reply({
    status:"ACTIVE",
    service:"ECBTAX Payroll",
    currency:"EUR",
    billing_period:"month",
    price_per_employee:price,
    updated_at:at
  });
}
