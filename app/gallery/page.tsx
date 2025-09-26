'use client'

import { useEffect, useState, useRef } from 'react'
import { getResizedImageUrl } from '@/lib/image-service'

interface Photo {
  id: string
  originalUrl: string
  thumbnailUrl: string
  uploaderName: string
  comment?: string
  uploadedAt: number
  batchId: string
  order: number
  originalFilename?: string
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Fetch all photos
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch('/api/photos')
        if (response.ok) {
          const data = await response.json() as { photos: Photo[], totalCount: number, success: boolean }
          // Shuffle the photos for random browsing
          const shuffled = [...data.photos].sort(() => Math.random() - 0.5)
          setPhotos(shuffled)
          setCurrentIndex(Math.floor(Math.random() * shuffled.length)) // Start at random photo
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [])

  const nextPhoto = () => {
    if (isAnimating || photos.length === 0) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
      setIsAnimating(false)
    }, 150)
  }

  const prevPhoto = () => {
    if (isAnimating || photos.length === 0) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
      setIsAnimating(false)
    }, 150)
  }

  const goToRandomPhoto = () => {
    if (isAnimating || photos.length === 0) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex(Math.floor(Math.random() * photos.length))
      setIsAnimating(false)
    }, 150)
  }

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return

    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextPhoto()
    }
    if (isRightSwipe) {
      prevPhoto()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          prevPhoto()
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          nextPhoto()
          break
        case 'r':
        case 'R':
          goToRandomPhoto()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isAnimating])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🎡</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Loading gallery...
          </h2>
          <p className="text-gray-500">
            Shuffling photos for you!
          </p>
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            No photos yet!
          </h2>
          <p className="text-gray-500 mb-4">
            Upload some photos first to browse them here.
          </p>
          <a
            href="/upload"
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            📸 Upload Photos
          </a>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎡</span>
            <span className="font-semibold text-gray-800">Gallery</span>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <span className="text-sm font-medium text-gray-600">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      </div>

      {/* Main photo display */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`relative max-w-4xl max-h-[80vh] transition-all duration-300 ${
          isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
        }`}>
          {/* Photo card */}
          <div className="bg-white p-4 rounded-2xl shadow-2xl transform rotate-0 hover:rotate-1 transition-transform duration-500">
            <img
              src={currentPhoto.thumbnailUrl}
              alt={`Photo by ${currentPhoto.uploaderName}`}
              className="w-full h-auto rounded-xl object-cover max-h-[60vh]"
              style={{
                filter: isAnimating ? 'blur(2px)' : 'blur(0px)',
                transition: 'filter 0.3s ease'
              }}
            />

            {/* Photo info */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👤</span>
                <span className="font-semibold text-gray-800">
                  {currentPhoto.uploaderName}
                </span>
                {currentPhoto.originalFilename && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">
                      {currentPhoto.originalFilename}
                    </span>
                  </>
                )}
              </div>

              {currentPhoto.comment && (
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">💬</span>
                  <p className="text-gray-700 text-sm">
                    {currentPhoto.comment}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>📅</span>
                <span>
                  {new Date(currentPhoto.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center gap-4">
            {/* Previous button */}
            <button
              onClick={prevPhoto}
              disabled={isAnimating}
              className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none flex items-center justify-center"
            >
              <span className="text-xl">⬅️</span>
            </button>

            {/* Random button */}
            <button
              onClick={goToRandomPhoto}
              disabled={isAnimating}
              className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none flex items-center justify-center"
              title="Random photo (R)"
            >
              <span className="text-xl">🎲</span>
            </button>

            {/* Next button */}
            <button
              onClick={nextPhoto}
              disabled={isAnimating}
              className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none flex items-center justify-center"
            >
              <span className="text-xl">➡️</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              <span className="hidden md:inline">Arrow keys or </span>
              Swipe to navigate • R for random
            </p>
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
          {photos.slice(0, Math.min(photos.length, 10)).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isAnimating) {
                  setIsAnimating(true)
                  setTimeout(() => {
                    setCurrentIndex(index)
                    setIsAnimating(false)
                  }, 150)
                }
              }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-purple-500 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
          {photos.length > 10 && (
            <span className="text-xs text-gray-500 ml-2">
              +{photos.length - 10}
            </span>
          )}
        </div>
      </div>

      {/* Back to preview button */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-3">
          <a
            href="/preview"
            className="bg-white/90 backdrop-blur-sm text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-sm border border-gray-100 hover:bg-white hover:shadow-lg transition-all duration-200 text-sm"
          >
            📺 Live Preview
          </a>
          <a
            href="/upload"
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm"
          >
            📸 Upload More
          </a>
        </div>
      </div>
    </div>
  )
}