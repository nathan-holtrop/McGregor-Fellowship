from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

try:
    import anthropic
except ImportError:  # pragma: no cover
    anthropic = None

try:
    import openai
except ImportError:  # pragma: no cover
    openai = None

try:
    from google import genai
except ImportError:  # pragma: no cover
    genai = None

DEFAULT_PROMPT = """You are a knowledgeable assistant answering questions about early church history.
Provide accurate, detailed, and nuanced responses based on historical scholarship.
Acknowledge uncertainty or scholarly debate where it exists.
Do not refuse historically answerable questions on the grounds of contemporary theological controversy."""
DEFAULT_QUESTION_CSV = Path("figures/question_bank.csv")
DEFAULT_OUTPUT_DIR = Path("data/responses")

MODEL_CONFIGS = {
    "claude": {"filename": "claude.jsonl", "sleep": 0.5},
    "openai": {"filename": "openai.jsonl", "sleep": 0.5},
    "grok": {"filename": "grok.jsonl", "sleep": 0.5},
    "gemini": {"filename": "gemini.jsonl", "sleep": 1.0},
}


def load_question_bank(path: Path | str = DEFAULT_QUESTION_CSV) -> pd.DataFrame:
    path = Path(path)
    if not path.exists():
        fallback = Path("Question Bank(Original 42).csv")
        if fallback.exists():
            path = fallback
        else:
            raise FileNotFoundError(
                f"Question bank not found at {path}."
                " Place your CSV at figures/question_bank.csv or root Question Bank(Original 42).csv"
            )
    questions = pd.read_csv(path)
    if "question_id" not in questions.columns or "question" not in questions.columns:
        raise ValueError("Question bank CSV must include at least 'question_id' and 'question' columns.")
    return questions


def load_environment(env_path: Path | str = ".env") -> None:
    env_path = Path(env_path)
    if env_path.exists():
        load_dotenv(env_path)
        return
    alt = Path(".env.local")
    if alt.exists():
        load_dotenv(alt)


def make_clients() -> dict[str, object]:
    load_environment()
    clients: dict[str, object] = {}

    if anthropic is not None:
        anth_key = os.environ.get("ANTHROPIC_API_KEY")
        if anth_key:
            clients["claude"] = anthropic.Anthropic(api_key=anth_key)

    if openai is not None:
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            clients["openai"] = openai.OpenAI(api_key=openai_key)
        xai_key = os.environ.get("XAI_API_KEY")
        if xai_key:
            clients["grok"] = openai.OpenAI(api_key=xai_key, base_url="https://api.x.ai/v1")

    if genai is not None:
        google_key = os.environ.get("GOOGLE_API_KEY")
        if google_key:
            clients["gemini"] = genai.Client()

    if not clients:
        raise RuntimeError(
            "No model clients were initialized. Check that the required API keys are set in .env or the environment."
        )

    return clients


def query_claude(question: str, client: object) -> tuple[str, int, str]:
    msg = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        temperature=0.0,
        system=DEFAULT_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    return (
        msg.content[0].text,
        msg.usage.input_tokens + msg.usage.output_tokens,
        msg.model,
    )


def query_openai(question: str, client: object) -> tuple[str, int, str]:
    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.0,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": DEFAULT_PROMPT},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content, response.usage.total_tokens, response.model


def query_grok(question: str, client: object) -> tuple[str, int, str]:
    response = client.chat.completions.create(
        model="grok-2",
        temperature=0.0,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": DEFAULT_PROMPT},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content, response.usage.total_tokens, response.model


def query_gemini(question: str, client: object) -> tuple[str, int, str]:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=question,
    )
    return response.text, response.usage_metadata.total_token_count, "gemini-2.5-flash"


QUERY_FUNCTIONS = {
    "claude": query_claude,
    "openai": query_openai,
    "grok": query_grok,
    "gemini": query_gemini,
}


def collect_model(
    model_name: str,
    questions: pd.DataFrame,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    clients: dict[str, object] | None = None,
) -> dict[str, int]:
    if model_name not in MODEL_CONFIGS:
        raise ValueError(f"Unsupported model: {model_name}")

    if clients is None:
        clients = make_clients()

    if model_name not in clients:
        raise RuntimeError(
            f"Client for {model_name} is not initialized. Check API credentials and available packages."
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / MODEL_CONFIGS[model_name]["filename"]
    sleep_seconds = MODEL_CONFIGS[model_name]["sleep"]

    query_fn = QUERY_FUNCTIONS[model_name]
    client = clients[model_name]
    results = {"ok": 0, "error": 0}

    with open(output_path, "w", encoding="utf-8") as f:
        for _, row in questions.iterrows():
            question_text = row["question"]
            print(f"Querying {model_name} {row['question_id']}...", end=" ")
            try:
                text, tokens, version = query_fn(question_text, client)
                record = {
                    "question_id": row["question_id"],
                    "figure": row.get("figure"),
                    "model": model_name,
                    "model_version": version,
                    "prompt": question_text,
                    "response": text,
                    "temperature": 0.0,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "tokens_used": tokens,
                }
                f.write(json.dumps(record) + "\n")
                results["ok"] += 1
                print(f"ok ({tokens} tok)")
            except Exception as exc:
                results["error"] += 1
                print(f"ERROR: {exc}")
            time.sleep(sleep_seconds)

    print(f"Saved {results['ok']} responses to {output_path} ({results['error']} errors)")
    return results


def collect_models(
    models: list[str] | str = "all",
    question_path: Path | str = DEFAULT_QUESTION_CSV,
    output_dir: Path | str = DEFAULT_OUTPUT_DIR,
) -> dict[str, dict[str, int]]:
    questions = load_question_bank(question_path)
    clients = make_clients()
    output_dir = Path(output_dir)
    selected_models = list(MODEL_CONFIGS.keys()) if models == "all" else [m.strip() for m in models] if isinstance(models, str) else models
    selected_models = [m for m in selected_models if m]

    summary: dict[str, dict[str, int]] = {}
    for model_name in selected_models:
        summary[model_name] = collect_model(model_name, questions, output_dir, clients)
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect LLM responses for the McGregor Fellowship question bank."
    )
    parser.add_argument(
        "--models",
        default="all",
        help="Comma-separated model names to run (claude, openai, grok, gemini) or 'all'.",
    )
    parser.add_argument(
        "--questions",
        default=str(DEFAULT_QUESTION_CSV),
        help="Path to the question bank CSV.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Directory where JSONL outputs will be written.",
    )
    parser.add_argument(
        "--env",
        default=".env",
        help="Path to .env file containing API credentials.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_environment(args.env)
    selected_models = args.models.split(",") if args.models != "all" else "all"
    summary = collect_models(selected_models, args.questions, args.output_dir)
    print("\n=== Batch complete ===")
    for model_name, result in summary.items():
        print(f"  {model_name}: {result['ok']} ok, {result['error']} errors")


if __name__ == "__main__":
    main()
