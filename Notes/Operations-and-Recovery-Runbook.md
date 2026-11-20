# Operations and recovery runbook

This runbook records the current recovery and operational boundaries. It does
not authorize Production changes, define a customer-data retention period, or
confirm that a backup schedule has been configured.

## Database backup and recovery

- Neon history-window duration and snapshot scheduling depend on the project
  plan and configuration. Verify both in the Neon Console; do not assume a
  retention window or scheduled backup is active.
- Before a separately approved risky schema or data operation, confirm that
  the target branch and recovery point are correct and create an approved
  recovery point if the project's plan permits it. The RPO, RTO, snapshot
  frequency, and retention period have not been approved or recorded.
- For a suspected data incident, use Neon's read-only Time Travel Assist to
  inspect historical data and identify a recovery point before requesting a
  restore. Do not restore a branch based only on an approximate incident time.
- Neon's point-in-time restore applies to root branches, overwrites all
  databases and schema on the selected branch, and temporarily interrupts
  connections. Neon creates a backup branch of the pre-restore state. A
  database restore does not restore or roll back object-storage contents.
  Obtain explicit approval before restoring any shared or Production branch.
- After an approved restore, validate the restored schema and records, auth
  access, and media references against the separate object-storage state.
  Preserve the pre-restore branch until the owner confirms recovery.

See Neon's current
[instant restore guide](https://neon.com/docs/postgres/backup-restore/branch-restore)
and [backup and restore guide](https://neon.com/docs/guides/backup-restore).
Plan-dependent history and snapshot settings must be confirmed in the Console.

## Media uploads and orphan cleanup

- Upload-intent creation opportunistically sweeps at most five expired intents.
  An administrator can request a bounded sweep through
  [`POST /api/admin/media/uploads/cleanup`](../src/app/api/admin/media/uploads/cleanup/route.ts);
  it processes at most 100 expired intents per request and returns scanned,
  cleaned, and failed counts.
- The cleanup removes an expired staging object and removes the final object
  only if no `MediaAsset` row references it. Completed assets are preserved.
  Per-item failures remain retryable and are logged without storage error
  details.
- Upload completion/cancellation can also report `cleanupPending`. Retry
  cleanup through the existing guarded flow; do not delete objects or rows
  manually to make the status look successful.
- There is no automatic time-based deletion for unused `MediaAsset` records
  and no bucket-wide orphan purge. An unused asset may have been intentionally
  finalized for later attachment. Review each candidate in the protected media
  library and its database/storage references before using its explicit delete
  action.
- Neon PITR does not roll back S3-compatible storage. Before any database
  recovery, separately verify the bucket provider's versioning/backup
  capabilities and coordinate recovery of database references with the
  corresponding media objects. No bucket versioning or backup schedule is
  confirmed here.

Implementation references:
[upload cleanup](../src/lib/media-uploads.ts) and
[media deletion](../src/lib/admin-media-deletions.ts).

## Inquiry notification reconciliation

- Inquiry acceptance is durable independently of notification delivery. The
  outbox uses bounded retries and idempotency keys; the protected inbox shows
  each notification's status and sanitized failure code.
- The worker endpoint is currently restricted to isolated test configuration
  and the Resend simulator. There is no Production sender, scheduler, or
  callback/webhook endpoint. Do not set test mode in Production or manually
  replay customer notifications.
- For an isolated test, inspect the protected inbox state and use the worker
  only with the simulator. Investigate pending/retry/failed outcomes from the
  stored status and allowlisted error code; never log or export customer
  content, provider response bodies, credentials, or idempotency secrets.
- A Production reconciliation procedure is not active. It requires a separate
  approved delivery configuration, legal approval, and an explicitly
  authorized scheduling/replay decision.

Implementation references:
[notification processing](../src/lib/inquiry-notification-delivery.ts),
[test-only worker route](../src/app/api/internal/inquiry-notifications/route.ts),
and [notification configuration](../src/lib/inquiry-email-config.ts).

## Customer-data retention and deletion

- No inquiry retention period, anonymization rule, or deletion schedule has
  been approved. Section 09.05 remains a legal/business gate; do not infer a
  period from database fields, deployment defaults, or this runbook.
- No automatic inquiry or note cleanup is configured. Do not add a TTL,
  anonymize, export, or delete customer records until the approved policy and
  authorized deletion procedure are recorded.
- Deleting an inquiry cascades its authored notes and notification outbox row.
  Deleting its associated vehicle only removes the live vehicle relation while
  retaining the inquiry's historical vehicle snapshots. These effects must be
  considered in any future approved deletion procedure.
- The data import in Section 16.06 is separately blocked until approved source
  files and mappings are provided. No real-data import or Production operation
  is authorized by this runbook.

## Dependency and cost monitoring

- `GET /api/health` returns only aggregate `200`/`503` status. It checks the
  database, both configured media buckets, and delivery configuration; it
  never sends email or calls the delivery provider. The route and server error
  reporter log no dependency credentials, request data, exception messages,
  or customer content.
- Each readiness request queries Neon and sends read-only bucket-head requests.
  Avoid high-frequency polling: it can wake an autoscaled Neon compute and
  increase database/storage traffic. This route is not a substitute for
  detailed dependency diagnostics.
- Review sanitized application logs for request/readiness event categories and
  inspect Neon usage, compute activity, history-window settings, and storage
  provider usage through their respective consoles. This work does not add an
  external monitoring platform, alert policy, or cost budget.
- Production monitoring, restore drills, and any alert thresholds require
  approval after the Production deployment and backup plan are established.

## Open operational gates

- Section 09.05: legal/business approval for inquiry retention and deletion.
- Section 16.06: approved real stock/dealership/media source files and mapping.
- Section 16.11-16.15: Production environment separation, migration/recovery
  point, deployment, smoke test, and rollback evidence.

No Production database, bucket, deployment, email, snapshot, or restore action
was used while preparing this runbook.
