# Conversation History

This file summarizes the build conversation for the OpenComputer durable agent sessions Lovable-style POC.

## Initial Request

The user wanted a basic local proof of concept for a Lovable clone based on the OpenComputer Durable Agent Sessions SDK quickstart:

`https://docs.opencomputer.dev/agent-sessions/quickstart`

The user specifically did not want to use the direct REST API and wanted the TypeScript SDK instead.

## Documentation Reviewed

The implementation was based on these OpenComputer docs:

- Durable Agent Sessions quickstart
- Durable Agent Sessions API / SDK reference
- Events
- Claude runtime tools
- Build a Lovable Clone guide
- Session lifecycle
- Agent configuration
- Preview URL docs

Key SDK APIs used:

- `new OpenComputer({ apiKey })`
- `oc.agents.list(...)`
- `oc.agents.create(...)`
- `oc.agents.update(...)`
- `oc.sessions.create(...)`
- `connectSession({ sessionId, clientToken })`
- `live.events({ level: "progress" })`
- `live.steer(...)`

## Project Created

A fresh Next.js app was created in this repository. The app provides:

- A prompt box to start an app-builder session.
- A server API route that keeps OpenComputer and Anthropic keys server-side.
- A reusable OpenComputer agent named `local-lovable-session-poc`.
- Durable session creation from that agent.
- Browser-side live progress streaming via `connectSession`.
- Follow-up edit messages via `live.steer`.
- A preview panel that embeds an agent-reported HTTPS URL when one appears in the event stream.

Important files:

- `app/page.tsx`
- `app/api/sessions/route.ts`
- `app/styles.css`
- `lib/opencomputer.ts`
- `.env.example`

## Environment Keys

The user provided OpenComputer and Anthropic API keys for local testing.

Those keys were written to `.env.local`, which is ignored by git. They were not committed.

Committed example env file:

```bash
OPENCOMPUTER_API_KEY=osb_...
ANTHROPIC_API_KEY=sk-ant-...
OC_AGENT_MODEL=anthropic/claude-sonnet-4-6
```

## Model Change

The initial POC used the Opus model from the OpenComputer quickstart:

```text
anthropic/claude-opus-4-8
```

The user asked to switch to Sonnet to test faster runs. The app was updated to default to:

```text
anthropic/claude-sonnet-4-6
```

Because OpenComputer agent creation is idempotent only when the existing named agent has matching config, a later error occurred:

```text
agent name already used with a different config
```

The route was fixed to list existing agents first, find `local-lovable-session-poc` by name, and update it if it already exists. It only creates the agent when it does not exist.

## Current Session Flow

The app does not create a new agent on every follow-up.

Flow:

```text
Build app click
  -> server ensures reusable agent exists and has current config
  -> server creates a new durable session
  -> browser connects to that session with connectSession
  -> browser streams progress events
  -> browser sends follow-up edits to the same session with steer
```

The live event stream is SDK-managed session streaming, not an app-authored WebSocket.

## Verification

These commands were run successfully:

```bash
npm run typecheck
npm run build
```

The Next.js dev server was started locally at:

```text
http://localhost:3001
```

Port 3000 was already in use locally, so Next selected port 3001.

## Git And Push

A new git repository was initialized locally.

Initial commit:

```text
36bd7f5 Create OpenComputer Lovable POC
```

The repository was pushed to:

```text
git@github.com:motatoes/oc-sessions-test.git
```

Branch:

```text
main
```

## Notes And Limitations

- OpenComputer session artifacts/previews are documented as coming soon, so this POC extracts and embeds a URL only when the agent reports one in the event stream.
- Existing sessions keep their pinned model. Starting a new build session is required to test model changes.
- `.env.local`, `.next`, `node_modules`, and TypeScript build info are ignored.
