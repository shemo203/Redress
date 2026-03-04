# ADR 0001: Expo + Supabase Stack

## Status
Accepted

## Context
The MVP needs authenticated users, structured content, simple relational constraints, link safety handling, outbound click logging, and reporting. The repo should stay lean and avoid unnecessary moving parts.

## Decision
Use Expo for the client app and Expo Router for route structure. Use Supabase for authentication, database, and related backend services.

## Consequences
- Expo Router keeps navigation and route ownership explicit.
- Supabase fits the MVP data constraints, especially auth and relational rules.
- Feature modules can isolate auth, posts, tags, grades, links, analytics, and reporting.
- This decision does not add scope beyond the MVP rules.
