import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import collect_pipeline


def test_get_openrouter_model_name_uses_config_override(monkeypatch):
    monkeypatch.setenv("OPENROUTER_MODEL_CLAUDE", "claude-opus-4-8")

    assert collect_pipeline.get_openrouter_model_name("claude") == "claude-opus-4-8"


def test_get_openrouter_model_name_uses_default_deepseek_identifier():
    assert collect_pipeline.get_openrouter_model_name("deepseek") == "deepseek/deepseek-v4-pro"


def test_get_openrouter_model_name_uses_default_glm_identifier():
    assert collect_pipeline.get_openrouter_model_name("glm") == "~z-ai/glm-5.2"


def test_get_openrouter_model_name_uses_config_override_for_glm(monkeypatch):
    monkeypatch.setenv("OPENROUTER_MODEL_GLM", "z-ai/glm-5.2")

    assert collect_pipeline.get_openrouter_model_name("glm") == "z-ai/glm-5.2"


def test_make_clients_uses_openrouter_single_client(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("XAI_API_KEY", raising=False)

    fake_client = object()
    fake_openai_module = SimpleNamespace(OpenAI=lambda **kwargs: fake_client)

    with patch.object(collect_pipeline, "openai", fake_openai_module):
        clients = collect_pipeline.make_clients()

    assert clients["claude"] is fake_client
    assert clients["openai"] is fake_client
    assert clients["grok"] is fake_client
    assert clients["gemini"] is fake_client
    assert clients["deepseek"] is fake_client


def test_query_openrouter_uses_higher_max_tokens_for_glm():
    captured = {}

    class FakeCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="ok"))],
                usage=SimpleNamespace(total_tokens=3),
                model="glm-model",
            )

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))

    collect_pipeline.query_openrouter("question", fake_client, "glm")

    assert captured["max_tokens"] == 2048


def test_query_openrouter_retries_when_content_is_empty(monkeypatch):
    responses = iter([
        SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=""))],
            usage=SimpleNamespace(total_tokens=0),
            model="glm-model",
        ),
        SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="recovered"))],
            usage=SimpleNamespace(total_tokens=4),
            model="glm-model",
        ),
    ])

    class FakeCompletions:
        def create(self, **kwargs):
            return next(responses)

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(collect_pipeline.time, "sleep", lambda *_args, **_kwargs: None)

    content, tokens, version = collect_pipeline.query_openrouter("question", fake_client, "claude")

    assert content == "recovered"
    assert tokens == 4
    assert version == "glm-model"


def test_make_clients_requires_openrouter_api_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.setattr(collect_pipeline, "load_environment", lambda *args, **kwargs: None)
    fake_openai_module = SimpleNamespace(OpenAI=lambda **kwargs: object())

    with patch.object(collect_pipeline, "openai", fake_openai_module):
        with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
            collect_pipeline.make_clients()


def test_load_question_bank_maps_qnumber_and_question(tmp_path):
    csv_path = tmp_path / "bank.csv"
    csv_path.write_text(
        "Q#,Question,Category,Difficulty\n"
        "M1,Who was Macrina the Younger?,General,Easy\n"
        "M2,When and where did Macrina the Younger live?,General,Easy\n",
        encoding="utf-8",
    )

    df = collect_pipeline.load_question_bank(csv_path)

    assert list(df.columns)[:2] == ["question_id", "question"]
    assert df.loc[0, "question_id"] == "M1"
    assert df.loc[1, "question"] == "When and where did Macrina the Younger live?"
