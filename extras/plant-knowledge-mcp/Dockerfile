FROM python:3.12-slim-bookworm

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir mcp>=1.2.0

COPY plant_knowledge_mcp/ plant_knowledge_mcp/
COPY data/ data/

ENV DATA_DIR=/app/data \
    HOST=0.0.0.0 \
    PORT=8080

EXPOSE 8080

CMD ["python", "-m", "plant_knowledge_mcp"]
