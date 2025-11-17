import { useEffect, useRef, useState } from 'react'

const ImageEditor = ({ imageData, backgroundColor = '#FFFFFF', onSave, onError }) => {
  const canvasRef = useRef(null)
  const [baseImage, setBaseImage] = useState(null)

  // Normal mode transforms
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(100)

  // Clipping mode states - support multiple clips (max 3)
  const [isClipMode, setIsClipMode] = useState(false)
  const [clipRects, setClipRects] = useState([]) // Array of selection rectangles
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [currentDragRect, setCurrentDragRect] = useState(null)

  // Multiple clip editing states
  const [isEditingClips, setIsEditingClips] = useState(false)
  const [originalImage, setOriginalImage] = useState(null)
  const [clips, setClips] = useState([]) // Array of clip objects
  const [currentClipIndex, setCurrentClipIndex] = useState(0)

  // Transparency selection states
  const [isSelectingTransparency, setIsSelectingTransparency] = useState(false)
  const [transparencyColor, setTransparencyColor] = useState(null)
  const [transparencyThreshold, setTransparencyThreshold] = useState(30)
  const [pendingClipData, setPendingClipData] = useState(null) // Temporary storage during transparency selection

  // Helper function to convert hex color to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }
  }

  // Fill (Paint Bucket) mode states
  const [isFillMode, setIsFillMode] = useState(false)
  const [fillColor, setFillColor] = useState({ r: 255, g: 255, b: 255, a: 255 }) // White by default
  const [fillTolerance, setFillTolerance] = useState(30)
  const [undoStack, setUndoStack] = useState([])

  const CANVAS_SIZE = 512
  const MIN_CLIP_SIZE = 32
  const MAX_CLIPS = 3

  // Initialize or reset baseImage when imageData changes
  useEffect(() => {
    if (imageData) {
      setBaseImage(imageData)
      setRotation(0)
      setScale(100)
      setIsClipMode(false)
      setClipRects([])
      setIsEditingClips(false)
      setClips([])
      setCurrentClipIndex(0)
      setIsFillMode(false)
      setUndoStack([])
    }
  }, [imageData])

  useEffect(() => {
    if (baseImage && canvasRef.current) {
      drawCanvas()
    }
  }, [baseImage, rotation, scale, clipRects, currentDragRect, isClipMode, isEditingClips, clips, currentClipIndex, isSelectingTransparency, transparencyColor, isFillMode])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !baseImage) return

    const ctx = canvas.getContext('2d')

    if (isSelectingTransparency && pendingClipData) {
      // Transparency color selection mode
      drawTransparencySelectionMode(ctx)
    } else if (isEditingClips && clips.length > 0) {
      // Editing multiple clips mode
      drawClipEditMode(ctx)
    } else {
      // Normal mode or clip selection mode
      drawNormalMode(ctx)
    }
  }

  const drawTransparencySelectionMode = (ctx) => {
    if (!pendingClipData) return

    const originalImg = new Image()
    const clipImg = new Image()

    let imagesLoaded = 0
    const checkAllLoaded = () => {
      imagesLoaded++
      if (imagesLoaded === 2) {
        renderTransparencySelection()
      }
    }

    const renderTransparencySelection = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Fill with white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Draw original image as background (dimmed)
      ctx.globalAlpha = 0.3
      ctx.drawImage(originalImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.globalAlpha = 1.0

      // Draw clip region at its original position for color selection
      ctx.drawImage(clipImg, pendingClipData.region.x, pendingClipData.region.y, pendingClipData.region.width, pendingClipData.region.height)

      // Draw border around clip region
      ctx.strokeStyle = '#F59E0B'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.strokeRect(pendingClipData.region.x, pendingClipData.region.y, pendingClipData.region.width, pendingClipData.region.height)
      ctx.setLineDash([])

      // Show current clip indicator
      ctx.fillStyle = '#F59E0B'
      ctx.font = 'bold 16px sans-serif'
      ctx.setLineDash([])
      ctx.fillText(`範囲${currentClipIndex + 1}/${clips.length}`, 10, 30)

      // Show selected transparency color if any
      if (transparencyColor) {
        const { r, g, b } = transparencyColor
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(10, 50, 50, 50)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.strokeRect(10, 50, 50, 50)

        ctx.fillStyle = '#000000'
        ctx.font = '12px sans-serif'
        ctx.fillText('透過色', 70, 75)
      }
    }

    originalImg.onload = checkAllLoaded
    clipImg.onload = checkAllLoaded
    originalImg.src = originalImage
    clipImg.src = pendingClipData.imageData
  }

  const drawNormalMode = (ctx) => {
    const img = new Image()

    const render = () => {
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

      // Draw all confirmed clip rectangles
      if (isClipMode && !isEditingClips) {
        // Draw confirmed rectangles (green)
        clipRects.forEach((rect, index) => {
          if (rect.width > MIN_CLIP_SIZE && rect.height > MIN_CLIP_SIZE) {
            ctx.strokeStyle = '#10B981' // Green for confirmed
            ctx.lineWidth = 2
            ctx.setLineDash([5, 5])
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)

            // Draw clip number
            ctx.fillStyle = '#10B981'
            ctx.font = 'bold 16px sans-serif'
            ctx.setLineDash([])
            ctx.fillText(`${index + 1}`, rect.x + 5, rect.y + 20)
            ctx.setLineDash([5, 5])
          }
        })

        // Draw current dragging rectangle (blue)
        if (currentDragRect && currentDragRect.width > MIN_CLIP_SIZE && currentDragRect.height > MIN_CLIP_SIZE) {
          ctx.strokeStyle = '#3B82F6' // Blue for dragging
          ctx.lineWidth = 2
          ctx.strokeRect(currentDragRect.x, currentDragRect.y, currentDragRect.width, currentDragRect.height)
        }

        ctx.setLineDash([])
      }
    }

    img.onload = render
    img.src = baseImage

    // Handle cached images
    if (img.complete) {
      render()
    }
  }

  const drawClipEditMode = (ctx) => {
    if (!originalImage || clips.length === 0) return

    const originalImg = new Image()
    const clipImages = clips.map(() => new Image())

    let imagesLoaded = 0
    const totalImages = 1 + clips.length

    const checkAllLoaded = () => {
      imagesLoaded++
      if (imagesLoaded === totalImages) {
        renderAllClips()
      }
    }

    const renderAllClips = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.setLineDash([])

      // Fill with white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Draw original image
      ctx.drawImage(originalImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // Fill all original clip regions with white to prevent overlap
      clips.forEach(clip => {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(clip.region.x, clip.region.y, clip.region.width, clip.region.height)
      })

      // Draw all transformed clips
      clips.forEach((clip, index) => {
        const clipImg = clipImages[index]

        ctx.save()

        const centerX = clip.region.x + clip.region.width / 2 + clip.offsetX
        const centerY = clip.region.y + clip.region.height / 2 + clip.offsetY

        ctx.translate(centerX, centerY)
        ctx.rotate((clip.rotation * Math.PI) / 180)

        const scaleFactorX = clip.scaleX / 100
        const scaleFactorY = clip.scaleY / 100
        ctx.scale(scaleFactorX, scaleFactorY)

        ctx.drawImage(clipImg, -clip.region.width / 2, -clip.region.height / 2, clip.region.width, clip.region.height)

        ctx.restore()

        // Draw bounding box for current clip
        if (index === currentClipIndex) {
          ctx.save()
          ctx.translate(centerX, centerY)
          ctx.rotate((clip.rotation * Math.PI) / 180)
          ctx.scale(scaleFactorX, scaleFactorY)
          ctx.strokeStyle = '#10B981'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(-clip.region.width / 2, -clip.region.height / 2, clip.region.width, clip.region.height)
          ctx.setLineDash([])
          ctx.restore()

          // Draw clip number indicator
          ctx.fillStyle = '#10B981'
          ctx.font = 'bold 16px sans-serif'
          ctx.fillText(`範囲${index + 1}`, clip.region.x + 5, clip.region.y - 5)
        } else {
          // Draw dim indicator for other clips
          ctx.fillStyle = '#9CA3AF'
          ctx.font = 'bold 14px sans-serif'
          ctx.fillText(`${index + 1}`, clip.region.x + 5, clip.region.y - 5)
        }
      })
    }

    originalImg.onload = checkAllLoaded
    originalImg.src = originalImage

    clipImages.forEach((img, index) => {
      img.onload = checkAllLoaded
      img.src = clips[index].imageData
    })
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
    const updatedClips = [...clips]
    updatedClips[currentClipIndex].scaleX = newScaleX
    if (updatedClips[currentClipIndex].aspectRatioLocked) {
      updatedClips[currentClipIndex].scaleY = newScaleX
    }
    setClips(updatedClips)
  }

  const handleClipScaleYChange = (e) => {
    const newScaleY = Number(e.target.value)
    const updatedClips = [...clips]
    updatedClips[currentClipIndex].scaleY = newScaleY
    if (updatedClips[currentClipIndex].aspectRatioLocked) {
      updatedClips[currentClipIndex].scaleX = newScaleY
    }
    setClips(updatedClips)
  }

  const updateCurrentClip = (updates) => {
    const updatedClips = [...clips]
    updatedClips[currentClipIndex] = {
      ...updatedClips[currentClipIndex],
      ...updates
    }
    setClips(updatedClips)
  }

  const handleReset = () => {
    setRotation(0)
    setScale(100)
    setIsClipMode(false)
    setClipRects([])
    setCurrentDragRect(null)
    setIsEditingClips(false)
    setOriginalImage(null)
    setClips([])
    setCurrentClipIndex(0)
    setIsFillMode(false)
    setUndoStack([])
  }

  // Flood Fill algorithm for paint bucket tool
  const floodFill = (startX, startY) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const data = imageData.data

    // Save current state for undo
    setUndoStack([...undoStack, baseImage])

    // Get color at clicked position
    const startPos = (startY * CANVAS_SIZE + startX) * 4
    const startR = data[startPos]
    const startG = data[startPos + 1]
    const startB = data[startPos + 2]
    const startA = data[startPos + 3]

    // Check if clicked color is already the fill color
    if (
      Math.abs(startR - fillColor.r) <= fillTolerance &&
      Math.abs(startG - fillColor.g) <= fillTolerance &&
      Math.abs(startB - fillColor.b) <= fillTolerance &&
      Math.abs(startA - fillColor.a) <= fillTolerance
    ) {
      return // No need to fill
    }

    // BFS-based flood fill
    const queue = [[startX, startY]]
    const visited = new Set()

    const colorMatch = (r, g, b, a) => {
      return (
        Math.abs(r - startR) <= fillTolerance &&
        Math.abs(g - startG) <= fillTolerance &&
        Math.abs(b - startB) <= fillTolerance &&
        Math.abs(a - startA) <= fillTolerance
      )
    }

    while (queue.length > 0) {
      const [x, y] = queue.shift()
      const key = `${x},${y}`

      if (visited.has(key)) continue
      if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) continue

      const pos = (y * CANVAS_SIZE + x) * 4
      const r = data[pos]
      const g = data[pos + 1]
      const b = data[pos + 2]
      const a = data[pos + 3]

      if (!colorMatch(r, g, b, a)) continue

      visited.add(key)

      // Fill pixel
      data[pos] = fillColor.r
      data[pos + 1] = fillColor.g
      data[pos + 2] = fillColor.b
      data[pos + 3] = fillColor.a

      // Add neighbors to queue
      queue.push([x + 1, y])
      queue.push([x - 1, y])
      queue.push([x, y + 1])
      queue.push([x, y - 1])
    }

    // Apply filled image data to canvas
    ctx.putImageData(imageData, 0, 0)

    // Update baseImage
    const newImageData = canvas.toDataURL('image/png')
    setBaseImage(newImageData)
  }

  const handleFillUndo = () => {
    if (undoStack.length === 0) return

    const previousImage = undoStack[undoStack.length - 1]
    setBaseImage(previousImage)
    setUndoStack(undoStack.slice(0, -1))
  }

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(e.clientX - rect.left)
    const y = Math.floor(e.clientY - rect.top)

    // Fill mode - paint bucket tool
    if (isFillMode && !isClipMode && !isEditingClips && !isSelectingTransparency) {
      floodFill(x, y)
      return
    }

    // Transparency color selection mode
    if (isSelectingTransparency) {
      handleTransparencyColorClick(x, y)
      return
    }

    // Clip selection mode - allow multiple rectangles (max 3)
    if (!isClipMode || isEditingClips) return

    if (clipRects.length >= MAX_CLIPS) {
      onError(`最大${MAX_CLIPS}箇所まで選択できます`)
      return
    }

    setIsDragging(true)
    setDragStart({ x, y })
    setCurrentDragRect({ x, y, width: 0, height: 0 })
  }

  const handleTransparencyColorClick = (x, y) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Get pixel color at clicked position
    const imageData = ctx.getImageData(x, y, 1, 1)
    const [r, g, b] = imageData.data

    setTransparencyColor({ r, g, b })
  }

  const applyTransparency = () => {
    if (!transparencyColor || !pendingClipData) return

    try {
      const img = new Image()
      img.onload = () => {
        // Create canvas for transparency processing
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = pendingClipData.region.width
        tempCanvas.height = pendingClipData.region.height
        const tempCtx = tempCanvas.getContext('2d')

        // Draw clip image
        tempCtx.drawImage(img, 0, 0)

        // Get image data
        const imageData = tempCtx.getImageData(0, 0, pendingClipData.region.width, pendingClipData.region.height)
        const data = imageData.data

        // Calculate color distance and apply transparency
        const { r: targetR, g: targetG, b: targetB } = transparencyColor
        const threshold = transparencyThreshold

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          // Calculate Euclidean distance in RGB space
          const distance = Math.sqrt(
            Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
          )

          // If within threshold, make transparent
          if (distance <= threshold) {
            data[i + 3] = 0 // Set alpha to 0
          }
        }

        // Put processed image data back
        tempCtx.putImageData(imageData, 0, 0)

        // Update current clip with transparency applied
        const updatedClips = [...clips]
        updatedClips[currentClipIndex].imageData = tempCanvas.toDataURL('image/png')
        setClips(updatedClips)

        // Move to next clip or enter edit mode
        proceedToNextClipOrEdit()
      }

      img.src = pendingClipData.imageData
    } catch (error) {
      console.error('Transparency error:', error)
      onError('透過処理に失敗しました')
    }
  }

  const skipTransparency = () => {
    // Skip transparency and go to next clip or edit mode
    proceedToNextClipOrEdit()
  }

  const proceedToNextClipOrEdit = () => {
    const nextIndex = currentClipIndex + 1

    if (nextIndex < clips.length) {
      // Move to next clip's transparency selection
      setCurrentClipIndex(nextIndex)
      setPendingClipData({
        region: clips[nextIndex].region,
        imageData: clips[nextIndex].imageData
      })
      // Set background color as default transparency color
      setTransparencyColor(hexToRgb(backgroundColor))
      setTransparencyThreshold(30)
      // Stay in transparency selection mode
    } else {
      // All clips processed, enter editing mode
      enterEditMode()
    }
  }

  const enterEditMode = () => {
    setIsSelectingTransparency(false)
    setPendingClipData(null)
    setIsEditingClips(true)
    setCurrentClipIndex(0)
  }

  const clearClipTransforms = () => {
    // Reset current clip's transform values to initial state
    const updatedClips = [...clips]
    updatedClips[currentClipIndex] = {
      ...updatedClips[currentClipIndex],
      rotation: 0,
      scaleX: 100,
      scaleY: 100,
      offsetX: 0,
      offsetY: 0,
      aspectRatioLocked: true
    }
    setClips(updatedClips)
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

    setCurrentDragRect({
      x: Math.max(0, Math.min(clipX, CANVAS_SIZE)),
      y: Math.max(0, Math.min(clipY, CANVAS_SIZE)),
      width: Math.min(width, CANVAS_SIZE - clipX),
      height: Math.min(height, CANVAS_SIZE - clipY)
    })

    drawCanvas()
  }

  const handleMouseUp = () => {
    // Add rectangle to array if it's large enough
    if (isDragging && currentDragRect &&
        currentDragRect.width >= MIN_CLIP_SIZE &&
        currentDragRect.height >= MIN_CLIP_SIZE &&
        clipRects.length < MAX_CLIPS) {
      setClipRects([...clipRects, currentDragRect])
    }

    setIsDragging(false)
    setDragStart(null)
    setCurrentDragRect(null)
  }

  const confirmClipRegion = () => {
    if (!clipRect || clipRect.width < MIN_CLIP_SIZE || clipRect.height < MIN_CLIP_SIZE || !canvasRef.current) {
      onError('有効なクリッピング範囲を選択してください')
      return
    }

    try {
      // Store original image
      setOriginalImage(baseImage)

      // Extract clip region from a CLEAN render (without dashed lines)
      // Create a temporary canvas to render the base image cleanly
      const cleanCanvas = document.createElement('canvas')
      cleanCanvas.width = CANVAS_SIZE
      cleanCanvas.height = CANVAS_SIZE
      const cleanCtx = cleanCanvas.getContext('2d')

      const img = new Image()
      img.onload = () => {
        // Render base image with current transformations, but NO dashed lines
        cleanCtx.fillStyle = '#FFFFFF'
        cleanCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        cleanCtx.save()
        cleanCtx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2)
        cleanCtx.rotate((rotation * Math.PI) / 180)

        const scaleFactor = scale / 100
        cleanCtx.scale(scaleFactor, scaleFactor)

        cleanCtx.drawImage(img, -CANVAS_SIZE / 2, -CANVAS_SIZE / 2, CANVAS_SIZE, CANVAS_SIZE)
        cleanCtx.restore()

        // NOW extract the clip region from the clean canvas
        const imageData = cleanCtx.getImageData(clipRect.x, clipRect.y, clipRect.width, clipRect.height)

        // Create canvas for clip region
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = clipRect.width
        tempCanvas.height = clipRect.height
        const tempCtx = tempCanvas.getContext('2d')
        tempCtx.putImageData(imageData, 0, 0)

        // Store clip data
        setClipRegion(clipRect)
        setClipImageData(tempCanvas.toDataURL('image/png'))

        // Enter transparency selection mode
        setIsSelectingTransparency(true)
        // Set background color as default transparency color
        setTransparencyColor(hexToRgb(backgroundColor))
        setTransparencyThreshold(30)
        setClipRect(null) // Clear selection rectangle
      }

      img.src = baseImage
    } catch (error) {
      console.error('Clip error:', error)
      onError('クリッピング処理に失敗しました')
    }
  }

  const startMultiClipEdit = () => {
    if (clipRects.length === 0 || !canvasRef.current) {
      onError('クリップ範囲を選択してください')
      return
    }

    try {
      // Store original image
      setOriginalImage(baseImage)

      // Extract all clip regions from a CLEAN render (without dashed lines)
      const cleanCanvas = document.createElement('canvas')
      cleanCanvas.width = CANVAS_SIZE
      cleanCanvas.height = CANVAS_SIZE
      const cleanCtx = cleanCanvas.getContext('2d')

      const img = new Image()
      const render = () => {
        // Render base image with current transformations, but NO dashed lines
        cleanCtx.fillStyle = '#FFFFFF'
        cleanCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        cleanCtx.save()
        cleanCtx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2)
        cleanCtx.rotate((rotation * Math.PI) / 180)

        const scaleFactor = scale / 100
        cleanCtx.scale(scaleFactor, scaleFactor)

        cleanCtx.drawImage(img, -CANVAS_SIZE / 2, -CANVAS_SIZE / 2, CANVAS_SIZE, CANVAS_SIZE)
        cleanCtx.restore()

        // Extract all clip regions
        const extractedClips = clipRects.map((rect, index) => {
          const imageData = cleanCtx.getImageData(rect.x, rect.y, rect.width, rect.height)

          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = rect.width
          tempCanvas.height = rect.height
          const tempCtx = tempCanvas.getContext('2d')
          tempCtx.putImageData(imageData, 0, 0)

          return {
            id: index,
            region: rect,
            imageData: tempCanvas.toDataURL('image/png'),
            rotation: 0,
            scaleX: 100,
            scaleY: 100,
            offsetX: 0,
            offsetY: 0,
            aspectRatioLocked: true
          }
        })

        setClips(extractedClips)
        setCurrentClipIndex(0)

        // Start with first clip's transparency selection
        setPendingClipData({
          region: extractedClips[0].region,
          imageData: extractedClips[0].imageData
        })
        setIsSelectingTransparency(true)
        // Set background color as default transparency color
        setTransparencyColor(hexToRgb(backgroundColor))
        setTransparencyThreshold(30)
        setIsClipMode(false)
        setClipRects([])
      }

      img.onload = render
      img.src = baseImage
      if (img.complete) render()
    } catch (error) {
      console.error('Multi-clip error:', error)
      onError('クリップ処理に失敗しました')
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

        // Fill original clip region with white to prevent overlap
        finalCtx.fillStyle = '#FFFFFF'
        finalCtx.fillRect(clipRegion.x, clipRegion.y, clipRegion.width, clipRegion.height)

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

  const finishMultiClipEdit = () => {
    if (!canvasRef.current || !originalImage || clips.length === 0) return

    // Immediately reset UI states to prevent dashed lines from showing
    setIsClipMode(false)
    setIsEditingClips(false)

    try {
      // Create final composite image
      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = CANVAS_SIZE
      finalCanvas.height = CANVAS_SIZE
      const finalCtx = finalCanvas.getContext('2d')

      const originalImg = new Image()
      const clipImages = clips.map(() => new Image())

      let imagesLoaded = 0
      const totalImages = 1 + clips.length

      const checkAllLoaded = () => {
        imagesLoaded++
        if (imagesLoaded === totalImages) {
          renderFinalComposite()
        }
      }

      const renderFinalComposite = () => {
        // Draw original image as background
        finalCtx.fillStyle = '#FFFFFF'
        finalCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        finalCtx.drawImage(originalImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

        // Fill all original clip regions with white to prevent overlap
        clips.forEach(clip => {
          finalCtx.fillStyle = '#FFFFFF'
          finalCtx.fillRect(clip.region.x, clip.region.y, clip.region.width, clip.region.height)
        })

        // Draw all transformed clips
        clips.forEach((clip, index) => {
          const clipImg = clipImages[index]

          finalCtx.save()

          const centerX = clip.region.x + clip.region.width / 2 + clip.offsetX
          const centerY = clip.region.y + clip.region.height / 2 + clip.offsetY

          finalCtx.translate(centerX, centerY)
          finalCtx.rotate((clip.rotation * Math.PI) / 180)

          const scaleFactorX = clip.scaleX / 100
          const scaleFactorY = clip.scaleY / 100
          finalCtx.scale(scaleFactorX, scaleFactorY)

          finalCtx.drawImage(clipImg, -clip.region.width / 2, -clip.region.height / 2, clip.region.width, clip.region.height)

          finalCtx.restore()
        })

        // Update base image with composite
        const newImageData = finalCanvas.toDataURL('image/png')
        setBaseImage(newImageData)

        // Clean up clip data
        setOriginalImage(null)
        setClips([])
        setCurrentClipIndex(0)
      }

      originalImg.onload = checkAllLoaded
      originalImg.src = originalImage

      clipImages.forEach((img, index) => {
        img.onload = checkAllLoaded
        img.src = clips[index].imageData
      })
    } catch (error) {
      console.error('Finish multi-clip edit error:', error)
      onError('編集の完了に失敗しました')
    }
  }

  const cancelMultiClipEdit = () => {
    setIsClipMode(false)
    setIsEditingClips(false)
    setClipRects([])
    setCurrentDragRect(null)
    setOriginalImage(null)
    setClips([])
    setCurrentClipIndex(0)
  }

  const handleSave = () => {
    if (!canvasRef.current) return

    try {
      // Always create a clean canvas without dashed lines
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = CANVAS_SIZE
      tempCanvas.height = CANVAS_SIZE
      const tempCtx = tempCanvas.getContext('2d')

      // If in multi-clip edit mode, save composite without dashed lines
      if (isEditingClips && originalImage && clips.length > 0) {
        const originalImg = new Image()
        const clipImages = clips.map(() => new Image())

        let imagesLoaded = 0
        const totalImages = 1 + clips.length

        const checkAllLoaded = () => {
          imagesLoaded++
          if (imagesLoaded === totalImages) {
            renderCleanComposite()
          }
        }

        const renderCleanComposite = () => {
          // Fill with white background
          tempCtx.fillStyle = '#FFFFFF'
          tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

          // Draw original image as background
          tempCtx.drawImage(originalImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

          // Fill all original clip regions with white to prevent overlap
          clips.forEach(clip => {
            tempCtx.fillStyle = '#FFFFFF'
            tempCtx.fillRect(clip.region.x, clip.region.y, clip.region.width, clip.region.height)
          })

          // Draw all transformed clips (without dashed boxes)
          clips.forEach((clip, index) => {
            const clipImg = clipImages[index]

            tempCtx.save()

            const centerX = clip.region.x + clip.region.width / 2 + clip.offsetX
            const centerY = clip.region.y + clip.region.height / 2 + clip.offsetY

            tempCtx.translate(centerX, centerY)
            tempCtx.rotate((clip.rotation * Math.PI) / 180)

            const scaleFactorX = clip.scaleX / 100
            const scaleFactorY = clip.scaleY / 100
            tempCtx.scale(scaleFactorX, scaleFactorY)

            tempCtx.drawImage(clipImg, -clip.region.width / 2, -clip.region.height / 2, clip.region.width, clip.region.height)

            tempCtx.restore()
          })

          // Save without dashed lines
          const dataUrl = tempCanvas.toDataURL('image/png')
          onSave(dataUrl)
        }

        originalImg.onload = checkAllLoaded
        originalImg.src = originalImage

        clipImages.forEach((img, index) => {
          img.onload = checkAllLoaded
          img.src = clips[index].imageData
        })
      } else {
        // Normal mode or clipping mode (selection): render baseImage without dashed lines
        const img = new Image()

        img.onload = () => {
          // Fill with white background
          tempCtx.fillStyle = '#FFFFFF'
          tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

          // Apply transformations if any
          tempCtx.save()
          tempCtx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2)
          tempCtx.rotate((rotation * Math.PI) / 180)

          const scaleFactor = scale / 100
          tempCtx.scale(scaleFactor, scaleFactor)

          tempCtx.drawImage(img, -CANVAS_SIZE / 2, -CANVAS_SIZE / 2, CANVAS_SIZE, CANVAS_SIZE)

          tempCtx.restore()

          // Save without any dashed lines
          const dataUrl = tempCanvas.toDataURL('image/png')
          onSave(dataUrl)
        }

        img.src = baseImage
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
          className={`border border-gray-300 rounded ${
            isFillMode && !isClipMode && !isEditingClips && !isSelectingTransparency ? 'cursor-pointer' :
            isSelectingTransparency ? 'cursor-pointer' :
            isClipMode && !isEditingClips ? 'cursor-crosshair' :
            'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {isSelectingTransparency ? (
          <>
            {/* Transparency Selection Mode Controls */}
            <div className="bg-orange-50 border border-orange-200 rounded p-4 space-y-4">
              <h3 className="font-semibold text-orange-800">透過色を選択</h3>

              <p className="text-sm text-gray-700">
                透過したい色をクリックして選択してください（例：白背景）
              </p>

              {transparencyColor && (
                <>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-12 h-12 border-2 border-black rounded"
                      style={{ backgroundColor: `rgb(${transparencyColor.r}, ${transparencyColor.g}, ${transparencyColor.b})` }}
                    ></div>
                    <span className="text-sm text-gray-700">
                      選択された色: RGB({transparencyColor.r}, {transparencyColor.g}, {transparencyColor.b})
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      許容範囲: {transparencyThreshold}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={transparencyThreshold}
                      onChange={(e) => setTransparencyThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      値が大きいほど、似た色も透過されます
                    </p>
                  </div>

                  <button
                    onClick={applyTransparency}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition font-medium"
                  >
                    透過を適用して編集モードへ
                  </button>
                </>
              )}

              <button
                onClick={skipTransparency}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                透過処理をスキップ
              </button>
            </div>
          </>
        ) : !isEditingClips ? (
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

            {/* Fill (Paint Bucket) Mode */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsFillMode(!isFillMode)
                    if (!isFillMode) {
                      setIsClipMode(false)
                    }
                  }}
                  disabled={isClipMode}
                  className={`px-4 py-2 rounded transition ${
                    isFillMode && !isClipMode
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${isClipMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  🪣 {isFillMode ? '塗りつぶしモード ON' : '塗りつぶしモード OFF'}
                </button>
                {isFillMode && !isClipMode && (
                  <span className="text-xs text-gray-600">
                    クリックして塗りつぶし
                  </span>
                )}
              </div>

              {isFillMode && !isClipMode && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-3">
                  {/* Color Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      塗りつぶし色
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFillColor({ r: 255, g: 255, b: 255, a: 255 })}
                        className="flex items-center gap-2 px-3 py-2 rounded border-2 transition hover:border-amber-500"
                      >
                        <div className="w-6 h-6 rounded border border-gray-400 bg-white"></div>
                        <span className="text-sm">白</span>
                      </button>
                      <button
                        onClick={() => setFillColor({ r: 0, g: 0, b: 0, a: 255 })}
                        className="flex items-center gap-2 px-3 py-2 rounded border-2 transition hover:border-amber-500"
                      >
                        <div className="w-6 h-6 rounded border border-gray-400 bg-black"></div>
                        <span className="text-sm">黒</span>
                      </button>
                      <button
                        onClick={() => setFillColor({ r: 255, g: 255, b: 255, a: 0 })}
                        className="flex items-center gap-2 px-3 py-2 rounded border-2 transition hover:border-amber-500"
                      >
                        <div className="w-6 h-6 rounded border border-gray-400 bg-white" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}></div>
                        <span className="text-sm">透明</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Color Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      カスタム色
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={`#${((fillColor.r << 16) | (fillColor.g << 8) | fillColor.b).toString(16).padStart(6, '0')}`}
                        onChange={(e) => {
                          const hex = e.target.value.slice(1)
                          const r = parseInt(hex.slice(0, 2), 16)
                          const g = parseInt(hex.slice(2, 4), 16)
                          const b = parseInt(hex.slice(4, 6), 16)
                          setFillColor({ r, g, b, a: 255 })
                        }}
                        className="w-20 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded border border-gray-200">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, ${fillColor.a / 255})` }}
                        ></div>
                        <span className="text-xs text-gray-600 font-mono">
                          RGB({fillColor.r}, {fillColor.g}, {fillColor.b})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tolerance Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      許容範囲: {fillTolerance}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fillTolerance}
                      onChange={(e) => setFillTolerance(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      値が大きいほど、似た色も塗りつぶされます
                    </p>
                  </div>

                  {/* Undo Button */}
                  {undoStack.length > 0 && (
                    <button
                      onClick={handleFillUndo}
                      className="w-full px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded hover:bg-amber-50 transition font-medium"
                    >
                      ← 元に戻す ({undoStack.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Clip Mode Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsClipMode(!isClipMode)
                    setClipRects([])
                    setCurrentDragRect(null)
                    if (!isClipMode) {
                      setRotation(0)
                      setScale(100)
                      setIsFillMode(false)
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
                {isClipMode && clipRects.length === 0 && (
                  <span className="text-xs text-gray-600">
                    ドラッグして範囲を選択（最大{MAX_CLIPS}箇所）
                  </span>
                )}
              </div>

              {/* Selected Clips List */}
              {isClipMode && clipRects.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    選択済み: {clipRects.length}/{MAX_CLIPS}箇所
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {clipRects.map((rect, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded">
                        <span className="text-sm font-medium text-green-800">範囲{index + 1}</span>
                        <button
                          onClick={() => {
                            setClipRects(clipRects.filter((_, i) => i !== index))
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {clipRects.length < MAX_CLIPS && (
                    <p className="text-xs text-gray-600">
                      ※ 続けてドラッグして追加選択できます
                    </p>
                  )}

                  <button
                    onClick={startMultiClipEdit}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition font-medium"
                  >
                    {clipRects.length}箇所の範囲を編集
                  </button>
                </div>
              )}

              {isClipMode && (
                <p className="text-xs text-gray-500">
                  ※ 複数範囲を選択して個別に編集できます
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
            {/* Multi-Clip Edit Mode Controls */}
            <div className="bg-green-50 border border-green-200 rounded p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-800">選択範囲の編集中</h3>
                <div className="text-sm font-medium text-green-700">
                  範囲 {currentClipIndex + 1} / {clips.length}
                </div>
              </div>

              {/* Clip Switching UI */}
              {clips.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentClipIndex(Math.max(0, currentClipIndex - 1))}
                    disabled={currentClipIndex === 0}
                    className={`px-4 py-2 bg-blue-500 text-white rounded transition ${
                      currentClipIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                  >
                    ← 前の範囲
                  </button>
                  <div className="flex-1 flex gap-1 justify-center">
                    {clips.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentClipIndex(index)}
                        className={`w-8 h-8 rounded-full font-medium transition ${
                          index === currentClipIndex
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentClipIndex(Math.min(clips.length - 1, currentClipIndex + 1))}
                    disabled={currentClipIndex === clips.length - 1}
                    className={`px-4 py-2 bg-blue-500 text-white rounded transition ${
                      currentClipIndex === clips.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                  >
                    次の範囲 →
                  </button>
                </div>
              )}

              {/* Rotation Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  回転: {clips[currentClipIndex]?.rotation || 0}°
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={clips[currentClipIndex]?.rotation || 0}
                  onChange={(e) => updateCurrentClip({ rotation: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Aspect Ratio Lock Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateCurrentClip({ aspectRatioLocked: !clips[currentClipIndex]?.aspectRatioLocked })}
                  className={`px-4 py-2 rounded transition text-sm ${
                    clips[currentClipIndex]?.aspectRatioLocked
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {clips[currentClipIndex]?.aspectRatioLocked ? '🔒 アスペクト比固定' : '🔓 アスペクト比解除'}
                </button>
                <span className="text-xs text-gray-600">
                  {clips[currentClipIndex]?.aspectRatioLocked ? '縦横連動' : '縦横個別調整'}
                </span>
              </div>

              {/* Scale X Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  横拡大縮小: {clips[currentClipIndex]?.scaleX || 100}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={clips[currentClipIndex]?.scaleX || 100}
                  onChange={handleClipScaleXChange}
                  className="w-full"
                />
              </div>

              {/* Scale Y Slider */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  縦拡大縮小: {clips[currentClipIndex]?.scaleY || 100}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={clips[currentClipIndex]?.scaleY || 100}
                  onChange={handleClipScaleYChange}
                  className="w-full"
                />
              </div>

              {/* Move X */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  横移動: {clips[currentClipIndex]?.offsetX || 0}px
                </label>
                <input
                  type="range"
                  min="-256"
                  max="256"
                  value={clips[currentClipIndex]?.offsetX || 0}
                  onChange={(e) => updateCurrentClip({ offsetX: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Move Y */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  縦移動: {clips[currentClipIndex]?.offsetY || 0}px
                </label>
                <input
                  type="range"
                  min="-256"
                  max="256"
                  value={clips[currentClipIndex]?.offsetY || 0}
                  onChange={(e) => updateCurrentClip({ offsetY: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Clear Button */}
              <button
                onClick={clearClipTransforms}
                className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200 transition font-medium"
              >
                この範囲をクリア（数値をリセット）
              </button>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={finishMultiClipEdit}
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
                  onClick={cancelMultiClipEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                >
                  キャンセル
                </button>
              </div>

              <p className="text-xs text-gray-600">
                ※ 「編集を完了」で全範囲を元画像に合成 / 「保存」で編集中の状態を保存
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ImageEditor
