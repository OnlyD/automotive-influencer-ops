# ai-runner/src

The local CLI loads only registered workflow versions, validates inputs and outputs, and rejects requests from roles that the selected manifest does not allow. Its optional `--role` value is declarative workflow context, not authentication. Live execution requires a separately configured operator-provided Codex home.
