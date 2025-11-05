import { useState } from 'react'

const SavedImages = ({ images, onDelete }) => {
  const [previewImage, setPreviewImage] = useState(null)

  const MAX_IMAGES = 50

  const handleDelete = (id) => {
    if (window.confirm('この画像を削除しますか?')) {
      onDelete(id)
    }
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        保存された画像はありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          保存済み: {images.length} / {MAX_IMAGES}
        </p>
      </div>

      {/* Grid of thumbnails */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group aspect-square"
          >
            <img
              src={image.imageData}
              alt="Saved"
              className="w-full h-full object-cover rounded border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition"
              onClick={() => setPreviewImage(image)}
            />
            <button
              onClick={() => handleDelete(image.id)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
              title="削除"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-lg p-4 max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">プレビュー</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <img
              src={previewImage.imageData}
              alt="Preview"
              className="w-full rounded"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  handleDelete(previewImage.id)
                  setPreviewImage(null)
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                削除
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SavedImages
