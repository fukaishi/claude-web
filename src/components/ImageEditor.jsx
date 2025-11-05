import { useEffect, useRef, useState } from 'react'

const ImageEditor = ({ imageData, onSave, onError }) => {
  const canvasRef = useRef(null)
  const [baseImage, setBaseImage] = useState(null)

  // Normal mode transforms
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(100)

  // Clipping mode states
  const [isClipMode, setIsClipMode] = useState(false)
  const [clipRect, setClipRect] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)

  // Clip editing states
  const [isEditingClip, setIsEditingClip] = useState(false)
  const [originalImage, setOriginalImage] = useState(null)
  const [clipRegion, setClipRegion] = useState(null)
  const [clipImageData, setClipImageData] = useState(null)
  const [clipRotation, setClipRotation] = useState(0)
  const [clipScaleX, setClipScaleX] = useState(100)
  const [clipScaleY, setClipScaleY] = useState(100)
  const [clipOffsetX, setClipOffsetX] = useState(0)
  const [clipOffsetY, setClipOffsetY] = useState(0)
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true)

  const CANVAS_SIZE = 512
  const MIN_CLIP_SIZE = 32

  // Initialize or reset baseImage when imageData changes
  useEffect(() => {
    if (imageData) {
      setBaseImage(imageData)
      setRotation(0)
      setScale(100)
      setIsClipMode(false)
      setClipRect(null)
      setIsEditingClip(false)
    }
  }, [imageData])

  useEffect(() => {
    if (baseImage && canvasRef.current) {
      drawCanvas()
    }
  }, [baseImage, rotation, scale, clipRect, isClipMode, isEditingClip, clipRotation, clipScaleX, clipScaleY, clipOffsetX, clipOffsetY])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !baseImage) return

    const ctx = canvas.getContext('2d')

    if (isEditingClip && originalImage && clipImageData) {
      // Editing clip mode: show original + transformed clip region
      drawClipEditMode(ctx)
    } else {
      // Normal mode or clip selection mode
      drawNormalMode(ctx)
    }
  }

  const drawNormalMode = (ctx) => {
    const img = new Image()

    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.setLineDash([]) // Reset line dash to solid

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
      if (isClipMode && !isEditingClip && clipRect && clipRect.width > MIN_CLIP_SIZE && clipRect.height > MIN_CLIP_SIZE) {
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(clipRect.x, clipRect.y, clipRect.width, clipRect.height)
        ctx.setLineDash([])
      }
    }

    img.src = baseImage
  }

  const drawClipEditMode = (ctx) => {
    const originalImg = new Image()
    const clipImg = new Image()

    let imagesLoaded = 0
    const checkAllLoaded = () => {
      imagesLoaded++
      if (imagesLoaded === 2) {
        renderClipEdit()
      }
    }

    const renderClipEdit = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.setLineDash([]) // Reset line dash to solid

      // Fill with white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Draw original image as background
      ctx.drawImage(originalImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Draw transformed clip region
      ctx.save()

      // Calculate center of clip region
      const centerX = clipRegion.x + clipRegion.width / 2 + clipOffsetX
      const centerY = clipRegion.y + clipRegion.height / 2 + clipOffsetY

      // Translate to clip center
      ctx.translate(centerX, centerY)

      // Rotate
      ctx.rotate((clipRotation * Math.PI) / 180)

      // Scale (separate X and Y)
      const scaleFactorX = clipScaleX / 100
      const scaleFactorY = clipScaleY / 100
      ctx.scale(scaleFactorX, scaleFactorY)

      // Draw clip image centered
      ctx.drawImage(clipImg, -clipRegion.width / 2, -clipRegion.height / 2, clipRegion.width, clipRegion.height)

      ctx.restore()

      // Draw bounding box
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate((clipRotation * Math.PI) / 180)
      ctx.scale(scaleFactorX, scaleFactorY)
      ctx.strokeStyle = '#10B981'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(-clipRegion.width / 2, -clipRegion.height / 2, clipRegion.width, clipRegion.height)
      ctx.setLineDash([])
      ctx.restore()
    }

    originalImg.onload = checkAllLoaded
    clipImg.onload = checkAllLoaded
    originalImg.src = originalImage
    clipImg.src = clipImageData
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

  const handleClipScaleXChange = (e) => {
    const newScaleX = Number(e.target.value)
    setClipScaleX(newScaleX)
    if (aspectRatioLocked) {
      setClipScaleY(newScaleX)
    }
  }

  const handleClipScaleYChange = (e) => {
    const newScaleY = Number(e.target.value)
    setClipScaleY(newScaleY)
    if (aspectRatioLocked) {
      setClipScaleX(newScaleY)
    }
  }

  const handleReset = () => {
    setRotation(0)
    setScale(100)
    setIsClipMode(false)
    setClipRect(null)
    setIsEditingClip(false)
    setOriginalImage(null)
    setClipRegion(null)
    setClipImageData(null)
  }

  const handleMouseDown = (e) => {
    if (!isClipMode || isEditingClip) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDragging(true)
    setDragStart({ x, y })
    setClipRect({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate dimensions
    const deltaX = x - dragStart.x
    const deltaY = y - dragStart.y
    const width = Math.abs(deltaX)
    const height = Math.abs(deltaY)

    // Calculate position
    const clipX = deltaX < 0 ? x : dragStart.x
    const clipY = deltaY < 0 ? y : dragStart.y

    setClipRect({
      x: Math.max(0, Math.min(clipX, CANVAS_SIZE)),
      y: Math.max(0, Math.min(clipY, CANVAS_SIZE)),
      width: Math.min(width, CANVAS_SIZE - clipX),
      height: Math.min(height, CANVAS_SIZE - clipY)
    })

    drawCanvas()
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  const confirmClipRegion = () => {
    if (!clipRect || clipRect.width < MIN_CLIP_SIZE || clipRect.height < MIN_CLIP_SIZE || !canvasRef.current) {
      onError('有効なクリッピング範囲を選択してください')
      return
    }

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // Store original image
      setOriginalImage(baseImage)

      // Extract clip region from current canvas
      const imageData = ctx.getImageData(clipRect.x, clipRect.y, clipRect.width, clipRect.height)

      // Create canvas for clip region
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = clipRect.width
      tempCanvas.height = clipRect.height
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.putImageData(imageData, 0, 0)

      // Store clip data
      setClipRegion(clipRect)
      setClipImageData(tempCanvas.toDataURL('image/png'))

      // Enter editing mode
      setIsEditingClip(true)
      setClipRotation(0)
      setClipScaleX(100)
      setClipScaleY(100)
      setClipOffsetX(0)
      setClipOffsetY(0)
      setAspectRatioLocked(true)
      setClipRect(null) // Clear selection rectangle
    } catch (error) {
      console.error('Clip error:', error)
      onError('クリッピング処理に失敗しました')
    }
  }

  const finishClipEdit = () => {
    if (!canvasRef.current || !originalImage || !clipImageData) return

    // Immediately reset UI states to prevent dashed lines from showing
    setIsClipMode(false)
    setIsEditingClip(false)
    setClipRect(null)

    try {
      // Create final composite image
      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = CANVAS_SIZE
      finalCanvas.height = CANVAS_SIZE
      const finalCtx = finalCanvas.getContext('2d')

      const originalImg = new Image()
      const clipImg = new Image()

      let imagesLoaded = 0
      const checkAllLoaded = () => {
        imagesLoaded++
        if (imagesLoaded === 2) {
          renderFinal()
        }
      }

      const renderFinal = () => {
        // Draw original image
        finalCtx.fillStyle = '#FFFFFF'
        finalCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        finalCtx.drawImage(originalImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

        // Draw transformed clip
        finalCtx.save()

        const centerX = clipRegion.x + clipRegion.width / 2 + clipOffsetX
        const centerY = clipRegion.y + clipRegion.height / 2 + clipOffsetY

        finalCtx.translate(centerX, centerY)
        finalCtx.rotate((clipRotation * Math.PI) / 180)

        const scaleFactorX = clipScaleX / 100
        const scaleFactorY = clipScaleY / 100
        finalCtx.scale(scaleFactorX, scaleFactorY)

        finalCtx.drawImage(clipImg, -clipRegion.width / 2, -clipRegion.height / 2, clipRegion.width, clipRegion.height)

        finalCtx.restore()

        // Update base image
        const newImageData = finalCanvas.toDataURL('image/png')
        setBaseImage(newImageData)

        // Clean up remaining clip data
        setOriginalImage(null)
        setClipRegion(null)
        setClipImageData(null)
      }

      originalImg.onload = checkAllLoaded
      clipImg.onload = checkAllLoaded
      originalImg.src = originalImage
      clipImg.src = clipImageData
    } catch (error) {
      console.error('Finish edit error:', error)
      onError('編集の完了に失敗しました')
    }
  }

  const cancelClipEdit = () => {
    setIsClipMode(false)
    setIsEditingClip(false)
    setClipRect(null)
    setOriginalImage(null)
    setClipRegion(null)
    setClipImageData(null)
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
          className={`border border-gray-300 rounded ${isClipMode && !isEditingClip ? 'cursor-crosshair' : 'cursor-default'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {!isEditingClip ? (
          <>
            {/* Normal Mode Controls */}
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

            {/* Clip Mode Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsClipMode(!isClipMode)
                    setClipRect(null)
                    if (!isClipMode) {
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
                    ドラッグして範囲を選択
                  </span>
                )}
              </div>

              {isClipMode && clipRect && clipRect.width >= MIN_CLIP_SIZE && clipRect.height >= MIN_CLIP_SIZE && (
                <button
                  onClick={confirmClipRegion}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition font-medium"
                >
                  範囲を確定して編集モードへ
                </button>
              )}

              {isClipMode && (
                <p className="text-xs text-gray-500">
                  ※ 選択範囲を編集して元の画像に合成できます
                </p>
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

            {isClipMode && (
              <p className="text-xs text-orange-600">
                ⚠ クリッピングモード中は全体の回転・拡大縮小が無効です
              </p>
            )}
          </>
        ) : (
          <>
            {/* Clip Edit Mode Controls */}
            <div className="bg-green-50 border border-green-200 rounded p-4 space-y-4">
              <h3 className="font-semibold text-green-800">選択範囲の編集中</h3>

              {/* Rotation Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  回転: {clipRotation}°
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={clipRotation}
                  onChange={(e) => setClipRotation(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Aspect Ratio Lock Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                  className={`px-4 py-2 rounded transition text-sm ${
                    aspectRatioLocked
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {aspectRatioLocked ? '🔒 アスペクト比固定' : '🔓 アスペクト比解除'}
                </button>
                <span className="text-xs text-gray-600">
                  {aspectRatioLocked ? '縦横連動' : '縦横個別調整'}
                </span>
              </div>

              {/* Scale X Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  横拡大縮小: {clipScaleX}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={clipScaleX}
                  onChange={handleClipScaleXChange}
                  className="w-full"
                />
              </div>

              {/* Scale Y Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  縦拡大縮小: {clipScaleY}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={clipScaleY}
                  onChange={handleClipScaleYChange}
                  className="w-full"
                />
              </div>

              {/* Move X */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  横移動: {clipOffsetX}px
                </label>
                <input
                  type="range"
                  min="-256"
                  max="256"
                  value={clipOffsetX}
                  onChange={(e) => setClipOffsetX(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Move Y */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  縦移動: {clipOffsetY}px
                </label>
                <input
                  type="range"
                  min="-256"
                  max="256"
                  value={clipOffsetY}
                  onChange={(e) => setClipOffsetY(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={finishClipEdit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
                >
                  編集を完了
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition font-medium"
                >
                  保存
                </button>
                <button
                  onClick={cancelClipEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                >
                  キャンセル
                </button>
              </div>

              <p className="text-xs text-gray-600">
                ※ 「編集を完了」で元画像に合成 / 「保存」で編集中の状態を保存
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ImageEditor
