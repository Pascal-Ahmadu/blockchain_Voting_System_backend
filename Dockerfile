FROM python:3.11-slim as builder

WORKDIR /app
# Fix the copy path
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV PORT=5000
RUN pip install gunicorn
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "120", "--workers", "4", "--preload", "backend.app:app"]