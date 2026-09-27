# Agent instructions

## Source of truth

- Read `docs/propuesta-tecnica.md` in full before implementation; it is the current project specification.
- Preserve the repository name, remote, and existing changes. Never overwrite unrelated work.
- Follow documented contracts and decisions. If ambiguity blocks the immediate change, cite the affected section and ask only about that decision.

## Roles and language

- Use English for all technical files and technical work: source code, identifiers, schemas, contracts, prompts used internally, agent instructions, engineering documentation, and operational interfaces for the technical operator.
- The influencer's primary language is Spanish. Every direct interaction with her must always be in Spanish, including skill questions, instructions, errors, explanations, and generated user-facing content. Do not switch her to English.
- The presenter onboarding skill is exclusive to the influencer's workflow. Invoking it sets presenter context; it does not authenticate a person or grant technical permissions. The technical operator does not use that skill for technical work.
- Do not infer who is using Codex from the conversation, device, or Git configuration. Keep requester attribution, declared artifact authorship, and Git commit identity distinct.
- Follow the responsibilities and human approval gates in the specification.

## Safety and scope

- Do not deploy AWS resources, connect social accounts, create real credentials, or publish content without explicit authorization.
- Never commit secrets, real videos, or sensitive real inventory data. Use fictional fixtures only.
- Use versioned contracts, schemas, and templates. Do not add free-form prompts or arbitrary command execution.
- AI proposes; validate outputs and preserve their sources. Skills cannot change locked facts or production state.
- When delegation is authorized, subagents produce candidates and do not modify official artifacts.

## Changes and validation

- Make incremental, reversible changes consistent with section 47 of the specification.
- Mark scaffolding as placeholders until its area is implemented.
- Run relevant validations and report commands, results, and limitations.
- Keep technical documentation in English. Keep all influencer-facing content in Spanish.
- Update documentation and record new technical decisions in `docs/decisions/`.
