# Managed EU Postgres platforms for rotpunkt Signature

Research date: 2026-08-11  
Scope: first-party transactional application data for Customer Account references, Projects, Configuration Revisions, AI Photo Jobs, Quote Requests, and later commerce-provider references.

## Answer first

**Neon in AWS Frankfurt (`eu-central-1`) is the best current fit for the first production architecture**, provided the application uses Neon as managed Postgres only and does not adopt Neon Auth or its Data API as domain boundaries. It matches a Next.js/serverless runtime, has native pooled connections, gives each preview deployment an isolated database branch, supports normal Postgres dump/restore and logical-replication exit paths, and has built-in point-in-time restore. Neon explicitly operates an AWS Europe (Frankfurt) region, and its PgBouncer endpoint is designed for large numbers of transient connections. Its Vercel integration can create a database branch per preview deployment. ([Neon regional status](https://neon.com/docs/introduction/status), [connection pooling](https://neon.com/docs/connect/connection-pooling), [branching](https://neon.com/docs/guides/branching-intro))

**Crunchy Bridge is the strongest portability-and-operations alternative.** It offers unmodified managed Postgres on AWS, Azure, or GCP; AWS Frankfurt and GCP Frankfurt are available; PgBouncer, ten days of physical backups, and PITR are included; and AWS/Azure backup archives can be downloaded. Its forks can be created through an API and even moved across cloud providers. The cost is a more traditional always-provisioned database and full-cluster forks, so it is less natural for cheap per-PR previews. ([regions and pricing](https://docs.crunchybridge.com/concepts/plans-pricing), [backups](https://docs.crunchybridge.com/concepts/backups), [fork API](https://docs.crunchybridge.com/api/cluster))

**Supabase is technically suitable but not the default recommendation for this system.** It has dedicated Postgres, exact EU regions, serverless pooling, migrations, and isolated preview branches. However, much of its value comes from the bundled Auth, Data API, Storage, Realtime, and Edge Functions that this architecture is deliberately keeping replaceable. It also makes production PITR a substantial add-on. Choose it only if the team consciously wants several of those bundled services, not merely because it includes Postgres. ([regions](https://supabase.com/docs/guides/platform/regions), [connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [branching](https://supabase.com/docs/guides/deployment/branching), [pricing](https://supabase.com/pricing))

**Amazon RDS for PostgreSQL is the control-heavy fallback, not the best first move.** It provides mature Multi-AZ operation, configurable automated backups, PITR, IAM/Secrets Manager integration, and several EU regions. But a production-quality setup also requires VPCs, security groups, credential handling, monitoring, failover choices, and usually RDS Proxy for bursty connections. RDS Proxy itself must be in the database VPC and cannot be public, so it complicates a separately hosted Next.js/serverless runtime. RDS has snapshots and restores, not a lightweight per-preview database branching workflow. ([AWS regions](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html), [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html), [RDS backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html))

This recommendation is intentionally not a final provider selection. The later platform-choice ticket should confirm the deployment host, recovery objectives, contractual EU-residency requirements, expected preview frequency, and operating budget before selecting Neon or Crunchy Bridge.

## Comparison

| Criterion | Neon | Crunchy Bridge | Supabase | AWS RDS for PostgreSQL |
| --- | --- | --- | --- | --- |
| EU location | AWS Frankfurt and Azure Frankfurt are listed operational regions. | AWS Frankfurt and GCP Frankfurt are selectable; other EU regions are available. | Select an exact AWS EU region such as Frankfurt, Ireland, Paris, or Stockholm. Do not use the generic Europe grouping for strict EU-only placement because the official docs say it can include London or Zurich. | Frankfurt, Ireland, Paris, Stockholm, Milan, and Spain are among available AWS regions. |
| Next.js/serverless connections | Managed PgBouncer transaction pool; official limit is up to 10,000 client connections. Use a direct endpoint for migrations and `pg_dump`. | Managed PgBouncer transaction pooling; dedicated compute stays provisioned. | Supavisor transaction mode is intended for serverless/edge traffic. Direct connections are IPv6 unless the paid IPv4 add-on is used; transaction mode does not support prepared statements. | Direct Postgres connections; RDS Proxy pools connections and handles surges, but is a separate paid VPC-only service. |
| Schema migrations | Provider-neutral migration files work. Run them over the direct URL, not the pooled URL. | Standard Postgres migration tooling works over the normal connection. | Supabase CLI stores SQL migrations in Git and can target a self-hosted database URL, but using an independent migration tool is also possible. | Standard Postgres migration tooling works. Infrastructure provisioning and database schema migration remain separate responsibilities. |
| Recovery | Instant restore within a configurable history window; current pricing tiers advertise seven-day and thirty-day windows. Normal `pg_dump`/`pg_restore` and logical replication provide exit and independent-copy paths. | Daily physical backups plus WAL, ten-day retention included, PITR to any minute, extended retention, and downloadable backup files on AWS/Azure. | Paid plans include daily-backup retention; PITR is a separately billed add-on with 7/14/28-day options. | Automated backups and PITR; retention is configurable from 0–35 days for an instance. Transaction logs are uploaded every five minutes. Manual snapshots can be retained separately. |
| Preview environments | Best-in-class for this use case: copy-on-write branches, API/CLI/GitHub automation, TTL/cleanup, and Vercel preview integration. Use schema-only or anonymized/synthetic data for customer-data safety. | Forks are API/CLI-addressable and can restore from a chosen time, but each fork is a separately provisioned and normally priced cluster. | Preview branches are isolated, data-less Supabase environments and can follow pull requests; schema migrations and seed files are applied. | A snapshot/PITR restore can create another instance, but this is slower and costlier than native database branching and needs custom CI cleanup. |
| Portability | Standard Postgres wire protocol; documented `pg_dump`/`pg_restore` and logical-replication migrations. Avoid Neon Auth/Data API and provider-only extensions in core tables. | Strongest: Crunchy states it uses native open-source Postgres, supports multiple clouds, downloadable backups on AWS/Azure, and cross-cloud forks/replication. | Standard Postgres underneath, but portability declines if the application depends on Supabase Auth schemas, Data APIs, Storage policies, Realtime, or Edge Functions. | Standard Postgres compatibility, but networking, IAM, Secrets Manager, snapshots, monitoring, and IaC are AWS-specific. |
| Operations | Lowest operational burden; autoscaling/scale-to-zero and multi-AZ storage are managed. Cold-start behavior and connection mode must be tested under the real runtime. | Managed dedicated instances, HA option, failover, monitoring, maintenance, and included PostgreSQL support. More predictable traditional behavior, but less elastic. | Dedicated project database plus a large managed backend bundle. Paid projects do not pause. The bundle increases service surface even when only Postgres is needed. | Highest burden of the shortlist but also highest infrastructure control. Multi-AZ, upgrades, proxy, monitoring, private networking, backups, and capacity all need explicit configuration. |
| Pricing shape and caveats | Usage-based compute plus database storage, history storage, network transfer, and branch allowances/overages. Longer restore windows and write-heavy history increase cost. Re-check the live calculator before provisioning. | Provisioned plan plus storage; official pricing currently starts around $9–$10/month, with backups, connection pooling, and transfer included. Full forks incur normal cluster pricing. Exact region/HA cost needs the calculator. | Pro currently starts at $25/month, includes compute credit, bills preview branches hourly, and lists 7-day PITR at about $100/month per project in addition to plan/compute costs. | Region-, class-, HA-, storage-, IOPS-, backup-, transfer-, and proxy-dependent. RDS Proxy is billed per vCPU-hour. Use the AWS Pricing Calculator; a single headline price is misleading. |

## Evidence and implications by platform

### 1. Neon

Neon is optimized for the exact development shape likely here: a Next.js application with transient runtime connections and isolated preview environments. Its PgBouncer endpoint uses transaction pooling and supports up to 10,000 client connections; Neon explicitly recommends a direct connection for ORM migrations and `pg_dump` because session-dependent operations do not belong on the pooled endpoint. ([connection pooling](https://neon.com/docs/connect/connection-pooling))

Neon branches are isolated, fast copy-on-write descendants. The official workflow supports API, CLI, GitHub Actions, and a branch per Vercel preview. This is materially better than pointing all previews at one shared staging database. Because a normal data branch copies the parent's data, previews containing Customer Account, Project, or Quote Request data must instead use schema-only branches with synthetic seeds, or a verified anonymization policy. ([branch workflow](https://neon.com/docs/get-started-with-neon/workflow-primer), [branching guide](https://neon.com/docs/guides/branching-intro))

Restore is based on retained database history and can recover a branch to an earlier point. Plan limits and storage billing vary with the configured restore window. Neon also documents migrations using `pg_dump`/`pg_restore` and logical replication, so there is a credible exit path. An independent encrypted logical export should still be part of the production recovery design; Neon itself notes that organizations may want periodic `pg_dump` backups in addition to PITR. ([project restore settings](https://neon.com/docs/manage/projects), [migration paths](https://neon.com/docs/import/migrate-intro), [PITR and independent backups](https://neon.com/blog/announcing-point-in-time-restore), [pricing](https://neon.com/pricing))

The architectural rule is important: **use Neon as Postgres, not as identity or commerce infrastructure**. Store an external identity subject such as `(identity_provider, provider_subject)` and external commerce references as opaque values. Do not let optional Neon Auth determine the Customer Account model.

### 2. Crunchy Bridge

Crunchy Bridge is the best alternative if predictable dedicated Postgres, downloadable physical backups, expert Postgres operations, or cloud portability matter more than serverless elasticity. It lists AWS Frankfurt and GCP Frankfurt, uses PgBouncer transaction pooling, and presents native Postgres rather than an application backend bundle. ([plans and regions](https://docs.crunchybridge.com/concepts/plans-pricing), [connection pooling](https://docs.crunchybridge.com/concepts/connection-pooling), [platform overview](https://www.crunchydata.com/products/crunchy-bridge))

Its recovery story is unusually strong at the entry tiers: daily physical backups and continuously archived WAL are included, ten days are retained by default, PITR creates a new fork, and AWS/Azure backups can be downloaded for off-platform storage or restoration. It also supports extended daily/weekly/monthly/yearly retention. ([backups](https://docs.crunchybridge.com/concepts/backups), [restore](https://docs.crunchybridge.com/how-to/restore-backups), [PITR](https://docs.crunchybridge.com/how-to/point-in-time-recovery))

Forks can be automated and created in a different provider/region, but they provision a complete new cluster, take longer than Neon's copy-on-write branch, and are billed like another cluster. This makes them good for staging, migration rehearsal, and incident recovery but less attractive for every short-lived pull request. ([fork API](https://docs.crunchybridge.com/api/cluster), [cluster operations](https://docs.crunchybridge.com/concepts/cluster-management))

### 3. Supabase

Supabase gives every project a dedicated Postgres database and offers a precise Frankfurt region. The region documentation contains an important compliance caveat: the generic Europe region may place data in London or Zurich, so a strict EU requirement should select `eu-central-1` or another exact EU member-state region. ([regions and data residency](https://supabase.com/docs/guides/platform/regions))

Its connection options cover persistent and serverless clients. For a Next.js serverless runtime, the Shared Pooler's transaction mode is the intended endpoint. Migrations and `pg_dump` use the direct endpoint; the direct endpoint is IPv6 unless the paid IPv4 add-on is enabled. Supavisor transaction mode does not support prepared statements, so driver settings must be tested. ([database connections](https://supabase.com/docs/guides/database/connecting-to-postgres))

Supabase Branching creates separate data-less environments with their own database and API credentials, applies migrations, and can seed preview data. This is safe by default for customer privacy but provisions the entire Supabase service stack rather than only a database branch. SQL migrations are versioned in Git and the CLI can address self-hosted Postgres, which helps portability. ([branching](https://supabase.com/docs/guides/deployment/branching), [database migrations](https://supabase.com/docs/guides/deployment/database-migrations), [CLI database URL support](https://supabase.com/docs/reference/cli/supabase-db-push))

The main concern is economic and architectural fit. The official pricing page currently lists branching per branch-hour and PITR starting around $100/month for seven days, while most of the platform's differentiation is in services that this project does not yet need. Supabase remains valid if a later decision intentionally selects its Storage, Auth, or Realtime capabilities; otherwise Neon or Crunchy Bridge gives a cleaner database-only boundary. ([pricing](https://supabase.com/pricing), [PITR billing](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery))

### 4. Amazon RDS for PostgreSQL

RDS is mature and regionally explicit. Frankfurt is an AWS region in Germany, and RDS can run Single-AZ or Multi-AZ deployments. Automated backup retention is configurable up to 35 days, and PITR creates a new instance from snapshots plus transaction logs. ([regions](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html), [backup retention](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html), [PITR](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html))

For a bursty serverless frontend, RDS Proxy pools and reuses database connections and improves failover behavior. But the proxy must be in the same VPC as its database and cannot be public. That is straightforward when the application runtime is also inside AWS networking and more involved when the web application is hosted elsewhere. The proxy, Secrets Manager, VPC endpoints, Multi-AZ standby, storage, backups, and data transfer are separately priced or configured. ([RDS Proxy behavior and constraints](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html), [RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/), [RDS Proxy pricing](https://aws.amazon.com/rds/proxy/pricing/))

RDS should move to the front only if a later deployment decision standardizes the whole system on AWS, requires AWS-native private networking/control, and assigns someone responsibility for database infrastructure. It is unnecessarily heavy for the current small team and prototype-to-production migration.

## Recommended production guardrails independent of provider

1. **Keep schema and migrations in the repository.** Use ordered SQL or an ORM migration format that produces inspectable SQL. Never edit production schema only through a vendor dashboard.
2. **Separate runtime and administrative connections.** Runtime uses a pooled least-privilege role. CI migration and backup jobs use a direct endpoint and distinct credentials.
3. **Keep identity and commerce references opaque.** The database stores Customer Account identity links and later commerce IDs; it does not adopt a provider's auth or order tables as the Project model.
4. **Use stable application interfaces.** Server-only repositories such as `ProjectRepository`, `PhotoJobRepository`, and `QuoteRequestRepository` hide SQL and provider connection details from React components and the 3D engine.
5. **Use exact EU regions.** Co-locate the web runtime, worker, database, and object storage in an EU member-state region where possible. Review the selected vendor's DPA and subprocessors before claiming full EU-only processing; a database region alone proves primary data location, not every support/control-plane processing path.
6. **Never clone customer PII into previews by default.** Use schema-only/data-less branches plus synthetic fixtures. Any production-derived preview needs an approved anonymization process and short TTL.
7. **Treat PITR and independent backup as separate controls.** Enable the provider's production PITR tier, add encrypted logical exports to a separate EU storage/account if the recovery policy calls for it, and run scheduled restore drills. A backup that has never been restored is unverified.
8. **Set explicit RPO/RTO before purchase.** The platform ticket should record retention, latest-restorable lag, recovery target, restoration ownership, and the acceptable outage/data-loss window.
9. **Do not use the database as the AI execution queue by accident.** Persist Photo Job state and idempotency in Postgres, but let the deployment/worker decision choose the delivery queue and retry mechanism.

## Selection gate for the later decision ticket

Choose **Neon** if all of the following hold:

- the web runtime is serverless or Vercel-like;
- per-PR isolated databases are valuable;
- Frankfurt satisfies the contractual data-location requirement;
- the team accepts usage-based/serverless compute behavior;
- the recovery plan includes a tested independent export where required.

Choose **Crunchy Bridge** instead if any of these dominate:

- downloadable provider-managed physical backups are mandatory;
- dedicated always-on Postgres is preferred over scale-to-zero;
- cross-cloud placement or direct Postgres-specialist support is important;
- previews can use synthetic local Postgres or fewer, longer-lived staging forks.

Choose **Supabase** only when the team intentionally wants its broader backend bundle. Choose **AWS RDS** only when the final deployment topology is AWS-native and the team accepts the additional infrastructure ownership.

## Pricing note

All pricing statements above are observations from official pages on the research date, not budget quotations. Provider prices, allowances, currencies, taxes, region multipliers, recovery add-ons, and beta features can change. The platform-choice ticket should compare two realistic monthly workloads in each live calculator: (1) launch traffic with production, staging, and average previews, and (2) a stress case including AI-job bursts, migrations, backups, and recovery retention.
