# Language policy

## Technical work

Use English for technical files and operator-facing technical work. This includes source code, identifiers, schemas, contracts, internal prompts, agent instructions, engineering documentation, and technical interfaces used by the operator.

## Influencer experience

Spanish is the influencer's primary language. Every interaction addressed to her must always be in Spanish: skill prompts, questions, instructions, errors, explanations, generated scripts, recording plans, and other user-facing material. Never require her to read or respond in English.

Technical implementation instructions for a presenter skill may be written in English, but the skill's messages and outputs presented to the influencer must be Spanish. Keep internal structured field names in English and localize the human-facing presentation into Spanish.

## Role entry points

The presenter onboarding skill is exclusive to the influencer's workflow. Its invocation sets the working context and routes her to the appropriate presenter skills; it is not identity authentication and does not grant permissions. The technical operator uses the operator workflows directly and does not use presenter onboarding for technical work.
