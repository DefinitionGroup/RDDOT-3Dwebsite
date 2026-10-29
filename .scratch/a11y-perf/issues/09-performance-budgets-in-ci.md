# Performance budgets in CI

Status: ready-for-agent
Audit: P5
Blocked by: 04, 06

## Scope

A Playwright check against the production build CI already makes, on the phone profile of
the audit (latency 150 ms, 1.6 Mbit/s, CPU 4× through CDP): homepage LCP and CLS, the
homepage's own JavaScript, the configurator's bytes in its first 15 s without interaction,
its JavaScript and CLS, against the budgets in `audit.md`. A local build has no Sanity film
(demo mode serves it from `/public`), so the film's budget stays a check on the test site.
