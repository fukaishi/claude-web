import { useEffect, useRef, useState } from 'react'

const ImageEditor = ({ imageData, onSave, onError }) => {
  const canvasRef = useRef(null)
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(100)
  const [isClipMode, setIsClipMode] = useState(false)
  const [clipRect, setClipRect] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)

  const CANVAS_SIZE = 512
  const MIN_CLIP_SIZE = 64

  useEffect(() => {
    if (imageData && canvasRef.current) {
      drawCanvas()
    }
  }, [imageData, rotation, scale])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !imageData) return

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
      if (isClipMode && clipRect) {
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(clipRect.x, clipRect.y, clipRect.size, clipRect.size)
        ctx.setLineDash([])
      }
    }

    img.src = imageData
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

    // Ensure minimum size
    if (size < MIN_CLIP_SIZE) return

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

  const applyClip = () => {
    if (!clipRect || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Get clipped area
    const imageData = ctx.getImageData(clipRect.x, clipRect.y, clipRect.size, clipRect.size)

    // Create new canvas for resizing
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
    finalCtx.drawImage(tempCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Update current image
    const newImageData = finalCanvas.toDataURL('image/png')

    // Reset states
    setRotation(0)
    setScale(100)
    setIsClipMode(false)
    setClipRect(null)

    // Trigger re-render with new image
    if (onSave) {
      onSave(newImageData)
    }
  }

  const handleSave = () => {
    if (!canvasRef.current) return

    try {
      if (isClipMode && clipRect) {
        applyClip()
      } else {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        onSave(dataUrl)
      }
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
          className="border border-gray-300 rounded cursor-crosshair"
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
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            ← 回転
          </button>
          <button
            onClick={handleRotateRight}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
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
            className="w-full"
          />
        </div>

        {/* Clip Mode */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsClipMode(!isClipMode)
              setClipRect(null)
            }}
            className={`px-4 py-2 rounded transition ${
              isClipMode
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isClipMode ? 'クリッピングモード ON' : 'クリッピングモード OFF'}
          </button>
          {isClipMode && (
            <span className="text-xs text-gray-600">
              ドラッグして正方形を選択
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition font-medium"
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
      </div>
    </div>
  )
}

export default ImageEditor
