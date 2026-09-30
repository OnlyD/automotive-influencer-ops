# Local orchestration

The pinned n8n image runs on a private Docker network with the local operation service. Host ports bind only to loopback. The workflow is imported **inactive**; enable polling only after reviewing local jobs. It calls one fixed worker endpoint and cannot supply commands, workflow definitions, prompts, or model configuration.

Requirements: Docker Compose, an exact reviewed source commit, and a writable ignored `.local/` directory for UID 1000. No Codex credentials are mounted. n8n stores its internal configuration in the `n8n_data` volume; preserve it when stopping containers.

```bash
mkdir -p .local
OPS_SOURCE_COMMIT="$(git rev-parse HEAD)" docker compose -f automation/n8n/docker-compose.yml up --build -d
OPS_SOURCE_COMMIT="$(git rev-parse HEAD)" automation/n8n/scripts/import-workflow.sh
```

Open the local n8n editor on port 5678 and manually execute the imported workflow to process one pending job. The operator may later activate its polling trigger. Stop with `docker compose ... down`; never add `-v` unless deleting n8n state is explicitly intended.

This is an operator-only local simulator, without remote presenter authentication. It is not an AWS substitute or an always-available service. It does not contact social platforms, run Codex, schedule operating-system tasks, or publish media. The Node CLI worker is also supported without Docker: `pnpm operations -- work-once`.

References: [official n8n Docker guidance](https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/README.md) and [n8n releases](https://github.com/n8n-io/n8n/releases).
