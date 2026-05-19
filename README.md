# McGregor Fellowship AI Collection

This repository contains the simplified collection pipeline for the McGregor Fellowship project.

## Contents
- `collect_pipeline.py`: shared Python collection script for multiple LLMs.
- `batch_collection.ipynb`: minimal notebook wrapper to run the shared pipeline interactively.
- `sandbox/test_pipeline.ipynb`: manual sandbox notebook for environment and API validation.
- `figures/question_bank.csv`: canonical question bank used by the pipeline.
- `requirements.txt`: required Python packages.
- `.env.example`: example environment file for API keys.

## Usage
1. Copy `.env.example` to `.env.local` and fill in your API credentials.
2. Install dependencies:

    python -m pip install -r requirements.txt

3. Run the pipeline:

    python collect_pipeline.py --models all

To run a single provider:

    python collect_pipeline.py --models openai

## Sandbox testing
- Use `sandbox/test_pipeline.ipynb` for manual API/test checks.
- The sandbox notebook is separate from the main collection pipeline.

## Notes
- Outputs are written to `data/responses/`.
- The pipeline supports Claude, OpenAI, Grok, and Gemini.
