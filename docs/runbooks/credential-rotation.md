# Credential rotation

## Symptoms

An external credential needs rotation during a later authorized cloud/provider increment.

## Diagnosis

Identify the authorized credential owner and provider; the current local simulator has no social credentials and no remote authentication.

## Safe action

Use the approved provider/secret-store procedure once configured. Never put a token in Git, n8n exports, operation inputs or audit notes. Do not invent a local rotation procedure for an unconfigured provider.

## Preserve

Audit evidence without secrets and unaffected publication records.

## Closure

The owner confirms replacement/revocation and a separately authorized access check succeeds.
