# ADR-0013: Use explicit edit plans and approved manual publication for the pilot

- Status: Accepted for local implementation
- Date: 2026-09-30

## Context

Sections 35 and 39 require source-linked edits, rights review and per-platform publication gates. Fully automatic editing and complete direct social connectors are outside the initial scope. No publishing provider or accounts have been chosen.

## Decision

- Probe and hash copied originals; accept bounded local video, audio and still-image inputs with declared origin and rights evidence.
- Render explicit scene-aligned timelines with FFmpeg, producing 1080×1920 H.264/AAC MP4. Support source audio for promotional footage and a separate narration track for voice-over or silent media. Preserve originals.
- Generate subtitles from approved narration. Validate technical output; a human still reviews actual speech, readability, framing, pronunciation and factual/commercial content.
- Produce shooting plans deterministically from the approved script. Keep their registered contracts under `workflows/deterministic/` instead of generating new claims through an AI prompt.
- AI clip/caption/analysis workflows produce candidates only. A clip may require pickups; never manufacture clips to satisfy a quota. Deterministic extraction requires an operator-confirmed complete 15–35 second interval.
- Prepare platform-specific packages from reviewed copy and exact media versions. Require creative, factual, rights, technical, applicable commercial and publication approvals.
- Reconfirm commercial conditions and availability on publication day (UTC for this local adapter). Any changed confirmation or terms creates a new script version and requires review of dependent artifacts; unchanged media may be re-registered against the new approved script.
- Export a video, caption and operator handoff. Publishing is manual for the pilot. Record the operator-attested remote ID/URL/time afterward; registration does not query a platform or prove reachability.

## Consequences

The local workflow is ready to prepare a supervised trial without choosing a provider. `PROGRAMADO` records intent; it is not an autonomous scheduler and makes no guarantee of publication while the machine is off. Account setup, current platform review, real rights/consents, cloud deployment and automatic publishing each retain their human gates.

References: [FFmpeg documentation](https://ffmpeg.org/documentation.html), [official n8n Docker guidance](https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/README.md), and [TikTok Direct Post prerequisites](https://developers.tiktok.com/docs/en/content-posting-api-get-started). TikTok requires approval and authorization of the publishing scope; public visibility also depends on its client audit.
