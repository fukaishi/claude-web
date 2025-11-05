import { useState } from 'react'
import ImageUpload from './components/ImageUpload'
import ImageEditor from './components/ImageEditor'
import SavedImages from './components/SavedImages'
import AnimationSettings from './components/AnimationSettings'
import './App.css'

function App() {
  const [currentImage, setCurrentImage] = useState(null)
  const [savedImages, setSavedImages] = useState([])
  const [error, setError] = useState('')

  const handleImageUpload = (imageData) => {
    setCurrentImage(imageData)
    setError('')
  }

  const handleSaveImage = (imageData) => {
    const newImage = {
      id: Date.now().toString(),
      imageData: imageData,
      thumbnail: imageData, // Will be resized in SavedImages component
      createdAt: Date.now()
    }
    setSavedImages([...savedImages, newImage])
    setError('')
  }

  const handleDeleteImage = (id) => {
    setSavedImages(savedImages.filter(img => img.id !== id))
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
    setTimeout(() => setError(''), 5000)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 relative">
      <div className="container mx-auto px-4 pb-16">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          GIFアニメジェネレーター
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* STEP 1: Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">
              STEP 1: アップロード
            </h2>
            <ImageUpload onImageUpload={handleImageUpload} onError={handleError} />
          </div>

          {/* STEP 2: Edit */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">
              STEP 2: 画像編集
            </h2>
            <ImageEditor
              imageData={currentImage}
              onSave={handleSaveImage}
              onError={handleError}
            />
          </div>
        </div>

        {/* STEP 3: Saved Images */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            STEP 3: 保存済み画像
          </h2>
          <SavedImages
            images={savedImages}
            onDelete={handleDeleteImage}
          />
        </div>

        {/* STEP 4: Animation Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            STEP 4: アニメーション設定
          </h2>
          <AnimationSettings
            savedImages={savedImages}
            onError={handleError}
          />
        </div>
      </div>

      {/* Footer - Copyright */}
      <footer className="fixed bottom-4 right-4 text-sm text-gray-600">
        &copy; 2025 GIFアニメジェネレーター
      </footer>
    </div>
  )
}

export default App
