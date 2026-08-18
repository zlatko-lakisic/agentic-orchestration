"""Society runtime — protocol-driven turn loop (K6.1, message bus in K6.2).

One member speaks per turn. Each turn is a single-agent crew built the same way
``execute_step`` builds one, with a short digest of the message bus (not the whole
blackboard) injected into the task description plus the ``society_*`` message tools. Who
speaks next comes from ``society_protocols.select_next_member``. Stop conditions from the
charter and the society controller both end the run early; ``max_turns`` and
``max_delegations`` end it unconditionally.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Callable

from orchestration.config_loader import TaskDefinition, WorkflowConfig
from orchestration.delegate_task_tool import attach_delegate_task_tool
from orchestration.society_charter import (
    SocietyCharter,
    SocietyCharterError,
    SocietyMember,
    load_society_charter,
    resolve_member_catalog_entries,
)
from orchestration.society_controller import (
    society_controller_decision,
    society_controller_enabled,
)
from orchestration.society_message_tools import (
    SOCIETY_TOOL_NAMES,
    attach_society_message_tools,
    message_tools_enabled_from_env,
)
from orchestration.society_messages import (
    BROADCAST,
    DEFAULT_THREAD_ID,
    READY_FOR_DRAFT_MARKER,
    SocietyMessage,
    SocietyMessageError,
)
from orchestration.society_protocols import (
    PROTOCOL_MODERATOR_PICKS,
    PROTOCOL_REACTIVE,
    drafter_member,
    select_next_member,
)
from orchestration.society_session import (
    STATUS_DONE,
    STATUS_FAILED,
    STATUS_STOPPED,
    SocietySession,
    SocietySessionError,
    create_society_session,
)

_DEFAULT_AGENT_CATALOG_REL = "config/agent_providers"
_DEFAULT_MCP_CATALOG_REL = "config/mcp_providers"

_ROLE_CHARGES: dict[str, str] = {
    "facilitator": (
        "You chair this panel. Frame the open question, hold members to the goal, and drive "
        "toward one decision the user can act on."
    ),
    "critic": (
        "You are the critic. Attack the weakest claim on the blackboard, name what would falsify "
        "it, and say plainly when a point is unsupported."
    ),
    "domain_expert": (
        "You are the domain expert. Add substance the others cannot: mechanisms, constraints, "
        "numbers, and where the real risk sits."
    ),
    "researcher": (
        "You are the researcher. Supply the evidence picture and be explicit about what is "
        "established, contested, or unknown."
    ),
    "writer": (
        "You are the writer. Turn what the panel agreed on into clear, scannable prose."
    ),
}


def _tool_root_default() -> Path:
    return Path(__file__).resolve().parents[1]


def _resolve_catalog_path(raw: Path | str | None, *, tool_root: Path, default_rel: str) -> Path:
    candidate = Path(str(raw).strip()) if raw else Path(default_rel)
    if not candidate.is_absolute():
        candidate = tool_root / candidate
    return candidate.resolve()


def _load_agent_catalog(path: Path, *, quiet: bool) -> list[dict[str, Any]]:
    from orchestration.agent_providers_catalog import load_agent_providers_catalog_merged
    from orchestration.catalog_credentials import filter_entries_by_api_credentials

    entries = load_agent_providers_catalog_merged(path)
    usable, skipped = filter_entries_by_api_credentials(
        entries,
        verbose=not quiet,
        log_prefix="society",
    )
    if skipped and not quiet:
        print(
            f"(society) {len(skipped)} catalog entr(ies) skipped for missing credentials",
            file=sys.stderr,
        )
    return usable


def _member_charge(member: SocietyMember) -> str:
    if member.charge:
        return member.charge
    return _ROLE_CHARGES.get(member.role, "")


def _stop_phrase_instruction(charter: SocietyCharter, member: SocietyMember) -> str:
    phrases = [
        c.phrase
        for c in charter.stop_when
        if c.role in ("any", member.role)
    ]
    if not phrases:
        return ""
    listed = ", ".join(f"`{p}`" for p in phrases)
    return (
        f"When — and only when — the panel has converged and you can state the final answer, "
        f"end your post with a line starting {listed} followed by the recommendation. "
        f"Do not use that marker while questions remain open."
    )


def _messaging_instructions(charter: SocietyCharter, member: SocietyMember) -> str:
    tools = ", ".join(f"`{name}`" for name in SOCIETY_TOOL_NAMES)
    lines = [
        f"The panel talks over a threaded message bus. Tools: {tools}.",
        f"- Call `society_read_thread` (thread `{DEFAULT_THREAD_ID}` is the main thread) before "
        "replying, so you answer what was actually said instead of the digest above.",
        "- Call `society_post` to reply to one member (`to_agent` = their "
        "`agent_provider_id`), to open a side thread (`thread_id`), or to cite messages you "
        "are answering (`refs`).",
        f"- Your final answer is broadcast to thread `{DEFAULT_THREAD_ID}` automatically, so "
        "do not re-post it with the tool.",
    ]
    drafter = drafter_member(charter)
    if drafter is not None and charter.protocol in (
        PROTOCOL_MODERATOR_PICKS,
        PROTOCOL_REACTIVE,
    ):
        if drafter.agent_provider_id == member.agent_provider_id:
            lines.append(
                f"- You hold the pen: once a member posts `{READY_FOR_DRAFT_MARKER}`, write the "
                "draft the panel agreed on."
            )
        else:
            lines.append(
                f"- When the discussion is settled enough to be written up, post "
                f"`{READY_FOR_DRAFT_MARKER}` so the {drafter.role} takes the next turn. Do not "
                "use that marker while substantive questions remain open."
            )
    return "## Messaging\n" + "\n".join(lines)


def _unread_section(unread: list[SocietyMessage], member: SocietyMember) -> str:
    directed = [m for m in unread if not m.is_broadcast]
    if not directed:
        return ""
    listed = "\n".join(
        f"- [{m.msg_id}] from `{m.from_agent}` on thread `{m.thread_id}`" for m in directed
    )
    return (
        "## Addressed to you\n"
        "These messages were sent to you specifically. Answer them in this turn "
        f"(read them with `society_read_thread`):\n{listed}"
    )


def build_turn_description(
    *,
    charter: SocietyCharter,
    member: SocietyMember,
    goal: str,
    turn_index: int,
    messages_summary: str = "",
    unread: list[SocietyMessage] | None = None,
    message_tools: bool = True,
    blackboard: str = "",
    delegable_ids: list[str] | None = None,
    delegations_remaining: int = 0,
) -> str:
    """
    Task description for one member turn: role charge, goal, recent messages, stop rule.

    ``messages_summary`` is the last N posts on the bus rather than the whole blackboard, so
    the prompt stops growing linearly with turn count. ``blackboard`` is only a fallback for
    when the bus is empty (e.g. message tools disabled).
    """
    parts: list[str] = [
        f"You are the **{member.role}** on the agent panel `{charter.society_id}` "
        f"(turn {turn_index} of {charter.max_turns}).",
    ]
    charge = _member_charge(member)
    if charge:
        parts.append(charge)
    parts.append(f"## Panel goal\n{str(goal or '').strip()}")
    parts.append(
        "## Roster\n"
        + "\n".join(f"- {m.role}: `{m.agent_provider_id}`" for m in charter.members)
    )

    digest = str(messages_summary or "").strip()
    board = str(blackboard or "").strip()
    if digest:
        parts.append(
            "## Recent panel messages\n"
            "The most recent posts, newest last. Build on them; do not repeat them.\n\n"
            + digest
        )
    elif board:
        parts.append(
            "## Blackboard so far\n"
            "These are the previous turns. Build on them; do not repeat them.\n\n" + board
        )
    else:
        parts.append("## Recent panel messages\nEmpty — you are opening the panel.")

    addressed = _unread_section(list(unread or []), member)
    if addressed:
        parts.append(addressed)

    if message_tools:
        parts.append(_messaging_instructions(charter, member))

    if member.can_delegate and delegations_remaining > 0:
        allowed = ", ".join(f"`{x}`" for x in (delegable_ids or [])) or "any catalog agent"
        parts.append(
            "## Delegation\n"
            f"You may call the `delegate_task` tool at most {delegations_remaining} more time(s) "
            f"to get work from another specialist ({allowed}). The specialist cannot see this "
            "conversation, so write a self-contained task_description. Delegate only when the "
            "sub-task is clearly outside your own competence."
        )

    parts.append(
        "## Your post\n"
        "Write one focused contribution (roughly 120-250 words) addressed to the panel. Add new "
        "substance: a claim, a challenge, a correction, or a decision. Do not summarize the whole "
        "discussion, do not role-play the other members, and do not restate these instructions."
    )
    stop_rule = _stop_phrase_instruction(charter, member)
    if stop_rule:
        parts.append(f"## Stop marker\n{stop_rule}")

    return "\n\n".join(parts)


def _execute_member_turn(
    *,
    charter: SocietyCharter,
    member: SocietyMember,
    provider_entry: dict[str, Any],
    task_description: str,
    goal: str,
    turn_index: int,
    quiet: bool,
    agent_catalog: list[dict[str, Any]],
    mcp_catalog_path: Path | None,
    reserve_delegation: Callable[[str, str], None] | None,
    delegations_remaining: int,
    session: SocietySession | None = None,
    message_tools: bool = True,
) -> str:
    """Build and kick off the single-agent crew for one turn; returns the member's post."""
    from orchestration.output_artifacts import workflow_result_to_extractable_text
    from orchestration.crewai_template import crew_kickoff
    from orchestration.runner import build_workflow, crew_kickoff_context
    from orchestration.text_normalize import sanitize_user_facing_prose

    step_id = f"turn-{turn_index}-{member.role}"
    mcp_ids = list(member.mcp_providers or charter.mcp_providers)
    cfg = WorkflowConfig(
        name=f"society-{charter.society_id}",
        process="sequential",
        topic=goal,
        instance_key=f"society-{charter.society_id}",
        agent_providers=[dict(provider_entry)],
        mcp_providers=[],
        skills=[],
        tasks=[
            TaskDefinition(
                id=step_id,
                agent_provider_id=str(provider_entry.get("id") or "").strip(),
                description=task_description,
                expected_output=(
                    "One focused panel contribution in plain prose, ending with the stop marker "
                    "only if the panel has converged."
                ),
                mcp_providers=mcp_ids,
                skills=[],
            )
        ],
        task_sequence=[step_id],
    )
    built = build_workflow(
        cfg,
        crew_verbose=False,
        quiet=True,
        emit_progress_lines=False,
        mcp_catalog_path=mcp_catalog_path,
    )
    if member.can_delegate and delegations_remaining > 0:
        attach_delegate_task_tool(
            built,
            agent_catalog=agent_catalog,
            topic=goal,
            reserve_delegation=reserve_delegation,
            enabled=True,
            quiet=quiet,
            mcp_catalog_path=mcp_catalog_path,
        )
    if session is not None:
        attach_society_message_tools(
            built,
            session=session,
            member=member,
            turn=turn_index,
            enabled=message_tools,
        )
    with crew_kickoff_context(built):
        result = crew_kickoff(built.crew, inputs={"topic": goal})
    return sanitize_user_facing_prose(workflow_result_to_extractable_text(result))


