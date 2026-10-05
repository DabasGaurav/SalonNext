# SalonNext

SalonNext is a salon content-planning demo adapted from the CreatorOS recommendation flow. The public landing page stays at `/`; `/login.html` is a passwordless demo entry; `/app.html` is the separate working planner.

## What works

- Visitors enter any valid email to access the demo. The email stays in browser storage and is not sent to the API or stored in Supabase. This is not secure authentication.
- The planner accepts salon details, recent post captions and metrics, a CSV import, competitor observations, and niche context. A fictional sample is available for a quick walkthrough.
- The server calculates engagement from supplied Instagram reach, likes, comments, saves, and shares. It asks Gemini for current public web evidence when Google Search grounding is available, creates three salon-specific opportunities, ranks them using five weighted fit factors, and returns one complete Reel package.
- The result separates why the idea fits the salon from why it may be timely and shows public source links when verified sources were returned. Without those links, trend and competitor timing is labelled as a hypothesis.
- Supabase stores each request and response and supplies the public recommendation count shown in the planner. Five recommendations are allowed per browser identifier.

## Current boundaries

The planner uses **user-provided Instagram post data**. It does not connect directly to an Instagram account. CreatorOS uses Meta's official Instagram login and Graph API; a live account sync requires a configured Meta app, account permissions, and an OAuth flow. Competitor observations are user supplied or public web context, not competitor private analytics. Fit scores are heuristic estimates, not forecasts of bookings or engagement.

## Deployment

Vercel hosts the static pages and `/api/recommend`. The function requires `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` as Vercel environment variables. Keep their values out of the repository. Run `supabase-schema.sql` once in the Supabase SQL editor. No new table columns are required; full inputs and outputs use existing JSONB columns.

CSV headers: `caption,reach,likes,comments,saves,shares`. The planner accepts up to 30 posts per request.
