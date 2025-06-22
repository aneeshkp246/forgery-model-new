A full-stack application that detects whether an uploaded image is real or AI-generated (deepfake) using a trained TensorFlow model.

## Project Structure

```
deepfake/
├── backend/                 # Flask API backend
│   ├── app.py              # Main Flask application
│   ├── Dockerfile          # Backend Docker configuration
│   ├── requirements.txt    # Python dependencies
│   └── final_model.h5      # Trained TensorFlow model
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx    # Main page
│   │   │   └── api/
│   │   │       └── predict/
│   │   │           └── route.js  # API proxy route
│   │   └── components/
│   │       └── DeepfakeDetector.tsx  # Main component
│   ├── Dockerfile          # Frontend Docker configuration
│   └── package.json        # Node.js dependencies
├── backend-deployment.yaml # Kubernetes backend deployment
├── backend-service.yaml    # Kubernetes backend service
├── frontend-deployment.yaml # Kubernetes frontend deployment
├── frontend-service.yaml  # Kubernetes frontend service
└── docker-compose.yml     # Docker Compose configuration
```

## Features

- **Image Upload**: Upload PNG, JPG, or JPEG images up to 10MB
- **Real-time Detection**: AI-powered detection of deepfake images
- **Confidence Score**: Visual confidence meter with percentage
- **Responsive UI**: Modern, mobile-friendly interface
- **Containerized**: Docker support for easy deployment
- **Kubernetes Ready**: K8s manifests for production deployment

## Tech Stack

**Backend:**
- Flask (Python web framework)
- TensorFlow (ML model inference)
- PIL (Image processing)
- Flask-CORS (Cross-origin requests)

**Frontend:**
- Next.js 14 (React framework)
- TypeScript (Type safety)
- Tailwind CSS (Styling)

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Docker and Docker Compose (optional)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd deepfake
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py
```

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Test the Application

1. Open `http://localhost:3000` in your browser
2. Upload an image using the file picker
3. Click "Predict" to analyze the image
4. View the detection result with confidence score

## Docker Compose Setup

For easier local development with Docker:

```bash
# Build and run both services
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop services
docker-compose down
```

Access the application at `http://localhost:3000`

## Kubernetes Deployment with Minikube

### Prerequisites

- [Minikube](https://minikube.sigs.k8s.io/docs/start/) installed
- kubectl configured

### 1. Start Minikube

```bash
# Start minikube with Docker driver
minikube start --driver=docker

# Enable necessary addons
minikube addons enable ingress
```

### 2. Configure Docker Environment

```bash
# Use minikube's Docker daemon
eval $(minikube docker-env)
```

### 3. Build Docker Images

```bash
# Build backend image
docker build -t deepfake-backend:latest ./backend

# Build frontend image
docker build -t deepfake-frontend:latest ./frontend

# Verify images
docker images | grep deepfake
```

### 4. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f .

# Or apply individually
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
```

### 5. Verify Deployment

```bash
# Check pods status
kubectl get pods

# Check services
kubectl get services

# Check deployments
kubectl get deployments
```

### 6. Access the Application

```bash
# Get the frontend service URL
minikube service deepfake-frontend --url

# Or open directly in browser
minikube service deepfake-frontend
```

### 7. Monitoring and Debugging

```bash
# View pod logs
kubectl logs deployment/deepfake-backend
kubectl logs deployment/deepfake-frontend

# Describe pods for troubleshooting
kubectl describe pod <pod-name>

# Port forward for direct access (alternative)
kubectl port-forward service/deepfake-frontend 3000:80
kubectl port-forward service/deepfake-backend 5000:5000
```

### 8. Cleanup

```bash
# Delete all resources
kubectl delete -f .

# Or delete individually
kubectl delete deployment deepfake-backend deepfake-frontend
kubectl delete service deepfake-backend deepfake-frontend

# Stop minikube
minikube stop
```

## API Endpoints

### Backend (Flask)

- `POST /predict` - Upload image for deepfake detection
  - **Body**: FormData with `file` field
  - **Response**: `{"label": "Real|Fake", "confidence": 0.95}`

### Frontend (Next.js)

- `POST /api/predict` - Proxy endpoint to backend
  - Forwards requests to backend service
  - Handles CORS and error responses

## Configuration

### Environment Variables

**Backend:**
- `FLASK_ENV`: Set to `development` for debug mode
- `MODEL_PATH`: Path to the TensorFlow model file (default: `final_model.h5`)

**Frontend:**
- `NEXT_PUBLIC_API_URL`: Backend API URL (auto-configured in Kubernetes)

### Kubernetes Resources

**Backend:**
- **Memory**: 512Mi - 2Gi (model loading requires significant memory)
- **CPU**: 500m - 1000m
- **Service**: LoadBalancer on port 5000

**Frontend:**
- **Memory**: 256Mi - 512Mi
- **CPU**: 250m - 500m
- **Service**: NodePort on port 30008 (external access)

## Troubleshooting

### Common Issues

1. **Model file not found**: Ensure `final_model.h5` is in the backend directory
2. **CORS errors**: Check that `flask-cors` is installed and configured
3. **Pod crashes**: Check resource limits and available cluster resources
4. **Image pull errors**: Verify Docker images are built in minikube's Docker environment

### Debug Commands

```bash
# Check cluster info
kubectl cluster-info

# View all resources
kubectl get all

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Access pod shell
kubectl exec -it <pod-name> -- /bin/bash
```

## License

This project is licensed under the MIT License.