def _delegable_ids(charter: SocietyCharter) -> list[str]:
    """Members are the preferred delegation targets; the tool still allows other catalog ids."""
    return [m.agent_provider_id for m in charter.members]


def run_society(
    *,
    tool_root: Path | None = None,
    charter_path: Path | str,
    goal: str = "",
    session_slug: str | None = None,
    quiet: bool = False,
    agent_catalog_path: Path | str | None = None,
    mcp_catalog_path: Path | str | None = None,
    max_turns: int | None = None,
    controller_model: str | None = None,
    use_controller: bool | None = None,
) -> int:
    """
    Run one society to completion. Returns a process exit code (0 on success).

    Turn budget: ``max_turns`` (CLI/env override) or the charter value, whichever is smaller.
    """
    root = Path(tool_root) if tool_root else _tool_root_default()
    agents_path = _resolve_catalog_path(
        agent_catalog_path,
        tool_root=root,
        default_rel=_DEFAULT_AGENT_CATALOG_REL,
    )
    mcp_path = _resolve_catalog_path(
        mcp_catalog_path,
        tool_root=root,
        default_rel=_DEFAULT_MCP_CATALOG_REL,
    )

    try:
        agent_catalog = _load_agent_catalog(agents_path, quiet=quiet)
    except Exception as exc:  # noqa: BLE001
        print(f"error: could not load agent provider catalog ({agents_path}): {exc}", file=sys.stderr)
        return 2

    try:
        charter = load_society_charter(Path(charter_path), agent_catalog=agent_catalog)
    except SocietyCharterError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    effective_goal = str(goal or "").strip() or charter.goal
    if not effective_goal:
        print(
            "error: society run needs a goal (pass --goal / TASK, or set society.goal in the charter)",
            file=sys.stderr,
        )
        return 2

    turn_cap = charter.max_turns
    if max_turns is not None:
        turn_cap = max(1, min(charter.max_turns, int(max_turns)))

    try:
        provider_entries = resolve_member_catalog_entries(charter, agent_catalog)
    except SocietyCharterError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    session = create_society_session(
        tool_root=root,
        charter=charter,
        goal=effective_goal,
        session_slug=session_slug,
    )
    session.meta.max_turns = turn_cap
    session.save()

    if not quiet:
        print(
            f"(society) {charter.society_id}: {len(charter.members)} members, "
            f"protocol={charter.protocol}, max_turns={turn_cap}, "
            f"max_delegations={charter.max_delegations}",
            file=sys.stderr,
        )
        print(f"(society) session {session.directory}", file=sys.stderr)
        if not message_tools_enabled_from_env():
            print(
                "(society) message tools disabled (AGENTIC_SOCIETY_MESSAGE_TOOLS=0); turns fall "
                "back to the full blackboard excerpt",
                file=sys.stderr,
            )
        if charter.protocol == "hierarchical":
            print(
                "(society) protocol 'hierarchical' takes round-robin turns in v1; see "
                "config/workflows/workflow_society_hierarchical_panel.yaml for a CrewAI "
                "hierarchical crew (`--config`).",
                file=sys.stderr,
            )

    current_goal = effective_goal
    stop_reason = ""
    controller_on = society_controller_enabled() if use_controller is None else bool(use_controller)
    message_tools_on = message_tools_enabled_from_env()
    last_posts: dict[str, str] = {}

    for turn_index in range(1, turn_cap + 1):
        member = select_next_member(
            charter.protocol,
            charter,
            session,
            turn_index,
            last_posts=last_posts,
        )
        entry = provider_entries[member.agent_provider_id]
        remaining_delegations = session.meta.delegations_remaining
        unread = session.unread_for(member.agent_provider_id)

        if not quiet:
            print(
                f"(society) turn {turn_index}/{turn_cap}: {member.role} "
                f"({member.agent_provider_id})"
                + (f", {len(unread)} unread" if unread else ""),
                file=sys.stderr,
            )

        description = build_turn_description(
            charter=charter,
            member=member,
            goal=current_goal,
            turn_index=turn_index,
            messages_summary=session.recent_messages_summary() if message_tools_on else "",
            unread=unread,
            message_tools=message_tools_on,
            blackboard="" if message_tools_on else session.blackboard_text(),
            delegable_ids=_delegable_ids(charter),
            delegations_remaining=remaining_delegations,
        )
        # The digest above is what this member gets to see, so treat it as read: `reactive`
        # must not hand it the floor again for the same unread mail.
        session.mark_seen(member.agent_provider_id)
        reserve = _make_reserve_delegation(session, member)

        try:
            text = _execute_member_turn(
                charter=charter,
                member=member,
                provider_entry=entry,
                task_description=description,
                goal=current_goal,
                turn_index=turn_index,
                quiet=quiet,
                agent_catalog=agent_catalog,
                mcp_catalog_path=mcp_path,
                reserve_delegation=reserve,
                delegations_remaining=remaining_delegations,
                session=session,
                message_tools=message_tools_on,
            )
        except Exception as exc:  # noqa: BLE001
            session.append_transcript(
                {
                    "kind": "turn_failed",
                    "turn": turn_index,
                    "role": member.role,
                    "agent_provider_id": member.agent_provider_id,
                    "error": str(exc),
                }
            )
            session.finish(status=STATUS_FAILED, stop_reason=f"turn {turn_index} failed: {exc}")
            print(f"error: society turn {turn_index} failed: {exc}", file=sys.stderr)
            return 1

        matched = charter.matched_stop_condition(role=member.role, text=text)
        turn_stop = f"stop_when:{matched.role}:{matched.phrase}" if matched else ""
        session.append_turn(
            turn_index=turn_index,
            role=member.role,
            agent_provider_id=member.agent_provider_id,
            text=text,
            stop_reason=turn_stop,
        )
        # Re-inserted so the dict's order is the speaking order.
        last_posts.pop(member.agent_provider_id, None)
        last_posts[member.agent_provider_id] = text
        _broadcast_turn_output(
            session,
            member=member,
            turn_index=turn_index,
            text=text,
            quiet=quiet,
        )

        if matched:
            stop_reason = turn_stop
            if not quiet:
                print(
                    f"(society) stop condition met on turn {turn_index} "
                    f"({matched.role} posted {matched.phrase!r})",
                    file=sys.stderr,
                )
            break

        if turn_index >= turn_cap:
            stop_reason = f"max_turns:{turn_cap}"
            break

        round_complete = turn_index % len(charter.members) == 0
        if controller_on and round_complete and turn_index >= charter.min_turns:
            decision = _controller_decision_safe(
                original_goal=effective_goal,
                latest_excerpt=session.blackboard_text(),
                turn_index=turn_index,
                max_turns=turn_cap,
                model=controller_model,
                quiet=quiet,
            )
            if decision is not None:
                session.append_transcript(
                    {
                        "kind": "controller",
                        "turn": turn_index,
                        "done": bool(decision.get("done")),
                        "reason": str(decision.get("reason", "")),
                        "budget_remaining": decision.get("budget_remaining"),
                        "next_goal": str(decision.get("next_goal", "")),
                    }
                )
                if bool(decision.get("done")):
                    stop_reason = f"controller:{decision.get('reason', 'converged')}"
                    if not quiet:
                        print(
                            f"(society) controller stopped after turn {turn_index}: "
                            f"{decision.get('reason', '')}",
                            file=sys.stderr,
                        )
                    break
                next_goal = str(decision.get("next_goal", "") or "").strip()
                if next_goal:
                    current_goal = next_goal
                    if not quiet:
                        print(f"(society) refocused goal: {next_goal}", file=sys.stderr)

    status = STATUS_DONE if stop_reason.startswith(("stop_when:", "controller:")) else STATUS_STOPPED
    session.finish(status=status, stop_reason=stop_reason or "max_turns")

    _print_society_outcome(session, charter, quiet=quiet)
    if _society_impartial_qa_failed(session, charter, tool_root=root, goal=effective_goal):
        return 1
    return 0


