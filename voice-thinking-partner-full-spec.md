# Voice Thinking Partner — Full Project Spec

This document is the single source of truth for this project. It exists so a coding agent (or a new collaborator) can build this without guessing at intent, inventing features that weren't discussed, or missing constraints that were deliberately chosen. If something isn't in this document, it isn't part of the project — ask before adding it.

---

## 1. What This Is

A mobile-first voice web app. The user talks out loud about a decision they're trying to make. A voice AI agent listens in real time and, instead of chatting back generically, asks targeted questions designed to surface gaps in the user's own reasoning — unbacked claims, unconsidered options, unstated criteria for success. At the end of the conversation, the app generates a structured, non-judgmental "decision map" summarizing what was said.

The agent never tells the user what to do. It never recommends an option, ranks anything, or states a preference. Its entire job is to make the user's own thinking visible to them, in real time and in the final artifact.

**One-line pitch (for pitch materials, exact wording):**
> "You've had that moment where a decision was obvious in hindsight — you just needed to hear yourself think it through out loud. We built the thing that listens for that moment, live."

---

## 2. Background and Context

### 2.1 Why this exists
This is being built for the lablab.ai x AssemblyAI voice AI hackathon.

- **Hackathon:** "Build voice AI agents on AssemblyAI," run by lablab.ai
- **Dates:** September 1–30, 2026 (month-long, online)
- **Prize pool:** $10,000 total — 5 winners, each receiving $1,000 cash + $1,000 in API credits
- **Sponsor tech:** AssemblyAI (speech-to-text, voice agent infrastructure — same tech behind Granola, HeyGen, Ashby, ClickUp)
- **Track chosen:** Voice Agent API (the fully-managed path — AssemblyAI handles STT, LLM routing, voice output, turn-taking/VAD, and JSON-schema tool calling in a single connection). Explicitly NOT the Realtime STT bring-your-own-orchestration path — see Section 8.2 for why.
- **Submission requirements:** project title, short + long description, tech/category tags, cover image, video presentation, slide presentation, public GitHub repo, and a working Application URL that judges can open directly. Judges will not install native apps or set up local builds to test submissions — see Section 5 for why this ruled out native mobile.
- **Team:** solo or small team; this project is being built by Leon.

### 2.2 How the idea evolved (for context, not to be treated as alternate scope)
The starting idea was a generic "AI buddy you can bounce ideas off of." That framing was rejected early because:
- It's the most common submission shape in voice hackathons (oversaturated, no clear differentiator for judges)
- "Talk to a buddy" implies a companion/emotional-support product, which is a crowded space (Replika, Wysa-style apps) that this project deliberately does not want to be associated with

The idea was then narrowed toward reusing Leon's existing "known / believed / unvalidated" evidence-tracking mental model from a separate project (`startup-idea-os`, a desktop app for validating startup ideas). That would have scoped this hackathon project to startup-idea validation specifically.

**This was explicitly rejected in favor of a general-purpose decision thinking partner** — not scoped to startups, but usable for any decision (job offers, moves, purchases, relationship calls, anything). This is a deliberate scope decision, not an oversight — do not narrow it back to startup-specific framing.

The evidence-tracking buckets were then generalized from the startup-specific "known/believed/unvalidated" into decision-agnostic categories: **claims, assumptions, options, and criteria** (see Section 6.2). This is the current, final schema.

### 2.3 Core design principle (non-negotiable, gates every feature)
**The agent helps the user think through a decision. It never makes the decision, recommends an option, ranks anything, or states what it would do.**

Rationale, in order of importance:
1. **Product differentiation.** A generic advice-giving voice agent for arbitrary life decisions is one bad demo answer away from "AI tells user to quit their job" — a real trust and safety liability once the scope went from startups to general decisions.
2. **Trust as a pitch asset.** "It never decides for you, it just makes sure you're deciding with your eyes open" is a genuine differentiator to say out loud to judges, not just an internal design value.
3. **User psychology.** The stated goal is that the user feels in control throughout — an agent that questions rather than advises is what makes that true, not just what's claimed in marketing.

Every feature, every prompt, and every line of the final artifact must be checked against this principle. If a proposed feature implies the agent judging, ranking, or recommending, it gets cut or reworked before it ships.

