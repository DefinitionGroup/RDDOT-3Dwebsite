# Routes and pages

Status: ready-for-agent
Type: task
Blocked by: 04

## Scope

- `GET /api/dealers`, `PUT|DELETE /api/projects/[projectId]/dealer-grant`,
  `GET /api/map/tiles[/z/x/y]`.
- Project routes a dealer may use resolve a `ProjectActor`; the others stay owner-only.
- `/configure`, `/anfrage` for dealers; `/haendler`; `/konto` sends dealers on.
- `haendler` reserved and private; API error codes in all three dictionaries.

## Comments
