function reply(data,status=200){
  return Response.json(data,{status,headers:{
    "Access-Control-Allow-Origin":"https://aiventure.ro",
    "Access-Control-Allow-Headers":"content-type",
    "Access-Control-Allow-Methods":"POST,OPTIONS"
  }});
}
export async function onRequestOptions(){ return reply({ok:true}); }

export async function onRequestPost({request}){
  let body={};
  try{body=await request.json()}catch{return reply({error:"INVALID_JSON"},400)}
  if(body?.method!=="service.request") return reply({error:"METHOD_NOT_SUPPORTED"},400);

  const p=body.params||{};
  const text=String(p.request||"").toLowerCase();
  const payroll=text.includes("salari")||text.includes("payroll")||text.includes("salar");
  if(!payroll) return reply({
    jsonrpc:"2.0",id:body.id,result:{status:"SERVICE_NOT_AVAILABLE"}
  });

  return reply({
    jsonrpc:"2.0",
    id:body.id,
    result:{
      event:"A2A_SELLER_RESPONSE",
      seller:"ECBTAX Seller Agent",
      provider:"ECBTAX",
      service:"payroll",
      country:"RO",
      status:"NEEDS_INFORMATION",
      question:"Pentru ce perioadă salarială?",
      evidence_status:"SELLER_ENDPOINT_RESPONDED",
      next_event:"A2A_QUESTION"
    }
  });
}
