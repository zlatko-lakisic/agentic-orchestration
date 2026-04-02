# Third-Party Notices

This repository is licensed under Apache-2.0 (see `LICENSE` and `NOTICE`).

The project depends on third-party software. This file lists direct dependencies
identified from:

- `agentic-orchestration-tool/requirements.txt`
- `agentic-orchestration-web/package.json`

> Note: this is a direct-dependency notice list, not a full transitive SBOM.

## Python (agentic-orchestration-tool)

- **crewai** (v1.12.2 installed in local `.venv`)
  - License: **MIT** (from upstream repository license file)
  - Source: [https://github.com/crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)
  - License text source: [https://raw.githubusercontent.com/crewAIInc/crewAI/main/LICENSE](https://raw.githubusercontent.com/crewAIInc/crewAI/main/LICENSE)

- **litellm**
  - License: **MIT** (from installed package metadata)
  - Source: [https://github.com/BerriAI/litellm](https://github.com/BerriAI/litellm)

- **python-dotenv**
  - License: **BSD-3-Clause** (from installed package metadata)
  - Source: [https://github.com/theskumar/python-dotenv](https://github.com/theskumar/python-dotenv)

- **PyYAML**
  - License: **MIT** (from installed package metadata)
  - Source: [https://pyyaml.org/](https://pyyaml.org/)

- **httpx**
  - License: **BSD-3-Clause** (from installed package metadata)
  - Source: [https://www.python-httpx.org/](https://www.python-httpx.org/)

## Node (agentic-orchestration-web)

- **ws** (from `package-lock.json`, currently 8.20.0)
  - License: **MIT**
  - Source: [https://github.com/websockets/ws](https://github.com/websockets/ws)

## Compliance notes

- Apache-2.0 for this repository is compatible with the direct MIT/BSD dependencies listed above.
- Keep this `THIRD_PARTY_NOTICES.md` up to date when adding/changing dependencies.
- If you redistribute packaged artifacts including third-party code, include required license notices for included dependencies.

