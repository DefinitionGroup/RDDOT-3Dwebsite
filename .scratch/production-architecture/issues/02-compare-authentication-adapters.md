# Compare Customer Account authentication adapters

Type: research
Status: resolved
Blocked by: none
Map: ../map.md

## Question

Using current primary documentation, how do Clerk, Auth.js, Supabase Auth, and Shopify Customer Accounts compare for a Next.js App Router system that needs verified-email passwordless sign-in, secure sessions, account deletion, Guest Configuration claiming, application-owned Project data, EU operation, and a future but non-authoritative commerce adapter?

## Answer

[The primary-source comparison](../research/authentication-adapters.md) advances Supabase Auth in an EU project region as the conditional front-runner: Clerk lacks EU residency, Auth.js now recommends Better Auth for new builds, and Shopify Customer Accounts would make an undecided commerce platform authoritative for identity.
