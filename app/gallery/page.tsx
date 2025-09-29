'use client'

import { useEffect, useState, useRef } from 'react'
import Cookies from 'js-cookie'

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

// Simple obfuscation for the access code (same as upload)
const validateAccess = (input: string): boolean => {
  const chars = [106, 101, 97, 110, 52, 48] // ASCII codes for j-e-a-n-4-0
  const expected = String.fromCharCode(...chars)
  return input.toLowerCase() === expected
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'lightbox'>('grid')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [browseMode, setBrowseMode] = useState<'sequential' | 'random'>('sequential')
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Check access on component mount
  useEffect(() => {
    const hasAccess = Cookies.get('hasAccess')
    if (hasAccess !== 'true') {
      setShowPasswordForm(true)
      setLoading(false)
    } else {
      fetchPhotos()
    }
  }, [])

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/photos?limit=1000') // Get all photos
      if (response.ok) {
        const data = await response.json() as { photos: Photo[], totalCount: number }
        setPhotos(data.photos)
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAccess(password)) {
      setPasswordError('Incorrect password. Please try again.')
      return
    }

    // Save access and fetch photos
    Cookies.set('hasAccess', 'true', { expires: 365 })
    setShowPasswordForm(false)
    setPasswordError('')
    fetchPhotos()
  }

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setViewMode('lightbox')
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setViewMode('grid')
    document.body.style.overflow = 'unset'
  }

  const nextPhoto = () => {
    if (isAnimating || photos.length === 0) return
    setIsAnimating(true)

    setTimeout(() => {
      if (browseMode === 'random') {
        setCurrentIndex(Math.floor(Math.random() * photos.length))
      } else {
        setCurrentIndex((prev) => (prev + 1) % photos.length)
      }
      setIsAnimating(false)
    }, 150)
  }

  const prevPhoto = () => {
    if (isAnimating || photos.length === 0) return
    setIsAnimating(true)

    setTimeout(() => {
      if (browseMode === 'random') {
        setCurrentIndex(Math.floor(Math.random() * photos.length))
      } else {
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
      }
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

  // Touch handlers for swipe gestures in lightbox
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

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (viewMode !== 'lightbox') return

      switch(e.key) {
        case 'Escape':
          closeLightbox()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          prevPhoto()
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
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
  }, [viewMode, isAnimating, browseMode])

  // Password form
  if (showPasswordForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <div className="text-4xl mb-4">🎡</div>
              <h2 className="text-xl font-medium text-gray-800 mb-4">
                Access Gallery
              </h2>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                className={`w-full px-4 py-3 border ${passwordError ? 'border-red-300' : 'border-gray-200'} rounded-xl bg-transparent focus:border-gray-400 focus:ring-0 placeholder-gray-400 text-center`}
                placeholder="Enter password"
                required
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
            >
              Access Gallery
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🎡</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Loading gallery...
          </h2>
          <p className="text-gray-500">Fetching all photos...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
            className="bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-gray-800 transition-colors"
          >
            📸 Upload Photos
          </a>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎡</span>
              <h1 className="text-xl font-semibold text-gray-800">Gallery</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {photos.length} photos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/upload"
                className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                📸 Upload More
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="aspect-square group cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                <img
                  src={photo.thumbnailUrl}
                  alt={`Photo by ${photo.uploaderName}`}
                  className="w-full h-full object-cover transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2">
                  <p className="text-white text-xs font-medium truncate">
                    {photo.uploaderName}
                  </p>
                  {photo.originalFilename && (
                    <p className="text-white/80 text-xs truncate">
                      {photo.originalFilename}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {viewMode === 'lightbox' && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center text-2xl transition-colors z-10"
          >
            ✕
          </button>

          {/* Browse mode toggle */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-2 flex gap-2">
              <button
                onClick={() => setBrowseMode('sequential')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  browseMode === 'sequential'
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                📋 Sequential
              </button>
              <button
                onClick={() => setBrowseMode('random')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  browseMode === 'random'
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                🎲 Random
              </button>
            </div>
          </div>

          {/* Photo counter */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
              <span className="text-sm font-medium">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>
          </div>

          {/* Main image area */}
          <div
            className="relative max-w-4xl max-h-[80vh] flex items-center justify-center px-16"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Navigation arrows */}
            <button
              onClick={prevPhoto}
              disabled={isAnimating}
              className="absolute left-0 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center text-2xl transition-colors disabled:opacity-50 z-10"
            >
              ←
            </button>

            <button
              onClick={nextPhoto}
              disabled={isAnimating}
              className="absolute right-0 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center text-2xl transition-colors disabled:opacity-50 z-10"
            >
              →
            </button>

            {/* Photo */}
            <div className={`transition-all duration-300 ${
              isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
            }`}>
              <img
                src={currentPhoto.originalUrl}
                alt={`Photo by ${currentPhoto.uploaderName}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{
                  filter: isAnimating ? 'blur(2px)' : 'blur(0px)',
                  transition: 'filter 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Photo info */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-lg p-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">👤</span>
                <span className="font-medium">{currentPhoto.uploaderName}</span>
                {currentPhoto.originalFilename && (
                  <>
                    <span className="text-white/60">•</span>
                    <span className="text-sm text-white/80">{currentPhoto.originalFilename}</span>
                  </>
                )}
              </div>

              {currentPhoto.comment && (
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm mt-0.5">💬</span>
                  <p className="text-sm text-white/90">{currentPhoto.comment}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-white/70">
                <span>📅 {new Date(currentPhoto.uploadedAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={goToRandomPhoto}
                    disabled={isAnimating}
                    className="hover:text-white transition-colors disabled:opacity-50"
                  >
                    🎲 Random (R)
                  </button>
                  <span className="hidden md:inline">
                    Arrow keys or swipe to navigate
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}