import { artifact } from "./engine.js";
import { presenterDocument } from "./documents.js";
import { createServer, type IncomingMessage } from "node:http";
import { pathToFileURL } from "node:url";
import { command, localOperations } from "./cli.js";
import { type Operations, OperationError } from "./engine.js";
export function createLocalServer(ops: Operations) {
  return createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    // Local operator simulator. No identity header can enable presenter access or external auth.
    if (
      req.headers.origin ||
      !["127.0.0.1", "localhost", "operations"].includes(
        (req.headers.host ?? "").split(":")[0],
      )
    ) {
      res.writeHead(403);
      res.end(JSON.stringify({ code: "LOCAL_ONLY" }));
      return;
    }
    try {
      if (req.method === "GET" && req.url === "/health") {
        res.end(
          JSON.stringify({
            status: "ok",
            mode: "local-simulation",
            livePublishing: false,
          }),
        );
        return;
      }
      if (req.method === "GET" && req.url === "/status") {
        const s = await ops.store.read();
        res.end(
          JSON.stringify({
            productions: s.productions,
            jobs: s.jobs.map((j) => ({
              jobId: j.jobId,
              status: j.status,
              attempt: j.attempt,
            })),
            artifactCount: s.artifacts.length,
          }),
        );
        return;
      }
      const documentPath = req.url?.match(
        /^\/presenter\/documents\/([a-z][a-zA-Z0-9_-]{0,95})\/([1-9][0-9]*)$/,
      );
      if (req.method === "GET" && documentPath) {
        const a = artifact(await ops.store.read(), {
          artifactId: documentPath[1],
          version: Number(documentPath[2]),
        });
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${a.artifactId}-${a.version}.docx"`,
        );
        res.end(await presenterDocument(a));
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(404);
        res.end(JSON.stringify({ code: "NOT_FOUND" }));
        return;
      }
      const body = await readBody(req);
      const presenterAction = req.url?.match(
        /^\/presenter\/(adapt|approve-creative|ingest|request-shooting-plan)$/,
      )?.[1];
      if (presenterAction) {
        const actor = {
          role: "presenter" as const,
          name: "local-presenter-simulator",
        };
        let result: unknown;
        if (presenterAction === "adapt")
          result = await ops.adapt(actor, body.artifact, body.changes);
        else if (presenterAction === "approve-creative")
          result = await ops.approve(
            actor,
            body.artifact,
            "CREATIVE",
            body.decision,
            body.notes,
          );
        else if (presenterAction === "ingest")
          result = await ops.ingest(
            actor,
            body.productionId,
            body.path,
            body.rights,
          );
        else
          result = await ops.enqueue(actor, {
            workflowId: "create-shooting-plan",
            workflowVersion: "1.0.0",
            productionId: body.productionId,
            idempotencyKey: body.idempotencyKey,
            input: { script: body.script, artifactId: body.artifactId },
          });
        res.end(JSON.stringify(result));
        return;
      }
      if (req.url === "/worker/tick") {
        if (Object.keys(body).length)
          throw new OperationError(
            "INVALID_INPUT",
            "Worker tick accepts no caller command.",
          );
        res.end(JSON.stringify(await ops.cycle()));
        return;
      }
      const action = req.url?.match(/^\/operations\/([a-z-]+)$/)?.[1];
      if (
        !action ||
        ![
          "create",
          "script",
          "bind-facts",
          "import-draft",
          "adapt",
          "approve",
          "transition",
          "ingest",
          "register-master",
          "render-plan",
          "enqueue",
          "retry",
          "schedule",
          "export-package",
          "record-publication",
          "metrics",
        ].includes(action)
      )
        throw new OperationError("NOT_FOUND", "Unknown controlled operation.");
      res.end(
        JSON.stringify(
          await command(
            ops,
            { role: "technical-operator", name: "local-operator-simulator" },
            action,
            body,
          ),
        ) ?? "null",
      );
    } catch (error) {
      const typed = error instanceof OperationError;
      res.writeHead(
        typed && error.code === "NOT_FOUND"
          ? 404
          : typed && error.code === "FORBIDDEN"
            ? 403
            : 400,
      );
      res.end(
        JSON.stringify({
          code: typed ? error.code : "INVALID_REQUEST",
          message: typed
            ? error.message
            : "Check the versioned input and operator diagnostics.",
        }),
      );
    }
  });
}
async function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  let content = "",
    size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000)
      throw new OperationError("INPUT_TOO_LARGE", "Maximum request is 1 MB.");
    content += chunk.toString();
  }
  const value = JSON.parse(content || "{}");
  if (!value || Array.isArray(value) || typeof value !== "object")
    throw new OperationError("INVALID_INPUT", "Expected an object.");
  return value;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.OPS_PORT ?? 4318);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid local port.");
  const host =
    process.env.OPS_CONTAINER_MODE === "local-compose"
      ? "0.0.0.0"
      : "127.0.0.1";
  createLocalServer(localOperations()).listen(port, host, () =>
    console.log(
      `Local operation simulator listening on ${host}:${port}. Live publishing is disabled.`,
    ),
  );
}
