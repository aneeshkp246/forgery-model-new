FROM python:3.9-slim

WORKDIR /app

# Install system dependencies needed by PIL, matplotlib, and OpenCV if used
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the full application
COPY . .

# Expose port used by Flask
EXPOSE 5000

# Start the Flask app
CMD ["python", "app.py"]
