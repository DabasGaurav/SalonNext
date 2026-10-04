# SalonNext functional prototype

SalonNext is a working one-feature prototype for the GenAI assignment. It adapts CreatorOS's evidence-first recommendation flow into a salon use case: a visitor supplies a salon type, audience, recent post patterns and a goal; the serverless function asks Gemini for one structured Reel opportunity; Supabase stores the request and response; the page shows the total request count and the visitor's remaining demo cap.

## Required Vercel variables

Set these in Vercel Project Settings → Environment Variables. Values never belong in this repository:

`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

## Supabase table

Run `supabase-schema.sql` in the Supabase SQL Editor before testing. The service key is used only inside the Vercel function.

