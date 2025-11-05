import { useRef, useState, useEffect } from 'react'

const ImageUpload = ({ onImageUpload, onError }) => {
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const CANVAS_SIZE = 512
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  // Render canvas when image is uploaded
  useEffect(() => {
    if (!previewImage || !canvasRef.current) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')

      // Fill with white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Calculate dimensions for center cropping
      const scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height)
      const scaledWidth = img.width * scale
      const scaledHeight = img.height * scale

      const x = (CANVAS_SIZE - scaledWidth) / 2
      const y = (CANVAS_SIZE - scaledHeight) / 2

      // Draw image centered and cropped
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
    }
    img.src = previewImage
  }, [previewImage])

  const processImage = (file) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      onError('対応していない画像形式です')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      onError('ファイルサイズが大きすぎます')
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      setPreviewImage(e.target.result)
    }

    reader.onerror = () => {
      onError('画像の読み込みに失敗しました')
    }

    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processImage(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      processImage(file)
    }
  }

  const handleClick = () => {
    if (!previewImage) {
      fileInputRef.current?.click()
    }
  }

  const handleConfirm = () => {
    if (!canvasRef.current) return

    const dataUrl = canvasRef.current.toDataURL('image/png')
    onImageUpload(dataUrl)

    // Reset preview
    setPreviewImage(null)
  }

  const handleCancel = () => {
    setPreviewImage(null)
  }

  if (previewImage) {
    return (
      <div className="space-y-4">
        {/* Preview Canvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="border border-gray-300 rounded"
          />
        </div>

        <p className="text-sm text-gray-600 text-center">
          画像が512×512pxに自動調整されました
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition font-medium"
          >
            この画像で確定
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600 hover:text-blue-500">
              ファイルを選択
            </span>
            <span> または ドラッグ&ドロップ</span>
          </div>
          <p className="text-xs text-gray-500">
            JPEG, PNG, GIF, WebP (最大10MB)
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        ※ アップロードした画像は自動的に512×512pxにクリッピングされます
      </p>
    </div>
  )
}

export default ImageUpload
