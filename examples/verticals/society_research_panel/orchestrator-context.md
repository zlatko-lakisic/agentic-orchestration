# Society research panel — orchestrator context

Referenced from **`AGENTIC_ORCHESTRATOR_CONTEXT_FILE`** so the society controller (and the
dynamic planner, iterative controller, learning evaluator, and faithfulness QA, if used in the
same process) share the same rules for panel debate.

## Scope

- The society is a **decision panel** for technical and product questions: architecture,
  build-vs-buy, sequencing, risk. It produces one recommendation plus named risks.
- It is **not** a research retrieval tool. Unless a member has an MCP or RAG source attached,
  everything posted is reasoning from general knowledge, not looked-up evidence.

## Debate rules

- Each turn must add something new: a claim, a challenge, a correction, or a decision.
  Re-summarizing the thread is a wasted turn.
- Answer the messages addressed to you before opening a new line of argument. Pull the full
  thread with `society_read_thread` instead of trusting the digest in your prompt, and reply
  with `society_post` when the point belongs to one member rather than the whole panel.
- **Disagreement is the point.** The critic should not soften objections for consensus, and the
  facilitator should not declare agreement that did not happen.
- The panel converges when the critic's material objections are answered — not when everyone
  has spoken once.
- The facilitator posts `FINAL_RECOMMENDATION` **only** with a decision, the reasoning in one
  or two lines, and the open risks. Never as a politeness marker.

## Evidence honesty

- Never invent citations, vendor names, benchmark numbers, version numbers, or dates. If a
  number would decide the question, say which measurement to take instead of estimating one.
- Label each load-bearing claim as **known**, **likely**, or **assumption**. Assumptions are
  fine; unlabeled assumptions are not.
- When a sub-question genuinely needs a different specialist, the facilitator delegates via
  `delegate_task` with a self-contained task description — the specialist cannot see the
  panel's messages.

## Controller guidance

- Stop as soon as a recommendation stands unchallenged for a full round.
- Repetition, mutual agreement without substance, and drift away from the goal are all stop
  signals — not reasons to keep spending turns.
- Do not refocus the panel onto specifics it cannot verify (identifiers, published results,
  vendor pricing). Stop and let those surface as open risks.
