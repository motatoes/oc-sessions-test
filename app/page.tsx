"use client";

import { connectSession } from "@opencomputer/sdk";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type SessionEvent = {
  id?: string;
  seq?: number;
  ts?: string;
  type: string;
  level?: string;
  body?: Record<string, unknown>;
};

type SessionState = {
  sessionId: string;
  clientToken: string;
};

const starterPrompt =
  "Build a concise project management app with a Kanban board, task priorities, search, and local storage.";

function eventText(event: SessionEvent) {
  const body = event.body || {};
  if (typeof body.text === "string") return body.text;
  if (typeof body.summary === "string") return body.summary;
  if (typeof body.argsSummary === "string") return body.argsSummary;
  if (typeof body.args_summary === "string") return body.args_summary;
  if (typeof body.command === "string") return body.command;
  if (typeof body.yieldReason === "string") return body.yieldReason;
  if (typeof body.yield_reason === "string") return body.yield_reason;
  return JSON.stringify(body);
}

function findUrl(events: SessionEvent[]) {
  const text = events.map(eventText).join("\n");
  return text.match(/https:\/\/[^\s)>"']+/)?.[0] || "";
}

function classForType(type: string) {
  if (type.startsWith("turn.")) return "eventBadge turn";
  if (type.startsWith("agent.")) return "eventBadge agent";
  if (type.startsWith("tool.") || type.startsWith("exec.")) return "eventBadge tool";
  if (type.startsWith("error.")) return "eventBadge error";
  return "eventBadge";
}

export default function Home() {
  const [prompt, setPrompt] = useState(starterPrompt);
  const [followUp, setFollowUp] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isSteering, setIsSteering] = useState(false);
  const [error, setError] = useState("");
  const [streamState, setStreamState] = useState("idle");
  const liveRef = useRef<Awaited<ReturnType<typeof connectSession>> | null>(null);
  const previewUrl = useMemo(() => findUrl(events), [events]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    const currentSession = session;

    async function stream() {
      try {
        setStreamState("connecting");
        const live = await connectSession({
          sessionId: currentSession.sessionId,
          clientToken: currentSession.clientToken,
        });
        liveRef.current = live;
        setStreamState("streaming");

        for await (const event of live.events({ level: "progress" })) {
          if (cancelled) break;
          setEvents((current) => {
            const next = event as SessionEvent;
            if (next.id && current.some((item) => item.id === next.id)) return current;
            if (typeof next.seq === "number" && current.some((item) => item.seq === next.seq)) return current;
            return [...current, next];
          });
        }
      } catch (caught) {
        if (!cancelled) {
          setStreamState("stopped");
          setError(caught instanceof Error ? caught.message : "Session stream stopped.");
        }
      }
    }

    void stream();

    return () => {
      cancelled = true;
      liveRef.current = null;
    };
  }, [session]);

  async function startSession(event: FormEvent) {
    event.preventDefault();
    setError("");
    setEvents([]);
    setSession(null);
    setIsStarting(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const payload = (await response.json()) as { sessionId?: string; clientToken?: string; error?: string };

      if (!response.ok || !payload.sessionId || !payload.clientToken) {
        throw new Error(payload.error || "Could not start session.");
      }

      setSession({ sessionId: payload.sessionId, clientToken: payload.clientToken });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start session.");
    } finally {
      setIsStarting(false);
    }
  }

  async function steer(event: FormEvent) {
    event.preventDefault();
    const text = followUp.trim();
    if (!text || !liveRef.current) return;

    setIsSteering(true);
    setError("");

    try {
      await liveRef.current.steer(text, { idempotencyKey: crypto.randomUUID() });
      setFollowUp("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send follow-up.");
    } finally {
      setIsSteering(false);
    }
  }

  return (
    <main className="shell">
      <section className="builderPane">
        <div className="topbar">
          <div>
            <h1>OpenComputer App Builder</h1>
            <p>Durable agent sessions POC using the TypeScript SDK.</p>
          </div>
          <span className="status">{streamState}</span>
        </div>

        <form onSubmit={startSession} className="promptBox">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={6}
            placeholder="Describe the app you want to build..."
          />
          <button disabled={isStarting || !prompt.trim()}>{isStarting ? "Starting..." : "Build app"}</button>
        </form>

        {session ? (
          <div className="sessionMeta">
            <span>Session</span>
            <code>{session.sessionId}</code>
          </div>
        ) : null}

        {error ? <div className="errorBox">{error}</div> : null}

        <form onSubmit={steer} className="followUp">
          <input
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
            disabled={!session}
            placeholder="Ask for an edit, e.g. add charts or improve the mobile layout"
          />
          <button disabled={!session || isSteering || !followUp.trim()}>
            {isSteering ? "Sending..." : "Send"}
          </button>
        </form>

        <div className="eventList">
          {events.length === 0 ? (
            <div className="emptyState">Start a build to stream agent progress here.</div>
          ) : (
            events.map((event, index) => (
              <article className="eventItem" key={event.id || `${event.type}-${event.seq || index}`}>
                <div className="eventHeader">
                  <span className={classForType(event.type)}>{event.type}</span>
                  <span>{event.seq ? `#${event.seq}` : event.level}</span>
                </div>
                <p>{eventText(event)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="previewPane">
        <div className="previewHeader">
          <div>
            <h2>Preview</h2>
            <p>{previewUrl ? "Agent-reported URL" : "Waiting for the session to publish or report a URL"}</p>
          </div>
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              Open
            </a>
          ) : null}
        </div>
        {previewUrl ? (
          <iframe title="Generated app preview" src={previewUrl} />
        ) : (
          <div className="previewEmpty">
            <span>Live preview will appear here when the runtime exposes a URL.</span>
          </div>
        )}
      </section>
    </main>
  );
}
