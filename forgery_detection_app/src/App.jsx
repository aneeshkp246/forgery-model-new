import React, { useState } from 'react';
import './App.css';

function App() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setResult(null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;

    const formData = new FormData();
    formData.append('file', image);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert("Prediction failed. Check backend or console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>🕵️‍♂️ Deepfake Image Detector</h1>

      <input type="file" accept="image/*" onChange={handleImageChange} />
      {previewUrl && <img src={previewUrl} alt="Uploaded Preview" className="preview" />}

      <button onClick={handleSubmit} disabled={!image || loading}>
        {loading ? 'Analyzing...' : 'Predict'}
      </button>

      {result && (
        <div className="result-box">
          <h2>
            Prediction:{' '}
            <span
              style={{
                color: result.label === 'Real' ? '#10b981' : '#ef4444',
              }}
            >
              {result.label}
            </span>
          </h2>
          {typeof result.confidence === 'number' ? (
            <>
              <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>
              <progress value={result.confidence * 100} max="100"></progress>
            </>
          ) : (
            <p style={{ color: 'red' }}>Confidence value not available</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;