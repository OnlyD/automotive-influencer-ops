# CI

CI performs a frozen pnpm install on Node 24 LTS, installs FFmpeg/fonts, checks tracked files for bounded secret patterns and forbidden runtime/media, checks formatting, and runs builds, typechecks and tests including both synthetic complete production flows. No external account or publication is used. Secret patterns do not cover every credential or Git history. Reviewer identities and branch protection remain operator configuration.