---

## 3. Target Platform Decision

**Decision: mobile-first, responsive web app. Not a native app. Not desktop-first.**

Rationale:
- Product vision fits mobile use cases best — someone pulls out their phone mid-walk, mid-commute, alone with a decision, and talks to it. This isn't a desk-bound tool.
- Hackathon judging requires a working Application URL. Judges will not install a native app (App Store/Play Store build, TestFlight, APK sideload) to evaluate a submission. A native-only app would actively hurt the submission's judgeability regardless of product quality.
- "Mobile-first" is being interpreted as: designed and tested primarily for phone browsers (touch targets, single-column layout, no desktop chrome), but delivered as a URL anyone can open in Safari or Chrome on a phone. Post-hackathon, wrapping this in Capacitor/Expo for real app store distribution is a fast follow-up, not part of this build.

**Known technical risk to test early, not late:** browser mic access and WebSocket stability on mobile are less forgiving than desktop. iOS Safari is stricter about background audio and mic permissions than desktop Chrome, and voice connections can be flakier on mobile data mid-conversation. This must be tested on real phone hardware in week 1 of the build, not discovered during demo recording in week 4.

---

## 4. Screen Flow (in order, with full detail per screen)

### 4.1 Landing (pre-auth)
- The hook line from Section 1 is the primary visual element on this screen.
- Single call-to-action button: "Start thinking."
- No sign-up or login wall before first use. This is deliberate — friction here kills both the demo experience and judge testing.
- Authentication, if built at all, is gated behind wanting to save or revisit past sessions (see Section 4.6), not behind starting a new session.

### 4.2 Frame the decision (optional)
- One optional text input: "What are you deciding?"
- Not required to proceed. If the user skips it, the agent asks the same question verbally in the first ~10 seconds of the voice session instead.
- Purpose: gives the final artifact a clean header ("Deciding: whether to take the job offer") regardless of whether it's typed or spoken.

### 4.3 Active session (core screen)
This is the primary screen of the entire product and needs to do three things without visual clutter:
- **Listening state indicator:** simple and calm (e.g. a gentle waveform), explicitly NOT a flashy assistant-style animated orb. Tone should read as "a quiet thinking space," not a hype consumer AI product.
- **Live transcript:** most recent lines visible, auto-scrolling as the conversation continues.
- **Live feedback chips:** small tags (e.g. "assumption noted," "criterion noted") that appear in real time as tool calls fire during the conversation, drifting into a tray at the bottom of the screen. This is the visible proof that the system is actively tracking the conversation, not just transcribing it — important both for user trust and for the hackathon demo.
- **One button:** "End session."

### 4.4 Processing (transition state)
- Brief (1–2 second) loading state after the user ends the session, while the final artifact is formatted from the session's logged data.
- This beat should not be skipped even though it's short — it signals that something real is being assembled, rather than the artifact just snapping into existence with no sense of synthesis.
- Critically: **no new content is generated or inferred during this step.** It is purely a formatting pass over data that was already logged live during the conversation (see Section 6.3 for why this matters).

### 4.5 Artifact / decision map (the payoff screen)
Full-screen, scrollable. This is the product's actual deliverable and the strongest visual beat in the demo video. Full content spec is in Section 6.

Includes a share/export affordance (screenshot-friendly at minimum) — the ability for a user to share this with someone else is part of the product's real-world value, not just a nice-to-have.

### 4.6 History (stretch goal — lowest priority, first to cut)
- A list of past sessions by decision title and date.
- Only build this if Sections 4.1–4.5 and the underlying features (Section 6) are fully working with meaningful buffer time left in the final week of the hackathon.
- Not part of the pitch or demo. Do not spend early-week time on this.

---

## 5. Features and Validation Criteria

### 5.1 Voice session with live turn-taking
**What it does:** User talks naturally about a decision. Agent listens, transcribes in real time, and interrupts at natural pause points — not on a fixed timer — using AssemblyAI's Voice Agent API for STT, turn-taking/VAD, and voice output, all through the single managed connection.

**Why it matters:** This is the core mechanic and the main technical showcase for the hackathon submission. Without natural, non-scripted turn-taking, this is just a chatbot with a microphone attached, which loses the entire differentiation argument.

