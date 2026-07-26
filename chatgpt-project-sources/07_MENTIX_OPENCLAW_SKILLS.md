# Mentix, Hermes, and Optional OpenClaw Skills

Hermes should be the current agent-control layer for Mentix/Uygunops operations. Payload/Next remains the source of truth and execution layer. OpenClaw remains historical/optional unless explicitly reactivated.

Repo-side `mentix-skills/` files describe expected advisory behavior. They are not proof that a VPS or external agent has those files installed. Durable, PII-light decisions belong in the repository; secrets and raw customer data do not.

Start live-smoke planning with `/smokeplan`. Use `product-flow-debugger` for evidence-backed diagnostics and `mentix-intake` for structured intake guidance. Never execute an action based on confidence; confidence may change how much verification is recommended, never whether authorization is required. Content approval is only approval of copy. It is not approval to persist, queue, publish, dispatch, spend, or message a customer.

The optional OpenClaw reactivation checklist is `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`. Run `npm run test:openclaw-vps-verification` before any approved reactivation work. The legacy `scripts/vps-deploy.sh` refuses to run unless both `--reactivate-openclaw` and `--confirm-vps-sync` are provided. Do not copy skills, restart containers, or claim a live OpenClaw state without dated VPS evidence and operator approval.
