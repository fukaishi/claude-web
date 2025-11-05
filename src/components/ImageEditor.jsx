import { useEffect, useRef, useState } from 'react'

const ImageEditor = ({ imageData, onSave, onError }) => {
  const canvasRef = useRef(null)
  const [baseImage, setBaseImage] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(100)
  const [isClipMode, setIsClipMode] = useState(false)
  const [clipRect, setClipRect] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)

  const CANVAS_SIZE = 512
  const MIN_CLIP_SIZE = 64

  // Initialize or reset baseImage when imageData changes
  useEffect(() => {
    if (imageData) {
      setBaseImage(imageData)
      setRotation(0)
      setScale(100)
      setIsClipMode(false)
      setClipRect(null)
    }
  }, [imageData])

  useEffect(() => {
    if (baseImage && canvasRef.current) {
      drawCanvas()
    }
  }, [baseImage, rotation, scale, clipRect, isClipMode])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !baseImage) return

    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Fill with white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Save context state
      ctx.save()

      // Move to center for rotation
      ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2)
      ctx.rotate((rotation * Math.PI) / 180)

      // Apply scale
      const scaleFactor = scale / 100
      ctx.scale(scaleFactor, scaleFactor)

      // Draw image centered
      ctx.drawImage(img, -CANVAS_SIZE / 2, -CANVAS_SIZE / 2, CANVAS_SIZE, CANVAS_SIZE)

      // Restore context
      ctx.restore()

      // Draw clip rectangle if in clip mode
      if (isClipMode && clipRect && clipRect.size > MIN_CLIP_SIZE) {
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(clipRect.x, clipRect.y, clipRect.size, clipRect.size)
        ctx.setLineDash([])
      }
    }

    img.src = baseImage
  }

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360)
  }

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleScaleChange = (e) => {
    setScale(Number(e.target.value))
  }

  const handleReset = () => {
    setRotation(0)
    setScale(100)
    setIsClipMode(false)
    setClipRect(null)
  }

  const handleMouseDown = (e) => {
    if (!isClipMode) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDragging(true)
    setDragStart({ x, y })
    setClipRect({ x, y, size: 0 })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate square size
    const deltaX = x - dragStart.x
    const deltaY = y - dragStart.y
    const size = Math.min(Math.abs(deltaX), Math.abs(deltaY))

    // Calculate position (ensure square and within bounds)
    const clipX = deltaX < 0 ? dragStart.x - size : dragStart.x
    const clipY = deltaY < 0 ? dragStart.y - size : dragStart.y

    setClipRect({
      x: Math.max(0, Math.min(clipX, CANVAS_SIZE - size)),
      y: Math.max(0, Math.min(clipY, CANVAS_SIZE - size)),
      size: Math.min(size, CANVAS_SIZE)
    })

    drawCanvas()
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  const confirmClipRegion = () => {
    if (!clipRect || clipRect.size < MIN_CLIP_SIZE || !canvasRef.current) {
      onError('有効なクリッピング範囲を選択してください')
      return
    }

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Get the current canvas content (with transformations applied)
      const imageData = ctx.getImageData(clipRect.x, clipRect.y, clipRect.size, clipRect.size)

      // Create temporary canvas for the clipped region
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = clipRect.size
      tempCanvas.height = clipRect.size
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.putImageData(imageData, 0, 0)

      // Resize to 512x512
      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = CANVAS_SIZE
      finalCanvas.height = CANVAS_SIZE
      const finalCtx = finalCanvas.getContext('2d')

      // Fill with white background
      finalCtx.fillStyle = '#FFFFFF'
      finalCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      finalCtx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Update base image with clipped region
      const newImageData = finalCanvas.toDataURL('image/png')
      setBaseImage(newImageData)

      // Reset transformations and clip mode
      setRotation(0)
      setScale(100)
      setIsClipMode(false)
      setClipRect(null)
    } catch (error) {
      console.error('Clip error:', error)
      onError('クリッピング処理に失敗しました')
    }
  }

  const handleSave = () => {
    if (!canvasRef.current) return

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png')
      onSave(dataUrl)
    } catch (error) {
      onError('画像の保存に失敗しました')
    }
  }

  if (!imageData) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded border-2 border-dashed border-gray-300">
        <p className="text-gray-500">画像をアップロードしてください</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className={`border border-gray-300 rounded ${isClipMode ? 'cursor-crosshair' : 'cursor-default'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Rotation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRotateLeft}
            disabled={isClipMode}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition ${isClipMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ← 回転
          </button>
          <button
            onClick={handleRotateRight}
            disabled={isClipMode}
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition ${isClipMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            回転 →
          </button>
          <span className="text-sm text-gray-600 ml-2">{rotation}°</span>
        </div>

        {/* Scale */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            拡大縮小: {scale}%
          </label>
          <input
            type="range"
            min="50"
            max="300"
            value={scale}
            onChange={handleScaleChange}
            disabled={isClipMode}
            className={`w-full ${isClipMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Clip Mode */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsClipMode(!isClipMode)
                setClipRect(null)
                if (!isClipMode) {
                  // Reset transformations when entering clip mode
                  setRotation(0)
                  setScale(100)
                }
              }}
              className={`px-4 py-2 rounded transition ${
                isClipMode
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isClipMode ? 'クリッピングモード ON' : 'クリッピングモード OFF'}
            </button>
            {isClipMode && !clipRect && (
              <span className="text-xs text-gray-600">
                ドラッグして正方形を選択
              </span>
            )}
          </div>

          {/* Confirm Clip Button */}
          {isClipMode && clipRect && clipRect.size >= MIN_CLIP_SIZE && (
            <button
              onClick={confirmClipRegion}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition font-medium"
            >
              範囲を確定して編集モードへ
            </button>
          )}

          {isClipMode && (
            <p className="text-xs text-gray-500">
              ※ 範囲を選択して確定すると、選択範囲のみを切り出して編集できます
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isClipMode}
            className={`flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition font-medium ${isClipMode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            保存
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            リセット
          </button>
        </div>

        {isClipMode && (
          <p className="text-xs text-orange-600">
            ⚠ クリッピングモード中は回転・拡大縮小・保存が無効です
          </p>
        )}
      </div>
    </div>
  )
}

export default ImageEditor
