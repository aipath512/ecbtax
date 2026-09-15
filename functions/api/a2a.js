function reply(data,status=200){
  return Response.json(data,{status,headers:{
    "Access-Control-Allow-Origin":"https://aiventure.ro",
    "Access-Control-Allow-Headers":"content-type",
    "Access-Control-Allow-Methods":"POST,OPTIONS"
  }});
}

export async function onRequestOptions(){
  return reply({ok:true});
}

export async function onRequestPost({request}){
  let body={};

  try{
    body=await request.json();
  }catch{
    return reply({error:"INVALID_JSON"},400);
  }


  // =========================================================
  // STEP 1 — SERVICE REQUEST
  // =========================================================

  if(body?.method==="service.request"){
    const p=body.params||{};
    const text=String(p.request||"").toLowerCase();

    const payroll=
      text.includes("salari")||
      text.includes("payroll")||
      text.includes("salar");

    if(!payroll){
      return reply({
        jsonrpc:"2.0",
        id:body.id,
        result:{
          status:"SERVICE_NOT_AVAILABLE"
        }
      });
    }

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
        next_event:"A2A_QUESTION"
      }
    });
  }


  // =========================================================
  // STEP 2 — SERVICE ANSWER / QUOTE
  // =========================================================

  if(body?.method==="service.answer"){
    const p=body.params||{};

    if(!p.period){
      return reply({
        jsonrpc:"2.0",
        id:body.id,
        error:{
          code:-32602,
          message:"PERIOD_REQUIRED"
        }
      },400);
    }

    return reply({
      jsonrpc:"2.0",
      id:body.id,
      result:{
        event:"QUOTE_ISSUED",

        seller:"ECBTAX Seller Agent",
        provider:"ECBTAX",

        quote:{
          quote_id:"Q-1042",

          service:"Calcul salarial",
          country:"RO",
          employees:Number(p.employees||5),
          period:String(p.period),

          currency:"EUR",
          price_status:"COMMUNICATED",
          price:50,
          billing_period:"month",

          status:"AVAILABLE",
          human_approval_required:true
        },

        evidence_status:"SELLER_QUOTE_ISSUED",
        next_event:"BUYER_QUOTE_VERIFICATION"
      }
    });
  }


  // =========================================================
  // STEP 7/8 — HUMAN APPROVAL + QUOTE ACCEPTANCE + EVIDENCE
  // =========================================================

  if(body?.method==="quote.accept"){
    const p=body.params||{};
    const quoteId=String(p.quote_id||"").trim();

    if(!quoteId){
      return reply({
        jsonrpc:"2.0",
        id:body.id,
        error:{
          code:-32602,
          message:"QUOTE_ID_REQUIRED"
        }
      },400);
    }

    if(p.human_approved!==true){
      return reply({
        jsonrpc:"2.0",
        id:body.id,
        error:{
          code:-32602,
          message:"HUMAN_APPROVAL_REQUIRED"
        }
      },403);
    }

    if(quoteId!=="Q-1042"){
      return reply({
        jsonrpc:"2.0",
        id:body.id,
        error:{
          code:-32004,
          message:"QUOTE_NOT_FOUND"
        }
      },404);
    }

    return reply({
      jsonrpc:"2.0",
      id:body.id,
      result:{
        event:"QUOTE_ACCEPTED",

        quote_id:quoteId,

        seller:"ECBTAX Seller Agent",
        provider:"ECBTAX",

        status:"ACCEPTED",
        human_approved:true,

        accepted_at:new Date().toISOString(),

        evidence:{
          evidence_id:"EV-Q-1042",

          quote_id:quoteId,

          service:"Calcul salarial",
          employees:5,

          currency:"EUR",
          price:50,
          billing_period:"month",

          human_approved:true,
          seller_accepted:true,

          seller:"ECBTAX Seller Agent",
          buyer:"AiVenture Buyer Agent",

          status:"VERIFIED",

          generated_at:new Date().toISOString()
        },

        evidence_status:"VERIFIED",
        next_event:"TRANSACTION_VERIFIED"
      }
    });
  }


  // =========================================================
  // STEP 9A — ORDER CREATE / SELLER CONFIRMATION
  // =========================================================

  if(body?.method==="order.create"){
    const p=body.params||{};

    const evidenceId=String(p.evidence_id||"").trim();
    const quoteId=String(p.quote_id||"").trim();

    if(evidenceId!=="EV-Q-1042"){
      return reply({
        jsonrpc:"2.0",
        id:body.id,
        error:{
          code:-32602,
          message:"VERIFIED_EVIDENCE_REQUIRED"
        }
      },400);
    }

    if(quoteId!=="Q-1042"){
      return reply({
        jsonrpc:"2.0",
        id:body.id,
        error:{
          code:-32004,
          message:"QUOTE_NOT_FOUND"
        }
      },404);
    }

    return reply({
      jsonrpc:"2.0",
      id:body.id,
      result:{
        event:"ORDER_CONFIRMED",

        order_id:"ORD-1042",
        evidence_id:"EV-Q-1042",
        quote_id:"Q-1042",

        buyer:"AiVenture Buyer Agent",
        seller:"ECBTAX Seller Agent",
        provider:"ECBTAX",

        service:"Calcul salarial",
        employees:5,

        currency:"EUR",
        price:50,
        billing_period:"month",

        human_approved:true,
        transaction_verified:true,

        status:"CONFIRMED",
        execution_status:"READY_FOR_EXECUTION",

        created_at:new Date().toISOString(),

        next_event:"SERVICE_EXECUTION"
      }
    });
  }


  // =========================================================
  // UNKNOWN METHOD
  // =========================================================

  return reply({
    error:"METHOD_NOT_SUPPORTED"
  },400);
}
