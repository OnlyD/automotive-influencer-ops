---
name: importar-inventario
description: Preview a local CSV inventory import and apply only the exact operator-approved preview ID and hash.
---

# Import local inventory

Use English for technical operator interaction. Read `docs/inventory-import.md` for the implemented CSV mapping, validation and command interface. Use fictional fixtures in repository tests; keep real source files and runtime state ignored.

Run preview first using the existing controlled inventory CLI. Present creates, updates, rejected rows and warnings. Apply only after the operator approves the exact preview ID/hash, using the same unchanged source and repository snapshot. Do not treat preview as mutation, import XLSX through the CSV path, expose VINs, invent column mappings or connect a dealership account.
