import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import GIF from 'gif.js'

const AnimationSettings = ({ savedImages, onError }) => {
  const [frames, setFrames] = useState([])
  const [defaultDelay, setDefaultDelay] = useState(500)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef(null)

  const MAX_FRAMES = 100

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const addFrame = (image) => {
    if (frames.length >= MAX_FRAMES) {
      onError(`フレーム数の上限(${MAX_FRAMES})に達しています`)
      return
    }

    const newFrame = {
      id: `${Date.now()}-${Math.random()}`,
      imageId: image.id,
      imageData: image.imageData,
      delay: defaultDelay
    }

    setFrames([...frames, newFrame])
  }

  const removeFrame = (frameId) => {
    setFrames(frames.filter(f => f.id !== frameId))
  }

  const updateFrameDelay = (frameId, delay) => {
    setFrames(frames.map(f =>
      f.id === frameId ? { ...f, delay: Number(delay) } : f
    ))
  }

  const applyDelayToAll = () => {
    setFrames(frames.map(f => ({ ...f, delay: defaultDelay })))
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(frames)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setFrames(items)
  }

  const startPreview = () => {
    if (frames.length === 0) {
      onError('少なくとも1枚の画像を選択してください')
      return
    }

    setIsPlaying(true)
    setCurrentFrameIndex(0)

    let index = 0
    const playNextFrame = () => {
      setCurrentFrameIndex(index)
      const delay = frames[index].delay

      intervalRef.current = setTimeout(() => {
        index = (index + 1) % frames.length
        playNextFrame()
      }, delay)
    }

    playNextFrame()
  }

  const stopPreview = () => {
    setIsPlaying(false)
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }

  const generateGIF = async () => {
    if (frames.length === 0) {
      onError('少なくとも1枚の画像を選択してください')
      return
    }

    setIsGenerating(true)
    setProgress(0)

    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: 512,
        height: 512,
        workerScript: '/gif.worker.js'
      })

      gif.on('progress', (p) => {
        setProgress(Math.round(p * 100))
      })

      gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
        a.href = url
        a.download = `animation_${timestamp}.gif`
        a.click()
        URL.revokeObjectURL(url)

        setIsGenerating(false)
        setProgress(0)
      })

      // Add frames to gif
      for (const frame of frames) {
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = frame.imageData
        })

        gif.addFrame(img, { delay: frame.delay })
      }

      gif.render()
    } catch (error) {
      console.error('GIF generation error:', error)
      onError('GIF生成に失敗しました')
      setIsGenerating(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Available Images */}
      <div>
        <h3 className="text-lg font-semibold mb-2">保存済み画像から選択</h3>
        {savedImages.length === 0 ? (
          <p className="text-gray-500 text-sm">保存された画像がありません</p>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {savedImages.map((image) => (
              <div
                key={image.id}
                className="aspect-square cursor-pointer hover:opacity-75 transition"
                onClick={() => addFrame(image)}
                title="クリックしてフレームに追加"
              >
                <img
                  src={image.imageData}
                  alt="Add to frames"
                  className="w-full h-full object-cover rounded border-2 border-gray-300 hover:border-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Frame Order */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">フレーム順序</h3>
          <span className="text-sm text-gray-600">
            {frames.length} / {MAX_FRAMES} フレーム
          </span>
        </div>

        {frames.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded border-2 border-dashed border-gray-300">
            <p className="text-gray-500">上の画像をクリックしてフレームを追加</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="frames" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex gap-2 overflow-x-auto pb-2"
                >
                  {frames.map((frame, index) => (
                    <Draggable key={frame.id} draggableId={frame.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="flex-shrink-0"
                        >
                          <div className="w-24 space-y-1">
                            <div className="relative group">
                              <img
                                src={frame.imageData}
                                alt={`Frame ${index + 1}`}
                                className="w-24 h-24 object-cover rounded border-2 border-gray-300"
                              />
                              <button
                                onClick={() => removeFrame(frame.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600 text-xs"
                              >
                                ×
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                {index + 1}
                              </div>
                            </div>
                            <input
                              type="number"
                              value={frame.delay}
                              onChange={(e) => updateFrameDelay(frame.id, e.target.value)}
                              className="w-full text-xs px-1 py-1 border rounded"
                              min="10"
                              max="10000"
                            />
                            <div className="text-xs text-center text-gray-600">
                              {frame.delay}ms
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Timing Settings */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">タイミング設定</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デフォルト表示時間: {defaultDelay}ms
            </label>
            <input
              type="range"
              min="10"
              max="10000"
              step="10"
              value={defaultDelay}
              onChange={(e) => setDefaultDelay(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <button
            onClick={applyDelayToAll}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
            disabled={frames.length === 0}
          >
            全フレームに適用
          </button>
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-lg font-semibold mb-2">プレビュー</h3>
        <div className="flex flex-col items-center gap-4">
          <div className="w-64 h-64 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-50">
            {frames.length > 0 && isPlaying ? (
              <img
                src={frames[currentFrameIndex]?.imageData}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : frames.length > 0 ? (
              <img
                src={frames[0]?.imageData}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <p className="text-gray-400">フレームを追加してください</p>
            )}
          </div>
          <div className="flex gap-2">
            {!isPlaying ? (
              <button
                onClick={startPreview}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition font-medium"
                disabled={frames.length === 0}
              >
                ▶ 再生
              </button>
            ) : (
              <button
                onClick={stopPreview}
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition font-medium"
              >
                ■ 停止
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generate GIF */}
      <div>
        <button
          onClick={generateGIF}
          disabled={frames.length === 0 || isGenerating}
          className="w-full px-6 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition font-medium text-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isGenerating ? `生成中... ${progress}%` : 'GIF生成・ダウンロード'}
        </button>
        {isGenerating && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnimationSettings
