# McGregor Fellowship AI Collection

This repository contains the simplified collection pipeline for the McGregor Fellowship project.

## Contents
- `collect_pipeline.py`: shared Python collection script for multiple LLMs.
- `batch_collection.ipynb`: minimal notebook wrapper to run the shared pipeline interactively.
- `figures/question_bank.csv`: canonical question bank used by the pipeline.
- `requirements.txt`: required Python packages.
- `.env.example`: example environment file for API keys.

## Usage
1. Copy `.env.example` to `.env` and fill in your API credentials.
2. Install dependencies:

    python -m pip install -r requirements.txt

3. Run the pipeline:

    python collect_pipeline.py --models all

Or run only a single provider:

    python collect_pipeline.py --models openai

## Notes
- Outputs are written to `data/responses/`.
- The pipeline supports Claude, OpenAI, Grok, and Gemini.
