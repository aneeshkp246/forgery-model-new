# Deepfake Detection Project - Directory Structure

```
/home/aneesh/Desktop/cdg/deepfake/
│
├── frontend/                              # Next.js Frontend Application
│   ├── .gitignore                        # Git ignore rules for frontend
│   ├── Dockerfile                        # Docker configuration for frontend
│   ├── README.md                         # Frontend documentation
│   ├── package.json                      # NPM dependencies and scripts
│   ├── tsconfig.json                     # TypeScript configuration
│   ├── next.config.ts                    # Next.js configuration
│   ├── postcss.config.mjs                # PostCSS configuration for Tailwind
│   │
│   └── src/                              # Source code directory
│       ├── app/                          # Next.js App Router directory
│       │   ├── globals.css               # Global CSS styles with Tailwind
│       │   ├── layout.tsx                # Root layout component
│       │   ├── page.tsx                  # Home page component
│       │   │
│       │   └── api/                      # API routes
│       │       └── predict/              # Prediction API endpoint
│       │           └── route.js          # API route handler (proxy to backend)
│       │
│       └── components/                   # React components
│           └── ForgeryDetector.tsx       # Main detection interface component
│
├── backend/                              # Python Flask Backend Application
│   ├── Dockerfile                        # Docker configuration for backend
│   ├── requirements.txt                  # Python dependencies
│   └── app.py                           # Main Flask application (referenced but not provided)
│   └── models/                          # AI Models directory (inferred)
│       ├── deepfake/                    # DeepFake detection models
│       ├── resnet/                      # ResNet forgery detection models
│       └── mvssnet/                     # MVSSNet segmentation models
│           ├── casia/                   # CASIA model
│           └── defacto/                 # DEFACTO model
│
├── backend-service.yaml                  # Kubernetes service configuration
│
└── docker-compose.yml                   # Docker Compose file (suggested)
```

## Frontend Structure Details

### Technologies Used:
- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI**: React 19
- **Build Tool**: Next.js built-in bundler
- **File Upload**: JSZip for ZIP file handling

### Key Frontend Files:
- `src/app/page.tsx` - Main page importing ForgeryDetector
- `src/components/ForgeryDetector.tsx` - Main UI component with image upload, analysis, and results
- `src/app/api/predict/route.js` - API proxy to backend service
- `src/app/layout.tsx` - Root layout with font configuration
- `src/app/globals.css` - Tailwind CSS imports and global styles

## Backend Structure Details

### Technologies Used (Inferred):
- **Framework**: Flask 2.2.5
- **ML Libraries**: PyTorch 1.13.1, torchvision 0.14.1
- **Image Processing**: Pillow 11.1.0, matplotlib 3.8.0
- **Server**: Gunicorn for production
- **CORS**: Flask-CORS 3.0.10

### API Endpoints (Based on frontend usage):
- `POST /predict` - Main prediction endpoint accepting image files

### Model Types (Based on frontend results):
1. **DeepFake Detection** - Binary classification (Real/Fake)
2. **ResNet Forgery Detection** - Traditional forgery detection (Authentic/Forged)
3. **MVSSNet Segmentation** - Pixel-level forgery localization
   - CASIA model variant
   - DEFACTO model variant

## Deployment Configuration

### Docker:
- Frontend: Node.js 18 Alpine container on port 3000
- Backend: Python 3.9 slim container on port 5000

### Kubernetes:
- Backend service configured as LoadBalancer
- Service name: `backend-service`
- Internal communication on port 5000

## Development Workflow

### Frontend Development:
```bash
cd frontend
npm install
npm run dev  # Development server on localhost:3000
```

### Backend Development:
```bash
cd backend
pip install -r requirements.txt
python app.py  # Development server on localhost:5000
```

### Production Deployment:
- Use Docker containers for both services
- Kubernetes configuration provided for backend
- Frontend configured to proxy API calls to backend service
```
