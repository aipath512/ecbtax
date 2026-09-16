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

function makeId(prefix){
  return `${prefix}-${crypto.randomUUID()
    .replaceAll("-","")
    .slice(0,12)
    .toUpperCase()}`;
}

async function eventLog(db,txId,type,payload){
  const at=new Date().toISOString();

  await db.prepare(`
    INSERT INTO a2a_events(
      event_id,
      transaction_id,
      event_type,
      payload_json,
      created_at
    )
    VALUES(?,?,?,?,?)
  `)
  .bind(
    makeId("EVT"),
    txId,
    type,
    JSON.stringify(payload),
    at
  )
  .run();
}

async function byTx(db,id){
  return db.prepare(`
    SELECT *
    FROM a2a_transactions
    WHERE transaction_id=?
  `).bind(id).first();
}

async function byQuote(db,id){
  return db.prepare(`
    SELECT *
    FROM a2a_transactions
    WHERE quote_id=?
  `).bind(id).first();
}

async function byOrder(db,id){
  return db.prepare(`
    SELECT *
    FROM a2a_transactions
    WHERE order_id=?
  `).bind(id).first();
}

async function byJob(db,id){
  return db.prepare(`
    SELECT *
    FROM a2a_transactions
    WHERE job_id=?
  `).bind(id).first();
}