**Validation checklist:**
- [ ] Session holds a stable connection for 3+ minutes without dropping, tested on both WiFi and mobile data
- [ ] Agent does not interrupt mid-sentence during normal speech pacing
- [ ] Agent responds within roughly 1–2 seconds of the user finishing a thought
- [ ] Tested on real phone hardware — iOS Safari and Android Chrome specifically, not just desktop browsers

### 5.2 Reasoning-gap detection (interruption triggers)
**What it does:** The agent listens for specific patterns in what the user says and asks one targeted question when it detects one. Confirmed triggers:
- A claim is stated with no supporting evidence → agent asks something like "How do you know that?"
- Only one option has been mentioned → agent asks something like "What's the alternative you're not considering?"
- No decision criteria have been stated → agent asks something like "What would make this a win for you?"
- (Two additional triggers were agreed on in prior discussion as sufficient — the total trigger set is considered locked. Do not invent additional triggers without checking; five well-tuned triggers were the explicit target, not an open-ended list.)

**Why it matters:** This is the specific, nameable differentiator from a generic voice chatbot — something a judge can understand and remember in one sentence, and something concretely demoable.

**Validation checklist:**
- [ ] Each trigger fires correctly against a scripted test conversation designed to hit it
- [ ] Agent asks exactly one question per trigger firing, then waits for a complete answer before asking anything further — the agent must never stack multiple questions before the user finishes responding
- [ ] Agent does not fire the same trigger twice against the same underlying statement
- [ ] False-positive rate is checked against at least 3 unscripted, messy real conversations, not only clean scripted test cases — real conversations are far less structured than a rehearsed pitch, and this is explicitly harder for a general-decision agent than it would have been for a startup-pitch-specific one (startup pitches carry implicit structure that a general ramble does not)

### 5.3 Structured tool-call logging
**What it does:** Every detected claim, assumption, option, and criterion is logged via a tool call into a running session state object, in real time, using four simple JSON-schema functions. Exact schema is in Section 6.2.

**Why it matters:** This converts an ephemeral conversation into structured data the artifact can be built from afterward. It is also the concrete technical proof point satisfying the hackathon's "JSON-Schema tool calling" requirement under the Voice Agent API track.

**Validation checklist:**
- [ ] Each tool call correctly populates the session state object with the right type and text content
- [ ] Session state is inspectable/loggable during development for debugging purposes
- [ ] No tool call is dropped or duplicated across a full session
- [ ] `log_claim` correctly sets its `has_evidence` boolean based on what was actually said in that moment — never defaulted to a fixed value regardless of content

### 5.4 Live feedback chips
**What it does:** As tool calls fire during the live conversation, small tags (e.g. "assumption noted," "criterion noted") appear on the active session screen in real time. See Section 4.3.

**Why it matters:** Without this, the system's tracking work is invisible until the very end of the session, which is a materially weaker live demo and a weaker sense of "something intelligent is happening" for the user in the moment.

**Validation checklist:**
- [ ] Chip appears within roughly 1 second of its corresponding tool call firing
- [ ] Chips remain legible and do not clutter or obscure the live transcript
- [ ] Chip animation does not distract from or slow down the live conversation flow

### 5.5 End-of-session decision map (the artifact)
**What it does:** A structured, non-ranked visual summary generated purely from the already-logged session state — no new content is inferred or generated at formatting time (this is a hard constraint, not a style preference; see Section 6.3). Exact section-by-section content spec is in Section 6.1.

**Why it matters:** This is the product's actual deliverable, the strongest visual beat in the demo video, and the concrete proof of the "we help you think, we don't decide for you" principle — a flat, unranked structure is what makes that principle real rather than just claimed.

**Validation checklist:**
- [ ] Artifact renders from logged session state alone — confirm no agent/LLM call happens at formatting time that could inject a new judgment not present in the live conversation
- [ ] No section contains a ranking, score, or explicit recommendation of any kind
- [ ] Empty sections (e.g. no criteria were ever named in the session) render as a visible, honest gap rather than being hidden, papered over, or filled in with an inferred guess
- [ ] Legible on a phone screen within about 2 seconds of viewing — this is a literal test given it needs to read clearly in a short demo video
- [ ] Shareable or exportable, screenshot-friendly at minimum

