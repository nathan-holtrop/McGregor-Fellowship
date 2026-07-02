# McGregor Fellowship AI Collection

This repository contains the shared collection pipeline and utilities for evaluating LLM responses against the McGregor Fellowship question bank.

## Contents
- `collect_pipeline.py`: shared Python collection script for collecting responses from multiple models via OpenRouter.
- `batch_collection.ipynb`: notebook wrapper for running the shared pipeline interactively.
- `sandbox/test_pipeline.ipynb`: sandbox notebook for validating OpenRouter setup.
- `sandbox/all_q_test_pipeline.ipynb`: sample notebook for querying a single OpenRouter model across the full question bank.
- `figures/question_bank.csv`: canonical question bank used by the pipeline.
- `requirements.txt`: required Python packages.
- `.env.example`: example environment file for OpenRouter credentials.

## Setup
1. Copy `.env.example` to `.env.local`.
2. Set `OPENROUTER_API_KEY` in `.env.local` or in your shell environment.
   No provider-specific API keys are required.
3. Install dependencies:

    python -m pip install -r requirements.txt

## Usage
Run the pipeline for all supported models:

    python collect_pipeline.py --models all

Run the pipeline for one model:

    python collect_pipeline.py --models openai

Or run a subset of models:

    python collect_pipeline.py --models claude,grok

## OpenRouter model overrides
The pipeline uses a single OpenRouter key for all models. To override the exact OpenRouter model ID used for a specific model alias, set any of:

- `OPENROUTER_MODEL_CLAUDE`
- `OPENROUTER_MODEL_OPENAI`
- `OPENROUTER_MODEL_GROK`
- `OPENROUTER_MODEL_GEMINI`
- `OPENROUTER_MODEL_LLAMA`
- `OPENROUTER_MODEL_GLM`

If no override is provided, the repository uses the default OpenRouter model IDs defined in `collect_pipeline.py`.

## Sandbox testing
- Use `sandbox/test_pipeline.ipynb` to verify OpenRouter client initialization.
- Use `sandbox/all_q_test_pipeline.ipynb` to run a full question bank collection through OpenRouter.

## Notes
- Generated outputs are written to `data/responses/`.
- The pipeline supports Claude, OpenAI, Grok, Gemini, Llama, and GLM using a single OpenRouter key and per-model OpenRouter IDs.

## GitHub Pages UI
A static frontend is available under `docs/` for CSV upload, model selection, and request preview.

To use it:
1. Enable GitHub Pages for the `docs/` folder.
2. Open `docs/index.html` locally or on the published site.
3. Enter your `OPENROUTER_API_KEY`, choose a model, and preview the request.

> Note: This site is static. API keys are stored locally in the browser and are not sent to a server.
