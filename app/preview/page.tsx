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

export default function PreviewPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const eventSourceRef = useRef<EventSource | null>(null)

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

            setPhotos(prev => {
              console.log('Current photos count:', prev.length)
              // New photo goes on top (index 0), existing photos shift down
              const filtered = prev.filter(p => p.id !== newPhoto.id)
              const updated = [newPhoto, ...filtered]
              console.log('Updated photos count:', updated.length)
              return updated.slice(0, 10)
            })
          } else {
            // Handle old format for backwards compatibility
            const newPhoto: Photo = message
            console.log('Legacy photo format:', newPhoto)
            setPhotos(prev => [newPhoto, ...prev.filter(p => p.id !== newPhoto.id)].slice(0, 10))
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

    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  // Generate random tilt for each photo (consistent per photo ID)
  const getRandomTilt = (photoId: string) => {
    const tilts = [-8, -6, -4, -2, -1, 0, 1, 2, 4, 6, 8, 12, -12, 15, -15]
    const hash = photoId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return tilts[hash % tilts.length]
  }

  const getRandomPosition = (index: number, photoId: string) => {
    const hash = photoId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)

    // Create a grid-based layout with random offsets
    const cols = 4
    const rows = Math.ceil(10 / cols)

    const col = index % cols
    const row = Math.floor(index / cols)

    // Base positions in a grid
    const baseX = (col / (cols - 1)) * 80 - 40 // -40% to +40%
    const baseY = (row / (rows - 1)) * 60 - 30 // -30% to +30%

    // Add randomness based on photo ID for consistent positioning
    const randomX = baseX + ((hash % 40) - 20) // ±20% additional offset
    const randomY = baseY + (((hash * 7) % 30) - 15) // ±15% additional offset

    return {
      x: Math.max(-45, Math.min(45, randomX)), // Keep within bounds
      y: Math.max(-35, Math.min(35, randomY))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 relative overflow-hidden">
      {qrCodeUrl && (
        <div className="fixed top-4 right-4 z-50 bg-white p-3 rounded-xl shadow-xl">
          <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
          <p className="text-xs text-center mt-2 font-medium text-gray-600">
            Scan to Upload
          </p>
        </div>
      )}

      <div className="fixed top-4 left-4 z-40">
        <h1 className="text-4xl font-bold text-gray-800">
          Jean Cadre 📸
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-gray-600">
            {totalCount > 0
              ? `${totalCount} photo${totalCount !== 1 ? 's' : ''} shared${photos.length < totalCount ? ` (showing ${photos.length})` : ''}`
              : `${photos.length} photo${photos.length !== 1 ? 's' : ''} shared`
            }
          </p>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} title={`Connection ${connectionStatus}`} />
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
        <div className="relative w-full h-screen flex items-center justify-center pt-20">
          <div className="relative w-full max-w-6xl h-full">
            {photos.map((photo, index) => {
              const position = getRandomPosition(index, photo.id)
              const tilt = getRandomTilt(photo.id)

              return (
                <div
                  key={photo.id}
                  className={`absolute photo-card ${index === 0 ? 'animate-photo-fly-in' : 'animate-photo-drop'}`}
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${position.x}%), calc(-50% + ${position.y}%)) rotate(${tilt}deg)`,
                    zIndex: 100 - index, // New photos (index 0) have highest z-index
                    animationDelay: index === 0 ? '0s' : `${index * 0.1}s`,
                    transition: 'transform 0.8s ease-out',
                  }}
                >
                  <div className="relative">
                    <img
                      src={getResizedImageUrl(photo.thumbnailUrl, 400, 400, 85)}
                      alt="Uploaded photo"
                      className="max-w-sm w-full h-auto rounded-lg"
                      style={{ maxHeight: '400px', objectFit: 'cover' }}
                    />
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