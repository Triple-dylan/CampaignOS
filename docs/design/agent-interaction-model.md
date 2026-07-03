# Agent Interaction Model

Status: draft for review — no selector code changes ship until this direction is agreed.

## The problem

We currently have four overlapping ways to pick an agent in chat (auto-routing,
`@` mentions, `/agent` slash commands, and the dismissible mode chip), plus five
dedicated agent console pages at `/agents/[slug]`. The pieces each work, but
together they feel redundant: "we might as well have a version of both." This
doc defines one coherent model for how agents operate across the app.

## Current inventory

| Surface | What it does today |
| --- | --- |
| Auto-routing | Resolver picks a skill per message; reply is attributed to the owning persona |
| `@` mention popover | Cursor-style manual override for a single message |
| `/agent` slash command | Same override, keyboard-first |
| Mode chip | Pins an agent for the whole conversation until dismissed |
| Agent consoles (`/agents/[slug]`) | Persona page: purpose, boundaries, quick actions, module links, context panel |

All five personas (Campaign Manager, Content Strategist, Researcher,
Fundraiser, Compliance Reviewer) are modes of the same chat surface — same
thread, same knowledge graph, different skill + system prompt.

## Core principle (proposed)

**Chat is where work happens; consoles are where you understand and steer an
agent.** An agent is never something you "go to" to chat — you chat in one
place, and the agent identity is an attribute of the response, not a separate
inbox. This mirrors Cursor: one composer, model/mode selection is lightweight
metadata on the message, and specialist context lives in dedicated panes.

### What that means per surface

1. **Composer (all pages)**
   - Auto-routing stays the default. Most users should never think about
     agent selection.
   - Keep exactly **one** manual override: the `@` mention (with `/agent` as
     its keyboard alias — they are the same popover, not two features).
   - The mode chip stops being a separate feature. Mentioning an agent sets it
     for that message; a small "keep" affordance on the chip pins it for the
     conversation. One mental model: mention → optionally pin.
   - Visible mode buttons (plan / research / social media) on the chat bar are
     fine as **shortcuts that pre-fill the same mention**, not a parallel
     system. They insert the corresponding agent chip — nothing new to learn.

2. **Attribution (all pages)**
   - Every specialist reply keeps its attribution header ("Researcher"), which
     doubles as the link to that agent's console. This is how users discover
     consoles — no separate nav needed.

3. **Agent consoles (`/agents/[slug]`)**
   - Consoles are **not** chat surfaces. They are the agent's home: purpose,
     boundaries, quick actions, recent runs (from `ai_generation_logs`), and
     the graph folders it reads.
   - Quick actions on a console **send the user back to chat** with the agent
     pinned and the prompt pre-filled. One chat, always.
   - Rule for when an agent earns a console: it has durable output the user
     revisits (briefs, assets, call sheets, review queues). All five current
     personas qualify; future lightweight modes (e.g. "plan") do not need one.

4. **Module pages (assets, research, planner, ...)**
   - The right-rail chat follows the user; on a module page, auto-routing is
     **biased toward the module's owning agent** (Asset Studio → Content
     Strategist) so it usually does the right thing without any selection.
   - Module "generate" buttons (New Report, New Content) invoke the owning
     agent's skill directly — same harness, no chat required, output lands in
     the module. This is the "tab entry point" from the workflow notes.

## Redundancy removed under this model

- `/agent` command and `@` mention merge into one popover with two triggers.
- Mode chip is no longer independently settable; it is the pinned state of a
  mention.
- Consoles lose any embedded composer; they deep-link to the one chat.
- Chat-bar mode buttons become mention shortcuts rather than a third system.

## Open questions for review

1. Should pinning an agent persist across page navigation, or reset per page
   (module bias would take over)?
2. Do we want the Campaign Manager to be the visible "default" persona on
   replies, or keep unattributed replies for generalist answers?
3. Are plan-style lightweight modes (no console) worth adding now, or wait
   until a concrete need appears?