export async function onRequestPost({request,env}){

  let body={};

  try{
    body=await request.json();
  }catch{
    return reply({
      error:"INVALID_JSON"
    },400);
  }


  // =========================================================
  // D1 BINDING
  // =========================================================

  if(!env.A2A_DB){
    return reply({
      jsonrpc:"2.0",
      id:body?.id??null,
      error:{
        code:-32050,
        message:"A2A_DB_BINDING_NOT_FOUND"
      }
    },500);
  }

  const db=env.A2A_DB;


  try{

    // =========================================================
    // STEP 1 — SERVICE REQUEST
    // CREATE PERSISTENT TRANSACTION
    // =========================================================

    if(body?.method==="service.request"){

      const p=body.params||{};

      const text=
        String(p.request||"")
        .toLowerCase();

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


      const txId=makeId("TX");

      const at=
        new Date().toISOString();

      const employees=
        Number(p.employees||5);


      await db.prepare(`
        INSERT INTO a2a_transactions(
          transaction_id,

          buyer,
          seller,

          service,
          period,
          employees,

          currency,
          price,

          human_approved,
          transaction_verified,
          delivery_verified,

          status,
          current_event,

          created_at,
          updated_at
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .bind(
        txId,

        "AiVenture Buyer Agent",
        "ECBTAX Seller Agent",

        "Calcul salarial",
        null,
        employees,

        "EUR",
        50,

        0,
        0,
        0,

        "NEEDS_INFORMATION",
        "A2A_SELLER_RESPONSE",

        at,
        at
      )
      .run();


      await eventLog(
        db,
        txId,
        "A2A_SELLER_RESPONSE",
        {
          transaction_id:txId,
          status:"NEEDS_INFORMATION"
        }
      );


      return reply({
        jsonrpc:"2.0",
        id:body.id,

        result:{
          event:"A2A_SELLER_RESPONSE",

          transaction_id:txId,

          seller:"ECBTAX Seller Agent",
          provider:"ECBTAX",

          service:"payroll",
          country:"RO",

          status:"NEEDS_INFORMATION",

          question:
            "Pentru ce perioadă salarială?",

          next_event:"A2A_QUESTION"
        }
      });

    }



    // =========================================================
    // STEP 2 — SERVICE ANSWER / QUOTE
    // =========================================================

    if(body?.method==="service.answer"){

      const p=body.params||{};

      const txId=
        String(p.transaction_id||"").trim();


      if(!txId){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32602,
            message:"TRANSACTION_ID_REQUIRED"
          }
        },400);

      }


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


      const tx=
        await byTx(db,txId);


      if(!tx){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"TRANSACTION_NOT_FOUND"
          }
        },404);

      }


      const quoteId=
        tx.quote_id||
        makeId("Q");


      const employees=
        Number(
          p.employees||
          tx.employees||
          5
        );


      const period=
        String(p.period);


      const at=
        new Date().toISOString();


      await db.prepare(`
        UPDATE a2a_transactions

        SET
          quote_id=?,
          period=?,
          employees=?,

          status='QUOTE_ISSUED',
          current_event='QUOTE_ISSUED',

          updated_at=?

        WHERE transaction_id=?
      `)
      .bind(
        quoteId,
        period,
        employees,
        at,
        txId
      )
      .run();


      await eventLog(
        db,
        txId,
        "QUOTE_ISSUED",
        {
          transaction_id:txId,
          quote_id:quoteId,
          period,
          employees,
          price:50,
          currency:"EUR"
        }
      );


      return reply({
        jsonrpc:"2.0",
        id:body.id,

        result:{
          event:"QUOTE_ISSUED",

          transaction_id:txId,

          seller:"ECBTAX Seller Agent",
          provider:"ECBTAX",

          quote:{
            quote_id:quoteId,

            service:"Calcul salarial",
            country:"RO",

            employees,
            period,

            currency:"EUR",

            price_status:"COMMUNICATED",
            price:50,

            billing_period:"month",

            status:"AVAILABLE",

            human_approval_required:true
          },

          evidence_status:
            "SELLER_QUOTE_ISSUED",

          next_event:
            "BUYER_QUOTE_VERIFICATION"
        }
      });

    }



    // =========================================================
    // STEP 7/8 — QUOTE ACCEPTANCE
    // HUMAN APPROVAL + EVIDENCE
    // =========================================================

    if(body?.method==="quote.accept"){

      const p=body.params||{};

      const quoteId=
        String(p.quote_id||"").trim();


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


      const tx=
        await byQuote(db,quoteId);


      if(!tx){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"QUOTE_NOT_FOUND"
          }
        },404);

      }


      const evidenceId=
        tx.evidence_id||
        makeId("EV");


      const at=
        new Date().toISOString();


      await db.prepare(`
        UPDATE a2a_transactions

        SET
          evidence_id=?,

          human_approved=1,
          transaction_verified=1,

          status='ACCEPTED',
          current_event='QUOTE_ACCEPTED',

          updated_at=?

        WHERE transaction_id=?
      `)
      .bind(
        evidenceId,
        at,
        tx.transaction_id
      )
      .run();


      await eventLog(
        db,
        tx.transaction_id,
        "QUOTE_ACCEPTED",
        {
          transaction_id:
            tx.transaction_id,

          quote_id:
            quoteId,

          evidence_id:
            evidenceId,

          human_approved:true
        }
      );


      return reply({
        jsonrpc:"2.0",
        id:body.id,

        result:{
          event:"QUOTE_ACCEPTED",

          transaction_id:
            tx.transaction_id,

          quote_id:
            quoteId,

          seller:
            tx.seller,

          provider:"ECBTAX",

          status:"ACCEPTED",

          human_approved:true,

          accepted_at:at,

          evidence:{
            evidence_id:
              evidenceId,

            quote_id:
              quoteId,

            service:
              tx.service,

            employees:
              tx.employees,

            currency:
              tx.currency,

            price:
              tx.price,

            billing_period:
              "month",

            human_approved:true,
            seller_accepted:true,

            seller:
              tx.seller,

            buyer:
              tx.buyer,

            status:"VERIFIED",

            generated_at:at
          },

          evidence_status:"VERIFIED",

          next_event:
            "TRANSACTION_VERIFIED"
        }
      });

    }



    // =========================================================
    // STEP 9 — ORDER CREATE
    // =========================================================

    if(body?.method==="order.create"){

      const p=body.params||{};

      const quoteId=
        String(p.quote_id||"").trim();

      const evidenceId=
        String(p.evidence_id||"").trim();


      const tx=
        await byQuote(db,quoteId);


      if(!tx){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"QUOTE_NOT_FOUND"
          }
        },404);

      }


      if(
        evidenceId!==tx.evidence_id ||
        tx.transaction_verified!==1
      ){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32602,
            message:
              "VERIFIED_EVIDENCE_REQUIRED"
          }
        },400);

      }


      const orderId=
        tx.order_id||
        makeId("ORD");


      const at=
        new Date().toISOString();


      await db.prepare(`
        UPDATE a2a_transactions

        SET
          order_id=?,

          status='CONFIRMED',
          current_event='ORDER_CONFIRMED',

          updated_at=?

        WHERE transaction_id=?
      `)
      .bind(
        orderId,
        at,
        tx.transaction_id
      )
      .run();


      await eventLog(
        db,
        tx.transaction_id,
        "ORDER_CONFIRMED",
        {
          transaction_id:
            tx.transaction_id,

          order_id:
            orderId,

          quote_id:
            quoteId,

          evidence_id:
            evidenceId
        }
      );


      return reply({
        jsonrpc:"2.0",
        id:body.id,

        result:{
          event:"ORDER_CONFIRMED",

          transaction_id:
            tx.transaction_id,

          order_id:
            orderId,

          evidence_id:
            evidenceId,

          quote_id:
            quoteId,

          buyer:
            tx.buyer,

          seller:
            tx.seller,

          provider:"ECBTAX",

          service:
            tx.service,

          employees:
            tx.employees,

          currency:
            tx.currency,

          price:
            tx.price,

          billing_period:"month",

          human_approved:true,
          transaction_verified:true,

          status:"CONFIRMED",

          execution_status:
            "READY_FOR_EXECUTION",

          created_at:at,

          next_event:
            "SERVICE_EXECUTION"
        }
      });

    }



    // =========================================================
    // STEP 10 — SERVICE EXECUTION
    // =========================================================

    if(body?.method==="service.execute"){

      const p=body.params||{};

      const orderId=
        String(p.order_id||"").trim();

      const quoteId=
        String(p.quote_id||"").trim();

      const evidenceId=
        String(p.evidence_id||"").trim();


      const tx=
        await byOrder(db,orderId);


      if(!tx){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"ORDER_NOT_FOUND"
          }
        },404);

      }


      if(quoteId!==tx.quote_id){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"QUOTE_NOT_FOUND"
          }
        },404);

      }


      if(
        evidenceId!==tx.evidence_id ||
        tx.transaction_verified!==1
      ){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32602,
            message:
              "VERIFIED_EVIDENCE_REQUIRED"
          }
        },400);

      }


      const jobId=
        tx.job_id||
        makeId("JOB");


      const at=
        new Date().toISOString();


      await db.prepare(`
        UPDATE a2a_transactions

        SET
          job_id=?,

          status='IN_PROGRESS',
          current_event='EXECUTION_STARTED',

          updated_at=?

        WHERE transaction_id=?
      `)
      .bind(
        jobId,
        at,
        tx.transaction_id
      )
      .run();


      await eventLog(
        db,
        tx.transaction_id,
        "EXECUTION_STARTED",
        {
          transaction_id:
            tx.transaction_id,

          job_id:
            jobId,

          order_id:
            orderId
        }
      );


      return reply({
        jsonrpc:"2.0",
        id:body.id,

        result:{
          event:"EXECUTION_STARTED",

          transaction_id:
            tx.transaction_id,

          job_id:
            jobId,

          order_id:
            orderId,

          quote_id:
            quoteId,

          evidence_id:
            evidenceId,

          buyer:
            tx.buyer,

          seller:
            tx.seller,

          provider:"ECBTAX",

          service:
            tx.service,

          employees:
            tx.employees,

          currency:
            tx.currency,

          price:
            tx.price,

          billing_period:"month",

          order_status:"CONFIRMED",

          execution_status:
            "IN_PROGRESS",

          transaction_verified:true,
          human_approved:true,

          started_at:at,

          status:"IN_PROGRESS",

          next_event:"SERVICE_RESULT"
        }
      });

    }



    // =========================================================
    // STEP 11 — SERVICE RESULT / DELIVERY
    // =========================================================

    if(body?.method==="service.result"){

      const p=body.params||{};

      const jobId=
        String(p.job_id||"").trim();

      const orderId=
        String(p.order_id||"").trim();

      const evidenceId=
        String(p.evidence_id||"").trim();


      const tx=
        await byJob(db,jobId);


      if(!tx){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"JOB_NOT_FOUND"
          }
        },404);

      }


      if(orderId!==tx.order_id){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"ORDER_NOT_FOUND"
          }
        },404);

      }


      if(evidenceId!==tx.evidence_id){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32602,
            message:
              "VERIFIED_EVIDENCE_REQUIRED"
          }
        },400);

      }


      const resultId=
        tx.result_id||
        makeId("RES");


      const deliveryEvidenceId=
        tx.delivery_evidence_id||
        makeId("DEL-EV");


      const at=
        new Date().toISOString();


      await db.prepare(`
        UPDATE a2a_transactions

        SET
          result_id=?,
          delivery_evidence_id=?,

          delivery_verified=1,

          status='COMPLETED',
          current_event='SERVICE_RESULT',

          updated_at=?

        WHERE transaction_id=?
      `)
      .bind(
        resultId,
        deliveryEvidenceId,
        at,
        tx.transaction_id
      )
      .run();


      await eventLog(
        db,
        tx.transaction_id,
        "SERVICE_RESULT",
        {
          transaction_id:
            tx.transaction_id,

          result_id:
            resultId,

          delivery_evidence_id:
            deliveryEvidenceId,

          job_id:
            jobId,

          order_id:
            orderId
        }
      );


      return reply({
        jsonrpc:"2.0",
        id:body.id,

        result:{
          event:"SERVICE_RESULT",

          transaction_id:
            tx.transaction_id,

          job_id:
            jobId,

          order_id:
            orderId,

          quote_id:
            tx.quote_id,

          evidence_id:
            tx.evidence_id,

          buyer:
            tx.buyer,

          seller:
            tx.seller,

          provider:"ECBTAX",

          service:
            tx.service,

          employees:
            tx.employees,

          status:"COMPLETED",

          execution_status:
            "COMPLETED",

          result:{
            result_id:
              resultId,

            type:
              "PAYROLL_DEMO_RESULT",

            description:
              "Rezultat demonstrativ pentru validarea fluxului A2A. Nu reprezintă un calcul salarial real.",

            period:
              tx.period,

            employees:
              tx.employees,

            deliverable:{
              format:
                "application/json",

              status:
                "DELIVERED"
            }
          },

          delivery_evidence:{
            delivery_evidence_id:
              deliveryEvidenceId,

            job_id:
              jobId,

            order_id:
              orderId,

            result_id:
              resultId,

            seller:
              tx.seller,

            buyer:
              tx.buyer,

            delivered:true,
            verified:true,

            delivered_at:at,

            status:"VERIFIED"
          },

          completed_at:at,

          next_event:"BUYER_RECEIPT"
        }
      });

    }



    // =========================================================
    // STEP 12 — TRANSACTION RECEIPT / AUDIT COMPLETE
    // =========================================================

    if(body?.method==="transaction.receipt"){

      const p=body.params||{};

      const orderId=
        String(p.order_id||"").trim();

      const jobId=
        String(p.job_id||"").trim();

      const resultId=
        String(p.result_id||"").trim();

      const deliveryEvidenceId=
        String(
          p.delivery_evidence_id||""
        ).trim();


      const tx=
        await byOrder(db,orderId);


      if(!tx){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"ORDER_NOT_FOUND"
          }
        },404);

      }


      if(jobId!==tx.job_id){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"JOB_NOT_FOUND"
          }
        },404);

      }


      if(resultId!==tx.result_id){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32004,
            message:"RESULT_NOT_FOUND"
          }
        },404);

      }


      if(
        deliveryEvidenceId!==
          tx.delivery_evidence_id ||

        tx.delivery_verified!==1
      ){

        return reply({
          jsonrpc:"2.0",
          id:body.id,

          error:{
            code:-32602,
            message:
              "DELIVERY_EVIDENCE_REQUIRED"
          }
        },400);

      }


      const receiptId=
        tx.receipt_id||
        makeId("RCP");


      const at=
        new Date().toISOString();


      await db.prepare(`
        UPDATE a2a_transactions

        SET
          receipt_id=?,

          status='COMPLETE',
          current_event='AUDIT_COMPLETE',

          updated_at=?

        WHERE transaction_id=?
      `)
      .bind(
        receiptId,
        at,
        tx.transaction_id
      )
      .run();


      await eventLog(
        db,
        tx.transaction_id,
        "TRANSACTION_RECEIPT_ISSUED",
        {
          transaction_id:
            tx.transaction_id,

          receipt_id:
            receiptId
        }
      );


      await eventLog(
        db,
        tx.transaction_id,
        "AUDIT_COMPLETE",
        {
          transaction_id:
            tx.transaction_id,

          receipt_id:
            receiptId,

          status:"COMPLETE"
        }
      );


      return reply({
        jsonrpc:"2.0",
        id:body.id,

        result:{
          event:
            "TRANSACTION_RECEIPT_ISSUED",

          transaction_id:
            tx.transaction_id,

          receipt_id:
            receiptId,

          quote_id:
            tx.quote_id,

          evidence_id:
            tx.evidence_id,

          order_id:
            tx.order_id,

          job_id:
            tx.job_id,

          result_id:
            tx.result_id,

          delivery_evidence_id:
            tx.delivery_evidence_id,

          buyer:
            tx.buyer,

          seller:
            tx.seller,

          provider:"ECBTAX",

          service:
            tx.service,

          period:
            tx.period,

          employees:
            tx.employees,

          currency:
            tx.currency,

          price:
            tx.price,

          billing_period:"month",

          human_approved:true,
          transaction_verified:true,
          delivery_verified:true,

          status:"COMPLETE",

          audit_status:"VERIFIED",

          issued_at:at,

          audit_trail:{

            quote:{
              id:tx.quote_id,
              status:"ACCEPTED"
            },

            transaction_evidence:{
              id:tx.evidence_id,
              status:"VERIFIED"
            },

            order:{
              id:tx.order_id,
              status:"CONFIRMED"
            },

            execution:{
              job_id:tx.job_id,
              status:"COMPLETED"
            },

            result:{
              id:tx.result_id,
              type:
                "PAYROLL_DEMO_RESULT",
              status:"COMPLETED"
            },

            delivery:{
              evidence_id:
                tx.delivery_evidence_id,

              delivered:true,
              verified:true,

              status:"VERIFIED"
            }
          },

          next_event:"AUDIT_COMPLETE"
        }
      });

    }



    // =========================================================
    // UNKNOWN METHOD
    // =========================================================

    return reply({
      error:"METHOD_NOT_SUPPORTED"
    },400);


  }catch(error){

    return reply({
      jsonrpc:"2.0",

      id:
        body?.id??null,

      error:{
        code:-32050,

        message:
          "A2A_PERSISTENCE_ERROR",

        detail:
          String(error)
      }
    },500);

  }
}
