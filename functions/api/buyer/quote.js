export async function onRequestPost({request}){
  let body={};
  try{body=await request.json()}catch{return Response.json({error:"INVALID_JSON"},{status:400})}

  const period=String(body.period||"").trim();
  const employees=Number(body.employees||5);
  if(!period) return Response.json({error:"PERIOD_REQUIRED"},{status:400});

  const msg={
    jsonrpc:"2.0",
    id:crypto.randomUUID(),
    method:"service.answer",
    params:{
      buyer:"AiVenture Buyer Agent",
      service:"payroll",
      period,
      employees
    }
  };

  let r;
  try{
    r=await fetch("https://ecbtax.com/api/a2a",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(msg)
    });
  }catch{
    return Response.json({event:"QUOTE_REQUEST_FAILED",error:"SELLER_UNREACHABLE"},{status:502});
  }

  const seller=await r.json().catch(()=>({}));
  if(!r.ok) return Response.json({event:"QUOTE_REQUEST_FAILED",seller_response:seller},{status:502});

  return Response.json({
    event:"QUOTE_RECEIVED",
    timestamp:new Date().toISOString(),
    source:"ECBTAX Seller Agent",
    seller_response:seller,
    next_event:"BUYER_QUOTE_VERIFICATION"
  });
}
