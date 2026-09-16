function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "https://aiventure.ro",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS"
    }
  });
}

export async function onRequestOptions() {
  return reply({ ok: true });
}

export async function onRequestPost({ request, env }) {

  // =========================================================
  // STEP 13D — VERIFY D1 BINDING
  // =========================================================

  if (!env.A2A_DB) {
    return reply({
      ok: false,
      event: "D1_BINDING_NOT_FOUND",
      expected_binding: "A2A_DB"
    }, 500);
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    return reply({
      ok: false,
      event: "INVALID_JSON"
    }, 400);
  }


  // =========================================================
  // GENERATE TEST TRANSACTION
  // =========================================================

  const now = new Date().toISOString();

  const transactionId =
    "TX-TEST-" +
    Date.now() +
    "-" +
    crypto.randomUUID().slice(0, 8);

  const eventId =
    "EVT-TEST-" +
    crypto.randomUUID();


  try {

    // =======================================================
    // WRITE 1 — TRANSACTION
    // =======================================================

    await env.A2A_DB
      .prepare(`
        INSERT INTO a2a_transactions (
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        transactionId,

        "AiVenture Buyer Agent",
        "ECBTAX Seller Agent",

        "D1 persistence test",
        String(body.period || "TEST"),
        Number(body.employees || 5),

        "EUR",
        50,

        0,
        0,
        0,

        "TEST",
        "D1_WRITE_TEST",

        now,
        now
      )
      .run();


    // =======================================================
    // WRITE 2 — EVENT
    // =======================================================

    const eventPayload = {
      event: "D1_WRITE_TEST",
      transaction_id: transactionId,
      source: "ECBTAX Seller Agent",
      test: true,
      created_at: now
    };

    await env.A2A_DB
      .prepare(`
        INSERT INTO a2a_events (
          event_id,
          transaction_id,
          event_type,
          payload_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        eventId,
        transactionId,
        "D1_WRITE_TEST",
        JSON.stringify(eventPayload),
        now
      )
      .run();


    // =======================================================
    // READ BACK — TRANSACTION
    // =======================================================

    const transaction = await env.A2A_DB
      .prepare(`
        SELECT *
        FROM a2a_transactions
        WHERE transaction_id = ?
      `)
      .bind(transactionId)
      .first();


    // =======================================================
    // READ BACK — EVENT
    // =======================================================

    const event = await env.A2A_DB
      .prepare(`
        SELECT *
        FROM a2a_events
        WHERE event_id = ?
      `)
      .bind(eventId)
      .first();


    // =======================================================
    // VERIFY PERSISTENCE
    // =======================================================

    const transactionPersisted =
      transaction?.transaction_id === transactionId;

    const eventPersisted =
      event?.event_id === eventId &&
      event?.transaction_id === transactionId;

    if (!transactionPersisted || !eventPersisted) {
      return reply({
        ok: false,
        event: "D1_PERSISTENCE_VERIFICATION_FAILED",

        transaction_id: transactionId,
        event_id: eventId,

        transaction_persisted: transactionPersisted,
        event_persisted: eventPersisted
      }, 500);
    }


    // =======================================================
    // STEP 13D — PASS
    // =======================================================

    return reply({
      ok: true,

      event: "D1_PERSISTENCE_VERIFIED",

      database: "ecbtax-a2a",
      binding: "A2A_DB",

      transaction_id: transactionId,
      event_id: eventId,

      transaction_persisted: true,
      event_persisted: true,

      transaction: transaction,
      audit_event: event,

      status: "PASS",

      next_event: "A2A_PERSISTENCE_INTEGRATION"
    });

  } catch (error) {

    return reply({
      ok: false,

      event: "D1_OPERATION_FAILED",

      database: "ecbtax-a2a",
      binding: "A2A_DB",

      error: String(error)
    }, 500);
  }
}
