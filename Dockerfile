FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml README.md LICENSE ./
COPY traceclause ./traceclause
RUN pip install --no-cache-dir . && useradd --create-home app && mkdir /app/data && chown app:app /app/data
USER app
EXPOSE 8765
CMD ["python", "-m", "uvicorn", "traceclause.app:app", "--host", "0.0.0.0", "--port", "8765"]
