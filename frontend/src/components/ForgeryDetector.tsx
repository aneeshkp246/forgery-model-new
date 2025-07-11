'use client';

import { useState, ChangeEvent } from 'react';
import JSZip from 'jszip';

interface PredictionResult {
  deepfake?: {
    label: string;
    confidence: number;
  };
  resnet?: {
    label: string;
    confidence: number;
  };
  segmentation?: {
    casia: {
      predicted_mask: string;
      binary_mask: string;
    };
    defacto: {
      predicted_mask: string;
      binary_mask: string;
    };
  };
  message?: string;
}

interface ImageData {
  file: File;
  previewUrl: string;
  result?: PredictionResult;
  loading?: boolean;
  error?: string;
}

const ForgeryDetector = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple' | 'zip'>('multiple')

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: ImageData[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const imageData: ImageData = {
            file,
            previewUrl: reader.result as string,
          };
          newImages.push(imageData);
          
          if (newImages.length === files.length) {
            setImages(newImages);
            setCurrentIndex(0);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleZipUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.zip')) {
      alert('Please upload a valid ZIP file');
      return;
    }

    try {
      setBatchProcessing(true);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const newImages: ImageData[] = [];
      
      // Get all image files from the ZIP
      const imageFiles = Object.keys(zipContent.files).filter(filename => {
        const file = zipContent.files[filename];
        return !file.dir && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename);
      });

      if (imageFiles.length === 0) {
        alert('No image files found in the ZIP file');
        setBatchProcessing(false);
        return;
      }

      // Process each image file
      for (const filename of imageFiles) {
        try {
          const fileData = zipContent.files[filename];
          const blob = await fileData.async('blob');
          
          // Create a File object from the blob
          const imageFile = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          
          // Create preview URL
          const previewUrl = URL.createObjectURL(blob);
          
          newImages.push({
            file: imageFile,
            previewUrl: previewUrl,
          });
        } catch (error) {
          console.error(`Error processing ${filename}:`, error);
        }
      }

      if (newImages.length > 0) {
        setImages(newImages);
        setCurrentIndex(0);
        alert(`Successfully loaded ${newImages.length} images from ZIP file`);
      } else {
        alert('Failed to process any images from the ZIP file');
      }
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      alert('Error processing ZIP file. Please make sure it\'s a valid ZIP file containing images.');
    } finally {
      setBatchProcessing(false);
    }
  };

  const predictSingle = async (imageData: ImageData, index: number): Promise<PredictionResult> => {
    const formData = new FormData();
    formData.append('image', imageData.file);

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
      
      return data;
    } catch (error) {
      console.error(`Prediction error for image ${index + 1}:`, error);
      throw error;
    }
  };

  const handleSinglePredict = async () => {
    if (images.length === 0) return;
    
    const currentImage = images[currentIndex];
    const updatedImages = [...images];
    updatedImages[currentIndex] = { ...currentImage, loading: true, error: undefined };
    setImages(updatedImages);

    try {
      const result = await predictSingle(currentImage, currentIndex);
      const finalUpdatedImages = [...images];
      finalUpdatedImages[currentIndex] = { ...currentImage, result, loading: false };
      setImages(finalUpdatedImages);
    } catch (error) {
      const finalUpdatedImages = [...images];
      finalUpdatedImages[currentIndex] = { 
        ...currentImage, 
        loading: false, 
        error: error instanceof Error ? error.message : String(error)
      };
      setImages(finalUpdatedImages);
      alert(`Prediction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleBatchPredict = async () => {
    if (images.length === 0) return;
    
    setBatchProcessing(true);
    const updatedImages = [...images];
    
    // Set all images to loading state
    updatedImages.forEach((img, index) => {
      updatedImages[index] = { ...img, loading: true, error: undefined };
    });
    setImages(updatedImages);

    // Process all images
    for (let i = 0; i < images.length; i++) {
      try {
        const result = await predictSingle(images[i], i);
        updatedImages[i] = { ...updatedImages[i], result, loading: false };
        setImages([...updatedImages]);
      } catch (error) {
        updatedImages[i] = { 
          ...updatedImages[i], 
          loading: false, 
          error: error instanceof Error ? error.message : String(error)
        };
        setImages([...updatedImages]);
        console.error(`Failed to process image ${i + 1}:`, error);
      }
    }
    
    setBatchProcessing(false);
  };

  const downloadCSV = () => {
    if (images.length === 0) return;

    const csvHeaders = [
      'Image Name', 
      'Final Decision',
      'DeepFake Label', 
      'DeepFake Confidence (%)',
      'ResNet Label',
      'ResNet Confidence (%)',
      'Has Segmentation',
      'Message'
    ];
    
    const csvRows = images.map((imageData, index) => {
      const fileName = imageData.file.name;
      const result = imageData.result;
      
      if (!result) {
        return [fileName, 'Not processed', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', imageData.error || 'N/A'];
      }
      
      // Determine final decision based on the API response
      let finalDecision = 'Unknown';
      if (result.message) {
        finalDecision = result.deepfake?.label === 'Fake' ? 'Fake (DeepFake)' : 'Unknown';
      } else if (result.deepfake && result.resnet) {
        if (result.deepfake.label === 'Fake') {
          finalDecision = 'Fake (DeepFake)';
        } else if (result.resnet.label === 'Forged') {
          finalDecision = 'Forged (Traditional)';
        } else {
          finalDecision = 'Authentic';
        }
      } else if (result.deepfake) {
        finalDecision = result.deepfake.label === 'Fake' ? 'Fake (DeepFake)' : 'Real';
      }
      
      const deepfakeLabel = result.deepfake?.label || 'N/A';
      const deepfakeConf = result.deepfake?.confidence ? 
        (result.deepfake.label === 'Fake' ? 
          (100 - result.deepfake.confidence * 100).toFixed(1) : 
          (result.deepfake.confidence * 100).toFixed(1)
        ) : 'N/A';
      const resnetLabel = result.resnet?.label || 'N/A';
      const resnetConf = result.resnet?.confidence ? 
          (result.resnet.label === 'Authentic' ? 
            (100 - result.resnet.confidence * 100).toFixed(1) : 
            (result.resnet.confidence * 100).toFixed(1)
          ) : 'N/A';
      const hasSegmentation = result.segmentation ? 'Yes' : 'No';
      const message = result.message || 'N/A';
      
      return [fileName, finalDecision, deepfakeLabel, deepfakeConf, resnetLabel, resnetConf, hasSegmentation, message];
    });

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'forgery_detection_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
    } else {
      setCurrentIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
    }
  };

  const getFinalDecision = (result: PredictionResult) => {
    if (result.message) {
      return result.deepfake?.label === 'Fake' ? 'Fake (DeepFake)' : 'Unknown';
    } else if (result.deepfake && result.resnet) {
      if (result.deepfake.label === 'Fake') {
        return 'Fake (DeepFake)';
      } else if (result.resnet.label === 'Forged') {
        return 'Forged (Traditional)';
      } else {
        return 'Authentic';
      }
    } else if (result.deepfake) {
      return result.deepfake.label === 'Fake' ? 'Fake (DeepFake)' : 'Real';
    }
    return 'Unknown';
  };

  const getResultColor = (finalDecision: string) => {
    if (finalDecision.includes('Authentic') || finalDecision.includes('Real')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (finalDecision.includes('Fake') || finalDecision.includes('Forged')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getResultIcon = (finalDecision: string) => {
    if (finalDecision.includes('Authentic') || finalDecision.includes('Real')) {
      return '✅';
    } else if (finalDecision.includes('Fake') || finalDecision.includes('Forged')) {
      return '⚠️';
    }
    return '❓';
  };

  const currentImage = images[currentIndex];
  const hasResults = images.some(img => img.result);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🔍 Advanced Forgery & Deepfake Detector</h1>
          <p className="text-gray-600">Multi-stage detection using DeepFake, ResNet, and MVSSNet models</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Upload Mode Selection */}
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={() => setUploadMode('multiple')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                uploadMode === 'multiple' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Single/Multiple Images
            </button>
            <button
              onClick={() => setUploadMode('zip')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                uploadMode === 'zip' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ZIP File
            </button>
          </div>

          {/* File Upload Area */}
          <div className="relative">
            <input
              type="file"
              accept={uploadMode === 'zip' ? '.zip' : 'image/*'}
              multiple={uploadMode === 'multiple'}
              onChange={uploadMode === 'zip' ? handleZipUpload : handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📁</div>
                <p className="text-gray-600 font-medium">
                  {uploadMode === 'multiple' && 'Click to upload single or multiple images'}
                  {uploadMode === 'zip' && 'Click to upload a ZIP file'}
                </p>
                <p className="text-sm text-gray-400">
                  {uploadMode === 'zip' ? 'ZIP files containing images' : 'PNG, JPG, JPEG up to 5MB each'}
                </p>
              </div>
            </label>
          </div>

          {/* ZIP Processing Indicator */}
          {uploadMode === 'zip' && batchProcessing && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-blue-800 font-medium">Extracting images from ZIP file...</p>
                </div>
                <p className="text-sm text-blue-600">Please wait while we process your ZIP file</p>
              </div>
            </div>
          )}

          {/* Image Count and Navigation */}
          {images.length > 0 && (
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold text-gray-700">
                Image {currentIndex + 1} of {images.length}
              </div>
              
              {images.length > 1 && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigateImage('prev')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => navigateImage('next')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Image Preview */}
          {currentImage && (
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src={currentImage.previewUrl} 
                  alt={`Preview ${currentIndex + 1}`}
                  className="max-w-full max-h-80 rounded-xl shadow-lg object-contain"
                />
                {currentImage.error && (
                  <div className="absolute inset-0 bg-red-100 bg-opacity-90 flex items-center justify-center rounded-xl">
                    <div className="text-center p-4">
                      <div className="text-red-600 text-2xl mb-2">❌</div>
                      <p className="text-red-800 font-medium">Analysis Failed</p>
                      <p className="text-red-600 text-sm">{currentImage.error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {images.length > 0 && (
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleSinglePredict}
                disabled={!currentImage || currentImage.loading}
                className={`px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 ${
                  currentImage?.loading || !currentImage
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
                }`}
              >
                {currentImage?.loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  'Analyze Current Image'
                )}
              </button>

              {images.length > 1 && (
                <button
                  onClick={handleBatchPredict}
                  disabled={batchProcessing}
                  className={`px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 ${
                    batchProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:scale-105'
                  }`}
                >
                  {batchProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing All...</span>
                    </div>
                  ) : (
                    'Analyze All Images'
                  )}
                </button>
              )}

              {hasResults && (
                <button
                  onClick={downloadCSV}
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                >
                  📥 Download Results
                </button>
              )}
            </div>
          )}

          {/* Detailed Results */}
          {currentImage?.result && (
            <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-blue-500 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Analysis Results - Image {currentIndex + 1}
                </h2>
                
                {/* Final Decision */}
                <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold border-2 mb-6 ${
                  getResultColor(getFinalDecision(currentImage.result))
                }`}>
                  <span className="mr-2 text-xl">
                    {getResultIcon(getFinalDecision(currentImage.result))}
                  </span>
                  {getFinalDecision(currentImage.result)}
                </div>

                {/* Message from backend */}
                {currentImage.result.message && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 font-medium">{currentImage.result.message}</p>
                  </div>
                )}
              </div>

              {/* Detailed Results */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* DeepFake Detection */}
                {currentImage.result.deepfake && (
                  <div className="bg-white rounded-lg p-4 border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">🤖 DeepFake Detection</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Label:</span>
                        <span className={`font-semibold ${
                          currentImage.result.deepfake.label === 'Real' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {currentImage.result.deepfake.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold">
                           {currentImage.result.deepfake.label === 'Fake' ? 
                                      (100 - currentImage.result.deepfake.confidence * 100).toFixed(1) : 
                                      (currentImage.result.deepfake.confidence * 100).toFixed(1)
                                    }%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            currentImage.result.deepfake.label === 'Real' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${currentImage.result.deepfake.label === 'Fake' ? 
                                  100 - currentImage.result.deepfake.confidence * 100 : 
                                  currentImage.result.deepfake.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ResNet Detection */}
                {currentImage.result.resnet && (
                  <div className="bg-white rounded-lg p-4 border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">🔍 Traditional Forgery Detection</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Label:</span>
                        <span className={`font-semibold ${
                          currentImage.result.resnet.label === 'Authentic' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {currentImage.result.resnet.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold">
                          {currentImage.result.resnet.label === 'Authentic' ? 
                            (100 - currentImage.result.resnet.confidence * 100).toFixed(1) : 
                            (currentImage.result.resnet.confidence * 100).toFixed(1)
                          }%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            currentImage.result.resnet.label === 'Authentic' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${currentImage.result.resnet.label === 'Authentic' ? 
                              100 - currentImage.result.resnet.confidence * 100 : 
                              currentImage.result.resnet.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MVSSNet Segmentation */}
              {currentImage.result.segmentation && (
                <div className="bg-white rounded-lg p-4 border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 Segmentation Analysis</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* CASIA Model Results */}
                    {currentImage.result.segmentation.casia && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-700">CASIA Model</h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Predicted Mask:</p>
                            <img 
                              src={`data:image/png;base64,${currentImage.result.segmentation.casia.predicted_mask}`}
                              alt="CASIA Predicted Mask"
                              className="w-full h-32 object-contain border rounded"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Binary Mask:</p>
                            <img 
                              src={`data:image/png;base64,${currentImage.result.segmentation.casia.binary_mask}`}
                              alt="CASIA Binary Mask"
                              className="w-full h-32 object-contain border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* DEFACTO Model Results */}
                    {currentImage.result.segmentation.defacto && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-700">DEFACTO Model</h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Predicted Mask:</p>
                            <img 
                              src={`data:image/png;base64,${currentImage.result.segmentation.defacto.predicted_mask}`}
                              alt="DEFACTO Predicted Mask"
                              className="w-full h-32 object-contain border rounded"
                            />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Binary Mask:</p>
                            <img 
                              src={`data:image/png;base64,${currentImage.result.segmentation.defacto.binary_mask}`}
                              alt="DEFACTO Binary Mask"
                              className="w-full h-32 object-contain border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batch Processing Progress */}
          {batchProcessing && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="text-center">
                <p className="text-blue-800 font-medium mb-2">Processing images...</p>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(images.filter(img => img.result || img.error || !img.loading).length / images.length) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {images.filter(img => img.result || img.error).length} of {images.length} completed
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgeryDetector;