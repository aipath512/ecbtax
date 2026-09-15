function canonical(v){
  if(Array.isArray(v)) return "["+v.map(canonical).join(",")+"]";
  if(v && typeof v==="object"){
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
  }
  return JSON.stringify(v);
}
async function sha256(text){
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function onRequestPost({request}){
  let body={};
  try{body=await request.json()}catch{return Response.json({error:"INVALID_JSON"},{status:400})}

  const evidence=body.evidence;
  const expected=String(body.evidence_sha256||"");
  if(!evidence || !expected) return Response.json({error:"EVIDENCE_REQUIRED"},{status:400});

  const actual=await sha256(canonical(evidence));
  const valid=actual===expected &&
    evidence.quote_id==="Q-1042" &&
    evidence.seller==="ECBTAX Seller Agent" &&
    evidence.human_approved===true &&
    evidence.seller_status==="ACCEPTED";

  return Response.json({
    event:"TRANSACTION_EVIDENCE_VERIFIED",
    verification:valid?"VERIFIED":"FAILED",
    evidence_sha256:actual
  },{status:valid?200:409});
}
