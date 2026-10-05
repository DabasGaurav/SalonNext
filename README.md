# SalonNext

SalonNext is a salon content-planning demo adapted from the CreatorOS recommendation flow. The public landing page stays at `/`; `/login.html` starts Instagram authorization; `/app.html` is the connected planner. `/app.html?demo=1` is a public sample-data mode so a grader can try the core feature without a Meta app role.

## What works

- Visitors connect a Business or Creator Instagram account using Meta's Instagram Login. The session token is encrypted in an HttpOnly cookie and is never exposed to browser JavaScript.
- The planner reads the connected account's recent posts and available media insights, then accepts salon details, competitor observations, and niche context. Unavailable metrics remain missing rather than being treated as zero.
- The server calculates engagement only for posts where Instagram supplied reach, likes, comments, saves, and shares. Uncaptioned posts remain uncaptioned. It asks Gemini for current public web evidence when Google Search grounding is available, creates three salon-specific opportunities, ranks them using five weighted fit factors, and returns one complete Reel package. If AI is unavailable, it returns a clearly labelled salon-service fallback.
- The result separates why the idea fits the salon from why it may be timely and shows public source links when verified sources were returned. Without those links, trend and competitor timing is labelled as a hypothesis.
- Supabase stores each request and response and supplies the public recommendation count shown in the planner. Five recommendations are allowed per connected Instagram account.
- Public sample mode uses six fictional salon posts, clearly labels them as illustrative, and limits each browser to five recommendations using an encrypted, HttpOnly visitor cookie. It still calls the same Gemini and Supabase workflow. This mode does not fetch the visitor's Instagram analytics.
- Instagram access tokens are encrypted in HttpOnly cookies, refreshed close to expiry where Meta permits, and cleared from the browser on sign-out. Users can reconnect if Meta denies a refresh.

## Current boundaries

Instagram data is available only to users permitted by the Meta app's current access level. The app is still in development mode, so ordinary visitors cannot complete account connection until Meta grants the required permissions and the app is published. Competitor observations are user supplied or public web context, not competitor private analytics. Fit scores are heuristic estimates, not forecasts of bookings or engagement. The account owner enters their target audience; SalonNext does not fetch Instagram audience demographics. User inputs and imported post metrics/captions are sent to Gemini and saved with outputs in Supabase; signing out does not erase those saved records. Before expanding access, provide a privacy policy and data-deletion process, and review retention.

## Deployment

Vercel hosts the static pages and API functions. The functions require `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `SALONNEXT_SESSION_KEY` (a random 32-byte base64 key), `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` as Vercel environment variables. Configure the Meta redirect URL as `https://salonnext-landing.vercel.app/api/auth/callback`. Keep secret values out of the repository. Run `supabase-schema.sql` once in the Supabase SQL editor. No new table columns are required; full inputs and outputs use existing JSONB columns.

The planner syncs up to 12 recent posts per request to keep Meta API use within a practical range.
