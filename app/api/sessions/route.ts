import { NextResponse } from "next/server";
import { AGENT_NAME, APP_BUILDER_PROMPT, getAnthropicKey, getOpenComputer } from "@/lib/opencomputer";
import type { OpenComputer } from "@opencomputer/sdk";

async function findAgentByName(oc: OpenComputer, name: string) {
  let cursor: string | undefined;

  do {
    const page = await oc.agents.list({ limit: 100, cursor });
    const existing = page.data.find((agent) => agent.name === name);
    if (existing) return existing;
    cursor = page.nextCursor || undefined;
  } while (cursor);

  return null;
}

async function ensureAppBuilderAgent(oc: OpenComputer, model: string) {
  const key = getAnthropicKey();
  const existing = await findAgentByName(oc, AGENT_NAME);

  if (existing) {
    return oc.agents.update(existing.id, {
      model,
      prompt: APP_BUILDER_PROMPT,
      key,
      limits: { turns: 8, turnSeconds: 900 },
    });
  }

  return oc.agents.create({
    name: AGENT_NAME,
    runtime: "claude",
    model,
    prompt: APP_BUILDER_PROMPT,
    key,
    limits: { turns: 8, turnSeconds: 900 },
  });
}

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt?: string };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const oc = getOpenComputer();
    const model = process.env.OC_AGENT_MODEL || "anthropic/claude-sonnet-4-6";
    const agent = await ensureAppBuilderAgent(oc, model);

    const session = await oc.sessions.create({
      agent: agent.id,
      input: [
        "Build this app as a running local web app in the session sandbox.",
        "When it is ready, say the preview URL if available.",
        "",
        prompt.trim(),
      ].join("\n"),
      limits: { turns: 8, turnSeconds: 900 },
    });

    return NextResponse.json({
      sessionId: session.id,
      clientToken: session.clientToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
