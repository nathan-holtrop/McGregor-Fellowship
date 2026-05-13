# Teaching Ancient Wisdom with Modern AI

This repository contains the research data, code, and documentation for the McGregor Fellowship 2026 project at Calvin University.

## Project Overview

This project investigates the accuracy of Large Language Models (LLMs) in representing women in early Christian history. In many AI systems, these figures are often minimized, erased, or subject to hallucinations. By evaluating models against authoritative historical records, this study seeks to understand where AI succeeds and fails in preserving the legacy of real intellectual and spiritual leaders.

## Primary Research Subjects

While the project maintains a broader bank of 15 figures, the 2026 summer cycle focuses on two fourth-century women:

-  St. Macrina the Younger (c. 327–379): A philosopher, theologian, and monastic founder from the Cappadocian circle.
-  Olympias the Deaconess (c. 361–408): A deaconess and monastic leader in Constantinople and correspondent of John Chrysostom.

These figures provide contrasting geographical, institutional, and documentary contexts (hagiography vs. epistolary) for evaluation.

## Repository Structure
-  data/: Contains datasets collected from GPT-4o, Claude, Grok, and other model responses.
-  figures/: Contains figure metadata and the expected question bank CSV.
-  .env: Placeholder API key configuration for local environment variables.
-  Root notebooks: Python notebooks for the API collection pipeline (currently stored at repository root).

## Research Methodology
The project follows a five-phase approach over 10 weeks:
-  Foundational Reading: Deep study of primary 4th-century texts and secondary academic monographs.
-  Prompt Engineering: Designing biographical, chronological, and "false-premise" adversarial prompts.
-  Data Collection: Automated batch querying of multiple LLMs via API.  Error Analysis: Systematically coding responses for factual inaccuracy, anachronism, conflation, and gender erasure.
-  Synthesis: Statistical analysis of accuracy rates per model and figure.

## Research Team
Faculty Mentor: Prof. Eric Araújo (Department of Computer Science).

Student Researchers: Ian Hawthorne and Nathan Holtrop.  

## Key Dates (2026)
Project Start: May 11

Break Week: June 15–19

Public Presentation: July 17

Project Conclusion: July 21

## Acknowledgments

This project is funded by the McGregor Fellowship Program at Calvin University.
