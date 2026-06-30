# UygunAyakkabi ChatGPT Project Source Pack

Last updated: 2026-06-30

Use this folder as the curated source set for the ChatGPT Project. Upload these files, not the full repo, raw chats, `.env`, credentials, screenshots, generated build files, or historical exports.

## Why This Exists

The project is worked on across ChatGPT, Codex, Claude, Obsidian, and the code repo. This source pack is the compact "current truth" layer so ChatGPT can catch up quickly when you manually refresh project files.

## Upload Rule

Upload every Markdown file in this folder. The pack is intentionally below the 20 document limit.

Current document count: 19

do not exceed 20 documents in this folder; merge or remove old files before adding more.

## Update Rule

Whenever Codex or Claude changes plans, architecture, active channels, bot roles, milestones, or major implementation status, update this folder too.

The most important files to keep fresh are:

- `01_CURRENT_TRUTH.md`
- `02_MASTER_ROADMAP.md`
- `04_BOTS_AND_AUTOMATIONS.md`
- `15_UPDATE_PROTOCOL_FOR_AI_AGENTS.md`
- `17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`

## Do Not Upload

- `.env`, `.env.local`, credentials, API keys, tokens
- raw chat transcripts
- `node_modules`
- `.next`, `tmp`, `sessions`, generated build output
- old exports unless explicitly needed for archaeology

## Source Priority

If this folder conflicts with old project-control exports or raw chats, this folder wins unless the user explicitly says otherwise.
