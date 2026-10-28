# Private analytics

Atlas sources and assets now live in public/. dist/ is generated deployment output.
Build with the Sites build helper; see HOSTING.md.

Owner-only dashboard: /admin/analytics. Native ChatGPT sign-in is checked server-side against the verified owner email stored in the ANALYTICS_OWNER_EMAIL runtime secret. The public Site audience stays public. No passwords or access tokens are shipped in client assets.

D1 stores random browser identifiers, page event IDs, session IDs, lecture numbers and timestamps. No names, emails, IP addresses, user agent strings, or arbitrary URLs are stored. Every event is retried with the same ID. Sessions group page openings separated by at most 30 minutes. Owner requests while signed in are excluded.

Daily dates use Asia/Riyadh. Overall unique browser counts use distinct IDs over the selected range, not summed daily uniques. Clearing site data or using another browser may create a new visitor. Historical traffic before activation is unavailable.

Validation: node --test test-analytics.mjs. Database schema and generated migrations are under db/ and drizzle/. Do not edit applied migrations.