### 5.6 Decision framing (optional pre-session input)
Covered fully in Section 4.2.

**Validation checklist:**
- [ ] Skipping the optional field does not break the artifact's header — agent-elicited verbal framing populates it equally well
- [ ] The field is genuinely optional and never gates the start of a session

### 5.7 Session history (stretch, cut-first)
Covered fully in Section 4.6.

**Validation checklist:**
- [ ] Only attempted if Sections 5.1–5.6 are fully working with real buffer time remaining
- [ ] If cut, the single-session flow must work completely standalone with no broken references to a history feature anywhere in the UI

---

## 6. Artifact Content Specification (Section 4.5 detail)

### 6.1 Five sections, in this order

1. **What you're deciding** — one line, pulled from the session in the user's own words (either typed in Section 4.2 or spoken and captured verbally), not rewritten or reworded by the agent.
2. **Claims you made** — statements the user treated as fact during the conversation. Each item flagged as either evidence given or no evidence given, based on the `has_evidence` boolean logged live (Section 6.2). This flag is a factual property of the conversation (was evidence stated or not), not an evaluation of the decision itself, and is the one place a binary label is acceptable without breaking the non-judgment principle.
3. **Assumptions surfaced** — beliefs driving the decision that were never verified during the conversation. Typically the most valuable section, since the user usually didn't realize these were assumptions until asked.
4. **Options considered** — a plain list of alternatives the user named. If only one option was ever mentioned, this is shown as a bare fact (e.g. "1 option considered") with no accompanying suggestion that more should have been considered — the gap is meant to speak for itself.
5. **Criteria named** — what the user said would make the outcome a good one. If none were named, the section is simply empty, and that emptiness is itself the insight being surfaced.

**No section for risk score, ranking, or recommendation of any kind.** Anything risk-related gets folded into the claims/assumptions sections rather than existing as its own ranked list, specifically to avoid anything that reads as agent-generated advice.

### 6.2 Quiet structural call-outs
Under any section, small annotations are allowed, e.g.:
- "mentioned 3 times, never listed as a criterion"
- "stated as fact, no evidence given in session"

These are observations about the structure of the conversation itself (frequency, presence/absence of a label) — not opinions about the merits of the decision. This distinction must be maintained precisely: an annotation describing what happened in the conversation is fine; an annotation implying what should happen next is not.

