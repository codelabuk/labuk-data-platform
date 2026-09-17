FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend-build /static/dist ./static/dist
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers","2","--timeout","60","app:create_app()"]
