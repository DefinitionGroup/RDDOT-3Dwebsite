# Define incremental migration waves and rollback

Type: grilling
Status: open
Blocked by: 03, 06, 10, 11, 12, 13, 14, 15
Map: ../map.md

## Question

In what tracer-bullet order should the current prototype migrate to the target architecture, with compatibility windows, data migrations, acceptance gates, deployment cutovers, and rollback paths that preserve a working configurator throughout?

## Comments

- 2026-08-12: The migration sequence must include a narrow persistence foundation spike before locking dependency versions or building the full Project UI. It must verify fresh dbmate migrations, Better Auth-to-Customer Account mapping, concurrent autosave conflict, transactional revision/outbox behavior, Testcontainers/Neon-preview contract parity, and restore into ordinary Postgres.
