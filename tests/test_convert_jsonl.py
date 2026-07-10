import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import importlib.util

spec = importlib.util.spec_from_file_location("convert_jsonl", Path(__file__).resolve().parents[1] / "data" / "responses" / "convert_jsonl.py")
convert_jsonl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(convert_jsonl)


def test_organize_records_by_question_groups_models_and_preserves_response_text(tmp_path):
    input_dir = tmp_path / "responses"
    input_dir.mkdir()

    (input_dir / "claude.jsonl").write_text(
        '{"question_id": "M1", "question": "Who was Macrina?", "model": "claude", "response": "First answer"}\n',
        encoding="utf-8",
    )
    (input_dir / "openai.jsonl").write_text(
        '{"question_id": "M1", "question": "Who was Macrina?", "model": "openai", "response": "Second answer"}\n',
        encoding="utf-8",
    )

    records = convert_jsonl.load_jsonl_records(input_dir)
    organized = convert_jsonl.organize_records_by_question(records)

    assert list(organized.keys()) == ["M1"]
    assert organized["M1"]["question"] == "Who was Macrina?"
    assert [entry["model"] for entry in organized["M1"]["responses"]] == ["claude", "openai"]
    assert [entry["response"] for entry in organized["M1"]["responses"]] == ["First answer", "Second answer"]
