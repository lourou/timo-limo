'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
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
}

interface PhotoState extends Photo {
  imageLoaded: boolean
  isNewlyAdded: boolean
}

export default function PreviewPage() {
  const [photos, setPhotos] = useState<PhotoState[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const eventSourceRef = useRef<EventSource | null>(null)

  // Preload image and update state when loaded
  const preloadImage = (photo: Photo, isNewlyAdded: boolean = false): Promise<PhotoState> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ ...photo, imageLoaded: true, isNewlyAdded })
      }
      img.onerror = () => {
        // Still resolve even on error to prevent hanging
        resolve({ ...photo, imageLoaded: true, isNewlyAdded })
      }
      img.src = getResizedImageUrl(photo.thumbnailUrl, 300, 300, 70)
    })
  }

  useEffect(() => {
    const uploadUrl = `${window.location.origin}/upload`
    QRCode.toDataURL(uploadUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    }).then(setQrCodeUrl)

    const connectSSE = () => {
      console.log('Connecting to SSE stream...')
      setConnectionStatus('connecting')
      eventSourceRef.current = new EventSource('/api/photos/stream')

      eventSourceRef.current.onopen = () => {
        console.log('SSE connection opened')
        setConnectionStatus('connected')
      }

      eventSourceRef.current.onmessage = (event) => {
        try {
          console.log('SSE message received:', event.data)

          // Skip keep-alive messages
          if (event.data.trim() === '' || event.data.startsWith(':')) {
            return
          }

          const message = JSON.parse(event.data)
          console.log('Parsed message:', message)

          if (message.type === 'totalCount') {
            console.log('Updating total count:', message.count)
            setTotalCount(message.count)
          } else if (message.type === 'photo') {
            console.log('Adding new photo:', message.id)
            const newPhoto: Photo = {
              id: message.id,
              originalUrl: message.originalUrl,
              thumbnailUrl: message.thumbnailUrl,
              uploaderName: message.uploaderName,
              comment: message.comment,
              uploadedAt: message.uploadedAt,
              batchId: message.batchId,
              order: message.order
            }

            // Check if this photo is actually new or from reconnection
            setPhotos(prev => {
              const existingPhoto = prev.find(p => p.id === newPhoto.id)
              if (existingPhoto) {
                // Photo already exists, don't add it again or trigger animation
                console.log('Photo already exists, skipping:', newPhoto.id)
                return prev
              }

              // This is a truly new photo, preload and add with animation
              console.log('Adding new photo:', newPhoto.id)
              preloadImage(newPhoto, true).then(loadedPhoto => {
                setPhotos(current => {
                  const filtered = current.filter(p => p.id !== loadedPhoto.id)
                  const updated = [loadedPhoto, ...filtered]
                  return updated.slice(0, 15)
                })
              })
              return prev
            })
          } else {
            // Handle old format for backwards compatibility
            const newPhoto: Photo = message
            console.log('Legacy photo format:', newPhoto)
            setPhotos(prev => {
              const existingPhoto = prev.find(p => p.id === newPhoto.id)
              if (existingPhoto) {
                return prev // Don't re-add existing photos
              }

              preloadImage(newPhoto, true).then(loadedPhoto => {
                setPhotos(current => [loadedPhoto, ...current.filter(p => p.id !== loadedPhoto.id)].slice(0, 15))
              })
              return prev
            })
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error, 'Data:', event.data)
        }
      }

      eventSourceRef.current.onerror = (error) => {
        console.error('SSE error:', error)
        setConnectionStatus('error')
        eventSourceRef.current?.close()
        setTimeout(() => {
          console.log('Reconnecting SSE in 5 seconds...')
          connectSSE()
        }, 5000)
      }
    }

    connectSSE()

    // Periodic reconnection to ensure fresh data
    const reconnectInterval = setInterval(() => {
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        console.log('Reconnecting closed SSE connection...')
        connectSSE()
      } else {
        console.log('SSE connection is active, refreshing...')
        eventSourceRef.current?.close()
        setTimeout(connectSSE, 100)
      }
    }, 5000) // Reconnect every 5 seconds for real-time updates

    return () => {
      clearInterval(reconnectInterval)
      eventSourceRef.current?.close()
    }
  }, [])

  // Generate random tilt for each photo (consistent per photo ID)
  const getRandomTilt = (photoId: string) => {
    const tilts = [-8, -6, -4, -2, -1, 0, 1, 2, 4, 6, 8, 12, -12, 15, -15]
    const hash = photoId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return tilts[hash % tilts.length]
  }

  const getRandomPosition = (photoId: string) => {
    const hash = photoId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)

    // Position based ONLY on photo ID, not index, so photos stay in same place
    // Increased spread for better iPad Pro experience with more photos
    const randomX = ((hash % 120) - 60) // -60% to +60%
    const randomY = (((hash * 7) % 80) - 40) // -40% to +40%

    return {
      x: Math.max(-65, Math.min(65, randomX)), // Keep within bounds but wider spread
      y: Math.max(-45, Math.min(45, randomY))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">
      {qrCodeUrl && (
        <div className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-gray-100">
          <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
          <p className="text-[10px] text-center mt-2 text-gray-600 font-medium tracking-wide">
            Scan and share
          </p>
        </div>
      )}

      <div className="fixed top-4 left-4 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              📸
              {/* Flash effect */}
              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping ${
                connectionStatus === 'connected' ? 'bg-green-400' :
                connectionStatus === 'connecting' ? 'bg-yellow-400' :
                'bg-red-400'
              }`} />
            </div>
            <span className="text-gray-800 font-medium">Jean-Cadre</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-gray-700 text-sm">
              {totalCount} photo{totalCount !== 1 ? 's' : ''}
            </p>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
          </div>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Waiting for photos...
            </h2>
            <p className="text-gray-500">
              Scan the QR code to start uploading!
            </p>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-screen flex items-center justify-center">
          <div className="relative w-full max-w-6xl h-full">
            {photos.map((photo, index) => {
              const position = getRandomPosition(photo.id)
              const tilt = getRandomTilt(photo.id)
              const isNewestPhoto = index === 0

              return (
                <div
                  key={photo.id}
                  className={`absolute photo-card ${photo.isNewlyAdded && photo.imageLoaded ? 'animate-photo-fly-in' : ''}`}
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${position.x}%), calc(-50% + ${position.y}%)) rotate(${tilt}deg)`,
                    zIndex: photo.isNewlyAdded ? 1000 : 100 - index,
                    transition: photo.isNewlyAdded ? 'none' : 'transform 0.8s ease-out',
                    opacity: photo.imageLoaded ? 1 : 0, // Hide until loaded
                  }}
                >
                  <div className="relative">
                    {photo.imageLoaded ? (
                      <img
                        src={getResizedImageUrl(photo.thumbnailUrl, 300, 300, 70)}
                        alt="Uploaded photo"
                        className="max-w-sm w-full h-auto rounded-lg"
                        style={{ maxHeight: '300px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="max-w-sm w-full rounded-lg bg-gray-200 animate-pulse flex items-center justify-center"
                        style={{ height: '300px' }}
                      >
                        <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 rounded-b-lg">
                      <p className="text-white font-semibold text-sm">
                        {photo.uploaderName}
                      </p>
                      {photo.comment && (
                        <p className="text-white/80 text-xs mt-1">
                          {photo.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