### 6.3 Tool-call schema (exact)
```json
{ "type": "log_claim", "text": "string", "has_evidence": "boolean" }
{ "type": "log_assumption", "text": "string" }
{ "type": "log_option", "text": "string" }
{ "type": "log_criterion", "text": "string" }
```
Four tool functions only. The sophistication of this system is entirely in *when* the agent decides to call them (Section 5.2's trigger logic) — the schema itself is intentionally minimal and should not be expanded with additional fields or types without a clear reason tied back to a feature in this document.

### 6.4 Why the formatting pass must not generate new content
The final artifact is assembled from the session state object populated live during the conversation. The formatting step at the end (Section 4.4) performs layout and grouping only — it must never make an additional LLM call that could infer, add, or reword claims/assumptions/options/criteria beyond what was actually tool-called during the live session. Allowing new content generation at this stage would reintroduce agent judgment through the back door, undermining the core principle in Section 2.3 in a way that would be invisible to the user (it would look like part of "their own" summary while actually containing agent-generated inference).

---

## 7. System Prompt Constraints (must be hard-coded into the agent's instructions, not assumed to emerge)

The agent's system prompt must explicitly state, at minimum:
- It never recommends a choice, ranks options, or states what it would do in the user's position.
- It only asks questions that surface unstated assumptions, unconsidered options, unbacked claims, or unstated success criteria.
- It asks exactly one question at a time and waits for the user to fully finish answering before asking anything further — it must never stack multiple questions before the user responds, as this would make the experience feel like an interrogation rather than a thinking partner.

These are treated as hard requirements to test against, not stylistic suggestions — see the corresponding validation checkboxes in Section 5.2.

---

## 8. Technical Architecture

### 8.1 Stack
- **Frontend:** React (Vite), mobile-first CSS, deliberately no heavy UI component framework — full control over the artifact's visual design is needed since it's the demo's payoff moment.
- **Voice:** AssemblyAI Voice Agent API.
- **State:** session state object (`claims[]`, `assumptions[]`, `options[]`, `criteria[]`), populated via the four tool calls in Section 6.3, held either client-side or in a lightweight backend/serverless function.
- **Persistence:** none for the hackathon build unless the history feature (Section 5.7) is reached; local storage is sufficient for a demo.
- **Hosting:** Vercel or Netlify — chosen specifically because they provide an instant public URL, which the hackathon submission requires (Section 2.1).

### 8.2 Why the Voice Agent API (managed) and not Realtime STT (bring-your-own-orchestration)
The hackathon offers two tracks: a fully managed Voice Agent API (STT + LLM routing + voice output + turn-taking + tool calling in one connection) or a Realtime STT API where the builder brings their own LLM, TTS, and orchestration logic.

**Decision: managed Voice Agent API.** Rationale: the month-long timeline is better spent on the tool-calling/trigger logic (Section 5.2) and the artifact (Section 5.5) — the actual differentiators — rather than on building turn-taking and orchestration from scratch. The custom orchestration path would only be worth it if showing off custom voice architecture were itself the point of the submission, which it is not here.

### 8.3 Known risks to test early
- Mobile browser mic permission handling (especially iOS Safari) — test in week 1, not week 3.
- WebSocket/voice connection stability on mobile cellular networks — test on real devices, not just desktop with a simulated network throttle.

---

## 9. Explicit Non-Goals (things NOT to build for this hackathon submission)

To prevent scope creep or a coding agent inventing unrequested features:
- No native mobile app (App Store/Play Store) — see Section 3.
- No user accounts/authentication required to use the core product — optional at most, gated only behind session history.
- No risk scoring, ranking, or recommendation engine of any kind — violates Section 2.3.
- No additional interruption triggers beyond the five already agreed on (Section 5.2) without explicit discussion first.
- No LLM-based content generation at the artifact-formatting step (Section 6.4) — formatting only.
- No database/backend persistence layer unless and until session history (Section 5.7) is reached with buffer time available.
- No startup-idea-specific framing, copy, or scoping anywhere in the product — this was explicitly moved away from in favor of general-purpose decision support (Section 2.2).

---

## 10. Timeline

- **Week 1:** Core voice loop (5.1) working end-to-end on mobile browsers. This is the highest technical risk item and goes first, not last.
- **Week 2:** Session state and tool calls (5.3) plus artifact generation (5.5). Target: one full session working end-to-end, UI can be rough/unpolished at this stage.
- **Week 3:** UI and visual polish across all screens, feedback chip implementation (5.4). Pitch deck and demo video script drafted in parallel — not deferred to week 4.
- **Week 4:** No new features. Real-device testing, mobile network debugging, and demo video recording — recorded multiple times until pacing is right. This week is buffer and polish only.

**Cut order if behind schedule (in this exact order):**
1. Session history (5.7) — cut first
2. Decision framing text field (5.6) — fall back to verbal-only framing
3. Feedback chip animations (5.4) — fall back to a simple static "listening" indicator

**Never cut:** the voice loop (5.1), tool calling (5.3), and the artifact (5.5) — these three together are the entire pitch, and cutting any of them means there is no submission.

---

## 11. Hackathon Submission Checklist (from official hackathon requirements)
- [ ] Project title
- [ ] Short description
- [ ] Long description
- [ ] Technology & category tags
- [ ] Cover image
- [ ] Video presentation
- [ ] Slide presentation
- [ ] Public GitHub repository
- [ ] Demo application platform + working Application URL

---

## 12. What Wins or Loses This Submission

**Wins on:** a specific, nameable technical mechanic (live reasoning-gap detection via tool calls) instead of a generic voice chatbot; a genuine structured artifact payoff instead of a conversation that simply ends; a trust/safety differentiator (the agent never decides for the user) that stands apart from companion-app framing in a crowded space.

**Loses on:** shipping something judges can't test via a URL; an artifact that ranks, scores, or recommends (directly breaks Section 2.3); interruption logic that feels random rather than trigger-based and testable; a broken or untested demo because mobile voice behavior wasn't validated until the final week.
