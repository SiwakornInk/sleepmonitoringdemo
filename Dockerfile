FROM python:3.11-slim

WORKDIR /app

# Copy only what we need
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend ./backend
COPY shhs_subset ./shhs_subset

# Run app
CMD ["python", "backend/main_production.py"]