def _society_impartial_qa_failed(
    session: SocietySession,
    charter: SocietyCharter,
    *,
    tool_root: Path,
    goal: str,
) -> bool:
    """
    Score the society's final recommendation with the unified impartial QA gate.

    Advisory by default: the report is printed and stored either way, and only
    ``AGENTIC_IMPARTIAL_QA_FAIL=1`` turns a failing report into a non-zero exit code. A society
    that produced no text is left alone — the outcome printer already said so.
    """
    from orchestration.impartial_qa import finalize_impartial_qa, impartial_qa_gate_failed

    final = final_recommendation_text(session, charter).strip()
    if not final:
        return False
    report = finalize_impartial_qa(
        tool_root=tool_root,
        session_slug=f"society-{session.directory.name}",
        user_goal=goal,
        output_text=final,
    )
    return impartial_qa_gate_failed(report)


def _broadcast_turn_output(
    session: SocietySession,
    *,
    member: SocietyMember,
    turn_index: int,
    text: str,
    quiet: bool,
) -> SocietyMessage | None:
    """
    Mirror a turn's output onto the bus as a broadcast on the main thread.

    Members may also post explicitly with ``society_post``; this keeps the bus populated (and
    the protocols working) when a model never calls the tool.
    """
    body = str(text or "").strip()
    if not body:
        return None
    try:
        return session.post_message(
            from_agent=member.agent_provider_id,
            content=body,
            to_agent=BROADCAST,
            thread_id=DEFAULT_THREAD_ID,
            turn=turn_index,
            role=member.role,
        )
    except (SocietyMessageError, OSError) as exc:
        if not quiet:
            print(f"(society) could not post turn {turn_index} to the bus: {exc}", file=sys.stderr)
        return None


