import { useRef, useState, useEffect } from 'react'

const ImageUpload = ({ onImageUpload, onError }) => {
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
  const [isPickingColor, setIsPickingColor] = useState(false)

  const CANVAS_SIZE = 512
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  // Preset background colors
  const PRESET_COLORS = [
    { name: '白', value: '#FFFFFF' },
    { name: '黒', value: '#000000' },
    { name: '緑', value: '#00FF00' },
    { name: '青', value: '#0000FF' },
    { name: '赤', value: '#FF0000' }
  ]

  // Render canvas when image is uploaded or background color changes
  useEffect(() => {
    if (!previewImage || !canvasRef.current) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')

      // Fill with selected background color
      ctx.fillStyle = backgroundColor
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
  }, [previewImage, backgroundColor])

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
    onImageUpload(dataUrl, backgroundColor)

    // Reset preview
    setPreviewImage(null)
    setBackgroundColor('#FFFFFF')
    setIsPickingColor(false)
  }

  const handleCancel = () => {
    setPreviewImage(null)
    setBackgroundColor('#FFFFFF')
    setIsPickingColor(false)
  }

  const handleCanvasClick = (e) => {
    if (!isPickingColor || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * (CANVAS_SIZE / rect.width))
    const y = Math.floor((e.clientY - rect.top) * (CANVAS_SIZE / rect.height))

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(x, y, 1, 1)
    const [r, g, b] = imageData.data

    const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    setBackgroundColor(hexColor.toUpperCase())
    setIsPickingColor(false)
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
            className={`border border-gray-300 rounded ${isPickingColor ? 'cursor-crosshair' : ''}`}
            onClick={handleCanvasClick}
          />
        </div>

        <p className="text-sm text-gray-600 text-center">
          画像が512×512pxに自動調整されました
        </p>

        {/* Background Color Settings */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">背景色設定</h3>

          {/* Current Color Display */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">現在の背景色:</span>
            <div
              className="w-8 h-8 rounded border-2 border-gray-300"
              style={{ backgroundColor }}
            />
            <span className="text-sm font-mono text-gray-700">{backgroundColor}</span>
          </div>

          {/* Preset Colors */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">プリセット色:</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBackgroundColor(color.value)}
                  className={`px-3 py-1 rounded border-2 transition ${
                    backgroundColor === color.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  title={color.value}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded border border-gray-400"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs">{color.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">カスタム色:</label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())}
              className="w-12 h-8 rounded cursor-pointer"
            />
          </div>

          {/* Pick from Image */}
          <button
            onClick={() => setIsPickingColor(!isPickingColor)}
            className={`w-full px-4 py-2 rounded border-2 transition ${
              isPickingColor
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            {isPickingColor ? '画像から色を選択中...' : '画像から色を取得'}
          </button>
          {isPickingColor && (
            <p className="text-xs text-green-600 text-center">
              画像上をクリックして色を選択してください
            </p>
          )}
        </div>

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
