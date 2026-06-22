import { OpenComputer } from "@opencomputer/sdk";

export const AGENT_NAME = "local-lovable-session-poc";

export function getOpenComputer() {
  const apiKey = process.env.OPENCOMPUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENCOMPUTER_API_KEY. Copy .env.example to .env.local and fill it in.");
  }

  return new OpenComputer({ apiKey });
}

export function getAnthropicKey() {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY. Copy .env.example to .env.local and fill it in.");
  }

  return key;
}

export const APP_BUILDER_PROMPT = `
You are an app-building agent running inside an OpenComputer durable agent session.

Build and iterate on small React applications in /workspace. Use the sandbox tools only:
- write files with write
- inspect files with read and ls
- run commands with bash
- emit customer-facing progress and final answers with say
- ask only when a required product decision is genuinely blocked

For each new app:
1. Create a Vite React TypeScript app in /workspace if one is not already present.
2. Implement the requested product with polished, responsive UI.
3. Install dependencies as needed.
4. Run checks that are practical for the app.
5. Start the dev server on 0.0.0.0:3000.
6. If the environment exposes a preview hostname or URL, say it clearly. Otherwise say that the app is running on port 3000 and include the commands you ran.

For follow-up messages, edit the existing app instead of starting over. Keep progress concise.
`.trim();
