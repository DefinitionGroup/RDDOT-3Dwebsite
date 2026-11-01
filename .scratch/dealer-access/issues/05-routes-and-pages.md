# Routes and pages

Status: resolved
Type: task
Blocked by: 04

## Scope

- `GET /api/dealers`, `PUT|DELETE /api/projects/[projectId]/dealer-grant`,
  `GET /api/map/tiles[/z/x/y]`.
- Project routes a dealer may use resolve a `ProjectActor`; the others stay owner-only.
- `/configure`, `/anfrage` for dealers; `/haendler`; `/konto` sends dealers on.
- `haendler` reserved and private; API error codes in all three dictionaries.

## Comments
- 2026-10-30: the six Project routes a dealer may use resolve a `ProjectActor`; projects
  POST, rename, delete, lifecycle, duplicate, photos and the account stay owner-only and
  answer 401 to a dealer (checked in the browser). `/konto` sends a dealer to `/haendler`;
  a dealer of another Dealer gets 404 on the configurator page and the Project's APIs.
