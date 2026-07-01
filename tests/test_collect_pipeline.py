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


def test_get_openrouter_model_name_uses_default_llama_identifier():
    assert collect_pipeline.get_openrouter_model_name("llama") == "llama-4"


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
    assert clients["llama"] is fake_client


def test_make_clients_requires_openrouter_api_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.setattr(collect_pipeline, "load_environment", lambda *args, **kwargs: None)
    fake_openai_module = SimpleNamespace(OpenAI=lambda **kwargs: object())

    with patch.object(collect_pipeline, "openai", fake_openai_module):
        with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
            collect_pipeline.make_clients()