def _make_reserve_delegation(
    session: SocietySession,
    member: SocietyMember,
) -> Callable[[str, str], None]:
    def reserve(agent_provider_id: str, task_description: str) -> None:
        try:
            session.increment_delegation(
                agent_provider_id=agent_provider_id,
                requested_by=member.agent_provider_id,
                task_description=task_description,
            )
        except SocietySessionError as exc:
            raise ValueError(str(exc)) from exc

    return reserve


def _controller_decision_safe(
    *,
    original_goal: str,
    latest_excerpt: str,
    turn_index: int,
    max_turns: int,
    model: str | None,
    quiet: bool,
) -> dict[str, Any] | None:
    """Controller failures never end a society run; they just skip the check."""
    try:
        return society_controller_decision(
            original_goal=original_goal,
            latest_excerpt=latest_excerpt,
            turn_index=turn_index,
            max_turns=max_turns,
            model=model,
        )
    except Exception as exc:  # noqa: BLE001
        if not quiet:
            print(f"(society) controller unavailable ({exc}); continuing", file=sys.stderr)
        return None


def final_recommendation_text(session: SocietySession, charter: SocietyCharter) -> str:
    """Last turn that carried a stop marker, else the last turn on the transcript."""
    turns = [e for e in session.transcript_entries() if e.get("kind") == "turn"]
    if not turns:
        return ""
    for entry in reversed(turns):
        role = str(entry.get("role", ""))
        text = str(entry.get("text", ""))
        if charter.matched_stop_condition(role=role, text=text):
            return text
    return str(turns[-1].get("text", ""))


def _print_society_outcome(
    session: SocietySession,
    charter: SocietyCharter,
    *,
    quiet: bool,
) -> None:
    final = final_recommendation_text(session, charter).strip()
    if final:
        print(final)
    elif not quiet:
        print("(society) no turn output captured", file=sys.stderr)

    if quiet:
        return
    print(
        f"\n(society) {session.meta.turn} turn(s), "
        f"{len(session.messages())} message(s), "
        f"{session.meta.delegations_used}/{session.meta.max_delegations} delegation(s), "
        f"status={session.meta.status} ({session.meta.stop_reason})",
        file=sys.stderr,
    )
    print(f"(society) blackboard {session.blackboard_path}", file=sys.stderr)
    print(f"(society) messages {session.messages_dir}", file=sys.stderr)
    print(f"(society) transcript {session.transcript_path}", file=sys.stderr)
