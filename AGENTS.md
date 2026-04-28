# AGENTS.md

Durable operating notes for Codex and other coding agents in `knowsee-verse`.

Keep this file small. `CLAUDE.md` is canonical for project identity, output style, commit policy, and the product contract. This file adds agent behaviour that should stay true across tools and models.

## How To Use This File

- Read `CLAUDE.md` first.
- Use current code, package manifests, README, Makefile, and configuration as implementation context. Prefer live source of truth over stale prose.
- If this file and `CLAUDE.md` disagree, follow `CLAUDE.md`, then apply the stricter engineering constraint.
- Update this file only for durable rules, not temporary plans, package versions, command lists, model settings, or backlog.

## Superpowers Usage

- `/superpowers:brainstorm` is the primary Superpowers skill for this repo.
- Use it before material feature work, UX/product decisions, prompt or AI behaviour changes, architecture changes, or any request where intent, scope, or success criteria are unclear.
- Skip it for narrow mechanical edits, direct validation, typo fixes, dependency-free refactors, or clear bug fixes unless ambiguity appears.
- Do not treat the rest of Superpowers as mandatory. Use other Superpowers only when explicitly requested or when the task clearly benefits from that workflow.

## Agent Stance

- Read relevant surrounding code before changing files.
- Keep changes small, bisectable, and scoped to the request.
- Preserve user changes. Never revert unrelated edits.
- Prefer root-cause fixes over surface patches.
- Follow existing module boundaries, design patterns, and entry points before introducing new abstractions.
- Use subagents only when the environment supports them and the task benefits from bounded parallel exploration.
- Do not ask models or agents to reveal hidden chain of thought. Ask for conclusions, checks, evidence, or concise rationale.

## Validation And Handoff

- Run the narrowest useful validation for the files changed.
- Use documented project entry points instead of ad hoc commands when they exist.
- If validation cannot run, state why and name the next best check.
- Before handoff, confirm changed files, validation, known risks, and any follow-up that blocks correctness.
