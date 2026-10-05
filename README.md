# SalonNext

SalonNext is a classroom prototype for independent Indian salons. A visitor enters a public Instagram username and a few salon details. The planner checks recent public posts when Instagram makes them available, then Gemini creates one filmable Reel plan with a hook, script, shots, caption and booking call to action.

## Functional website flow

- No Instagram password, Meta Login or private account access is required for the demo flow.
- The public scan can read post links, format, date, caption, image, likes and comments when those fields are exposed on the public page. Shares, saves, reach, views and audience demographics are not claimed without account permission.
- Missing public data is shown as unavailable; the planner does not turn missing values into zero or invent performance evidence.
- The response is one complete Reel plan, with an evidence receipt listing the public posts used and any verified search sources.
- Every successful plan is stored in `salonnext_requests` in Supabase. A signed, anonymous browser identifier lets the page show `X of 5 plans left` by counting that visitor's stored rows. No name, email, password or Instagram access token is stored in the table.

## Required environment variables

Set these only in Vercel Environment Variables:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SALONNEXT_SESSION_KEY` (kept for the unused legacy Meta callback files)
- `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` (kept for the unused legacy Meta callback files)

Run `supabase-schema.sql` once in the Supabase SQL editor. The service key is used only by `/api/recommend.js`; it is never sent to the browser.

## Limits and guardrails

The planner allows five successful plans per anonymous browser for the assignment demo. Gemini is instructed to treat captions and user notes as data, refuse prompt-injection or deceptive claims, avoid invented metrics and bookings, and label trend timing as a hypothesis when no verified source is available. The site is a classroom prototype and its suggestions are not performance guarantees.
