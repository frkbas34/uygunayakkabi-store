# Current Decisions and Retirements

Current as of 2026-07-26.

- Payload/Next remains the source of truth for products, media, orders, leads, stock, bot events, jobs, and publishing state.
- Telegram operator flow is the primary engineering focus; image generation is the highest-priority subsystem.
- Protected-brand classification must never block AI image generation. The older image-generation gate recommendation is rejected. Brand safety remains at product/authenticity claims, human approval, activation, publishing, advertising, Shopier, and external dispatch.
- Hermes is the current agent-control layer for UygunAyakkabi/Mentix operations.
- OpenClaw is historical/optional unless the operator explicitly reactivates it.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are not part of the project anymore. They are retired and must not be reintroduced.
- SupplierScout is sleeping. SupplierScout is dormant; retained schema/routes do not authorize activation, cron, webhooks, or supplier-product work.
- n8n is optional glue. Do not build new workflows without a demonstrated current need.
- Shopier remains the checkout/sales bridge. Website-native checkout is deferred.
- Protected-brand catalog remediation is deferred. Existing downstream safety and dispatch guards remain, but records must not be automatically rewritten, unpublished, archived, redispatched, or removed.
- Manual ad support may draft and report; it may not create campaigns, pixels, provider calls, or spend.
- Runtime smokes require explicit read-only confirmation and a known target.
- Production claims require current evidence; local configuration is not proof.
