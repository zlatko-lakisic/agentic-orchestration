FROM python:3.12-slim-bookworm

WORKDIR /app

# Install from the requirements file. (This used to be `pip install mcp>=1.2.0`
# unquoted: the shell treated `>=1.2.0` as a redirect, wrote pip's output to a
# file named "=1.2.0" and installed an unconstrained `mcp`.)
COPY requirements-runtime.txt .
RUN pip install --no-cache-dir -r requirements-runtime.txt

COPY plant_knowledge_mcp/ plant_knowledge_mcp/
COPY data/ data/

ENV DATA_DIR=/app/data \
    HOST=0.0.0.0 \
    PORT=8080 \
    PYTHONDONTWRITEBYTECODE=1

# The server only reads the bundled CSVs and listens on an unprivileged port.
# Numeric uid so Kubernetes can verify runAsNonRoot.
RUN useradd --system --uid 10001 --no-create-home plantmcp
USER 10001

EXPOSE 8080

CMD ["python", "-m", "plant_knowledge_mcp"]
