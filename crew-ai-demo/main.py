import os
import sys

from dotenv import load_dotenv

from crewai import Agent, Crew, Process, Task


def require_env(var_name: str) -> str:
    value = os.getenv(var_name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {var_name}. "
            "Create a .env file from .env.example and set it."
        )
    return value


def build_crew() -> Crew:
    model_name = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

    researcher = Agent(
        role="Senior Research Analyst",
        goal="Find practical and recent facts about the given topic",
        backstory=(
            "You are a detail-oriented analyst who gathers concise, accurate "
            "information for technical audiences."
        ),
        llm=model_name,
        verbose=True,
    )

    writer = Agent(
        role="Technical Content Writer",
        goal="Convert research into a clear, actionable summary",
        backstory=(
            "You are a technical writer known for concise explanations and "
            "easy-to-follow structure."
        ),
        llm=model_name,
        verbose=True,
    )

    research_task = Task(
        description=(
            "Research the topic '{topic}' and produce 5 key bullet points with "
            "practical relevance."
        ),
        expected_output="A list of 5 concise bullet points.",
        agent=researcher,
    )

    writing_task = Task(
        description=(
            "Use the research notes to draft a short briefing (150-200 words) "
            "for an engineering team."
        ),
        expected_output="A short briefing paragraph plus 3 action items.",
        agent=writer,
    )

    return Crew(
        agents=[researcher, writer],
        tasks=[research_task, writing_task],
        process=Process.sequential,
        verbose=True,
    )


def main() -> None:
    load_dotenv()
    require_env("OPENAI_API_KEY")

    topic = os.getenv("DEMO_TOPIC", "Agentic AI for internal developer tooling")
    crew = build_crew()
    try:
        result = crew.kickoff(inputs={"topic": topic})
    except Exception as exc:
        print("\nCrew execution failed.", file=sys.stderr)
        print(
            "Check your OPENAI_API_KEY and OPENAI_MODEL_NAME in .env, then retry.",
            file=sys.stderr,
        )
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("\n=== Crew Output ===\n")
    print(result)


if __name__ == "__main__":
    main()
