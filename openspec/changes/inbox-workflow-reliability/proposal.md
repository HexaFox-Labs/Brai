# Inbox Workflow Reliability

## Summary

Repair preview identity sequences, make persisted Inbox workflow dispatch durable,
and make the required local Codex CLI text normalizer use its smallest supported,
schema-constrained execution path.

## Capabilities

- Keep copied preview identity sequences ahead of copied production IDs and fail
  deployment readiness when sequence state is unsafe.
- Treat a committed queued workflow execution as a durable dispatch obligation
  and continuously reconcile both queued and running Temporal state, not only at
  API startup.
- Keep non-domain technical logging from breaking an already committed Inbox
  ingest or rolling back a successful domain apply transaction.
- Normalize Inbox records without image work through the installed local Codex CLI
  with versioned output schema, isolated context, bounded latency, and explicit
  terminal failure.
- Preserve the definition/schema version pinned to an execution instead of
  silently relabelling in-flight v1 work as v2.

## Rationale

Preview data copy currently inserts production IDs without advancing owned
sequences. A subsequent technical log insert can fail after Inbox ingest commits,
prevent the Temporal start callback, and leave `AI-working` visible forever.
The normalizer must continue to run through the local Codex CLI. Its current call
does not pass the supported output-schema option and starts from the repository
working directory, so it loads irrelevant agent context for a tiny JSON task. The
repair must address correctness and latency without bypassing Codex or weakening
validation and AI audit logging.

## Delivery Guard

This is a runtime/product change. It must pass Postgres copy, API, Temporal,
OpenSpec, and live preview verification and finish through the preview flow.
