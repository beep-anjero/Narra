FROM python:3.13-slim
WORKDIR /app
RUN pip install --no-cache-dir uv==0.12.8
COPY apps/analytics/pyproject.toml apps/analytics/uv.lock ./
RUN uv sync --locked --no-dev
COPY apps/analytics/app ./app
RUN useradd --create-home --uid 10001 narra
ENV PATH="/app/.venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER narra
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
