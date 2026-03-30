# Planning Workspace

This folder is a Codex-friendly adaptation of the `get-shit-done` install that was added under `C:\Users\Sahil\.claude`.

## What was installed globally

The `npx get-shit-done-cc@latest` command installed a Claude-oriented workflow system under `C:\Users\Sahil\.claude`:

- `commands/gsd/` for Claude slash commands such as `/gsd:new-project`
- `agents/` for Claude-specific subagent prompts
- `hooks/` for Claude lifecycle hooks such as prompt guards and statusline scripts
- `get-shit-done/templates/` and `get-shit-done/workflows/` for reusable planning docs and workflow guidance

## What is portable to this Codex workspace

The useful portable part is the planning model:

- `PROJECT.md` for product context and decisions
- `ROADMAP.md` for phased delivery
- `STATE.md` for current focus and working memory

## What is not portable as-is

These pieces are Claude-specific and are not automatically usable inside Codex:

- Slash commands in `C:\Users\Sahil\.claude\commands\gsd`
- Hook scripts referenced from `C:\Users\Sahil\.claude\settings.json`
- Claude agent prompt files in `C:\Users\Sahil\.claude\agents`

## How to use this folder in Codex

Use these files as the lightweight project operating system:

1. Keep product truth in `friendly-mail-prd.md`
2. Keep current project framing in `.planning/PROJECT.md`
3. Break execution into phases in `.planning/ROADMAP.md`
4. Keep near-term focus and open questions in `.planning/STATE.md`

## Source references

- Global install root: `C:\Users\Sahil\.claude`
- Product PRD: `C:\Users\Sahil\OneDrive\Desktop\Friendly Mail\friendly-mail-prd.md`
