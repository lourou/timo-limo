'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

interface Photo {
  id: string
  url: string
  thumbnailUrl: string
  uploaderName: string
  comment?: string
  timestamp: number
}

export default function PreviewPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState('')
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
      eventSourceRef.current = new EventSource('/api/photos/stream')
      
      eventSourceRef.current.onmessage = (event) => {
        const newPhoto: Photo = JSON.parse(event.data)
        setPhotos(prev => [newPhoto, ...prev])
      }

      eventSourceRef.current.onerror = () => {
        eventSourceRef.current?.close()
        setTimeout(connectSSE, 5000)
      }
    }

    connectSSE()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const getRandomRotation = () => {
    const rotations = ['-rotate-1', '-rotate-2', 'rotate-1', 'rotate-2', '-rotate-3', 'rotate-3']
    return rotations[Math.floor(Math.random() * rotations.length)]
  }

  const getRandomPosition = (index: number) => {
    const spread = 150
    const baseX = (index % 3) * 20 - 20
    const baseY = Math.floor(index / 3) * 10
    const randomX = baseX + (Math.random() - 0.5) * spread
    const randomY = baseY + (Math.random() - 0.5) * 50
    return { x: randomX, y: randomY }
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
          Photo Stream
        </h1>
        <p className="text-gray-600 mt-2">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} shared
        </p>
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
              const position = getRandomPosition(index)
              const rotation = getRandomRotation()
              
              return (
                <div
                  key={photo.id}
                  className={`absolute photo-card ${rotation} animate-photo-drop`}
                  style={{
                    left: '50%',
                    top: '40%',
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                    zIndex: photos.length - index,
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <div className="relative">
                    <img
                      src={photo.thumbnailUrl || photo.url}
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