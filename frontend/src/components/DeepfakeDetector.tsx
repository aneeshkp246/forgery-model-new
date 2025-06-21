'use client';

import { useState, ChangeEvent } from 'react';

const DeepfakeDetector = () => {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [result, setResult] = useState<{ label: string; confidence?: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setResult(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;
    const formData = new FormData();
    formData.append('file', image);
    setLoading(true);

    try {
      let apiUrl = "/api/predict"
      console.log('Using API URL:', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Prediction result:', data);
      setResult(data);
    } catch (err) {
      console.error('Prediction error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Prediction failed: ${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🕵️‍♂️ Deepfake Image Detector</h1>
          <p className="text-gray-600">Upload an image to detect if it's real or AI-generated</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* File Upload Area */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📁</div>
                <p className="text-gray-600 font-medium">Click to upload an image</p>
                <p className="text-sm text-gray-400">PNG, JPG, JPEG up to 10MB</p>
              </div>
            </label>
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-80 rounded-xl shadow-lg object-contain"
                />
              </div>
            </div>
          )}

          {/* Predict Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!image || loading}
              className={`px-8 py-3 rounded-xl text-white font-semibold text-lg transition-all duration-200 ${
                loading || !image
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Predict'
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-blue-500">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detection Result
                </h2>
                
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${
                  result.label === 'Real' 
                    ? 'bg-green-100 text-green-800 border-2 border-green-200' 
                    : 'bg-red-100 text-red-800 border-2 border-red-200'
                }`}>
                  <span className="mr-2">
                    {result.label === 'Real' ? '✅' : '⚠️'}
                  </span>
                  {result.label}
                </div>

                {typeof result.confidence === 'number' && (
                  <div className="space-y-3">
                    <p className="text-gray-700 font-medium">
                      Confidence: <span className="font-bold">{(result.confidence * 100).toFixed(1)}%</span>
                    </p>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          result.label === 'Real' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${result.confidence * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {result.confidence > 0.8 ? 'High confidence' : 
                       result.confidence > 0.6 ? 'Medium confidence' : 'Low confidence'}
                    </div>
                  </div>
                )}

                {typeof result.confidence !== 'number' && (
                  <p className="text-red-500 font-medium">⚠️ Confidence value not available</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeepfakeDetector;