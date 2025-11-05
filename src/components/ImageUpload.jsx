import { useRef, useState, useEffect } from 'react'

const ImageUpload = ({ onImageUpload, onError }) => {
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
  const [isEyedropping, setIsEyedropping] = useState(false)

  const CANVAS_SIZE = 512
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const backgroundColors = [
    { value: '#FFFFFF', label: '白', colorClass: 'bg-white' },
    { value: '#000000', label: '黒', colorClass: 'bg-black' },
    { value: '#808080', label: 'グレー', colorClass: 'bg-gray-500' },
    { value: '#F0F0F0', label: '明るいグレー', colorClass: 'bg-gray-200' },
  ]

  // Re-render canvas when background color changes
  useEffect(() => {
    if (!previewImage || !canvasRef.current) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')

      // Fill with background color
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
  }, [backgroundColor, previewImage])

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
      // Store preview image and reset background color
      setPreviewImage(e.target.result)
      setBackgroundColor('#FFFFFF')
      setIsEyedropping(false)
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

  const handleCanvasClick = (e) => {
    if (!isEyedropping || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Get pixel color at clicked position
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(x, y, 1, 1)
    const [r, g, b] = imageData.data

    // Convert to hex
    const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`

    setBackgroundColor(hexColor)
    setIsEyedropping(false)
  }

  const handleConfirm = () => {
    if (!canvasRef.current) return

    const dataUrl = canvasRef.current.toDataURL('image/png')
    onImageUpload(dataUrl)

    // Reset preview
    setPreviewImage(null)
    setBackgroundColor('#FFFFFF')
  }

  const handleCancel = () => {
    setPreviewImage(null)
    setBackgroundColor('#FFFFFF')
    setIsEyedropping(false)
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
            className={`border border-gray-300 rounded ${isEyedropping ? 'cursor-crosshair' : 'cursor-default'}`}
            onClick={handleCanvasClick}
          />
        </div>

        {/* Background Color Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            背景色を選択
          </label>

          {/* Preset Colors */}
          <div className="flex flex-wrap gap-2">
            {backgroundColors.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  setBackgroundColor(color.value)
                  setIsEyedropping(false)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded border-2 transition ${
                  backgroundColor === color.value && !isEyedropping
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className={`w-6 h-6 rounded border border-gray-400 ${color.colorClass}`}></div>
                <span className="text-sm">{color.label}</span>
              </button>
            ))}
          </div>

          {/* Eyedropper Tool */}
          <button
            onClick={() => setIsEyedropping(!isEyedropping)}
            className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition ${
              isEyedropping
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span className="text-sm font-medium">
              {isEyedropping ? 'スポイトモード ON - 画像をクリック' : 'スポイトで色を抽出'}
            </span>
          </button>

          {/* Current Color Display */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
            <div
              className="w-12 h-12 rounded border-2 border-gray-400"
              style={{ backgroundColor }}
            ></div>
            <div className="text-sm">
              <div className="font-medium text-gray-700">現在の背景色</div>
              <div className="text-gray-500 font-mono">{backgroundColor}</div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            ※ プリセットから選択、またはスポイトツールで画像から色を抽出できます
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition font-medium"
          >
            この背景色で確定
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
