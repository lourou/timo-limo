'use client'

import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

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

interface Batch {
  id: string
  uploaderName: string
  comment?: string
  timestamp: number
  photos: Photo[]
}

interface ExportProgress {
  current: number
  total: number
  currentFile: string
  status: 'downloading' | 'zipping' | 'complete'
}

// Simple obfuscation for the access code
const validateAccess = (input: string): boolean => {
  const chars = [106, 101, 97, 110, 52, 48] // ASCII codes for j-e-a-n-4-0
  const expected = String.fromCharCode(...chars)
  return input.toLowerCase() === expected
}

export default function ManagePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [deletingPhotos, setDeletingPhotos] = useState<Set<string>>(new Set())

  // Check access on component mount
  useEffect(() => {
    const hasAccess = Cookies.get('hasAccess')
    if (hasAccess !== 'true') {
      setShowPasswordForm(true)
      setLoading(false)
    } else {
      fetchBatches()
    }
  }, [])

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/photos?limit=10000&includeDeleted=true')
      if (response.ok) {
        const data = await response.json() as { photos: Photo[], totalCount: number }

        // Group photos by batch
        const batchMap = new Map<string, Batch>()

        for (const photo of data.photos) {
          if (!batchMap.has(photo.batchId)) {
            batchMap.set(photo.batchId, {
              id: photo.batchId,
              uploaderName: photo.uploaderName,
              comment: photo.comment,
              timestamp: photo.uploadedAt,
              photos: []
            })
          }
          batchMap.get(photo.batchId)!.photos.push(photo)
        }

        // Sort batches by timestamp (most recent first)
        const sortedBatches = Array.from(batchMap.values()).sort((a, b) => b.timestamp - a.timestamp)
        setBatches(sortedBatches)
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

    Cookies.set('hasAccess', 'true', { expires: 365 })
    setShowPasswordForm(false)
    setPasswordError('')
    fetchBatches()
  }

  const toggleBatch = (batchId: string) => {
    const newExpanded = new Set(expandedBatches)
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId)
    } else {
      newExpanded.add(batchId)
    }
    setExpandedBatches(newExpanded)
  }

  const togglePhotoDeleted = async (photoId: string, currentlyDeleted: boolean) => {
    try {
      setDeletingPhotos(prev => new Set(prev).add(photoId))

      const response = await fetch('/api/photos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, deleted: !currentlyDeleted })
      })

      if (response.ok) {
        // Refresh batches to update UI
        await fetchBatches()
      } else {
        console.error('Failed to toggle photo deletion')
      }
    } catch (error) {
      console.error('Error toggling photo deletion:', error)
    } finally {
      setDeletingPhotos(prev => {
        const newSet = new Set(prev)
        newSet.delete(photoId)
        return newSet
      })
    }
  }

  const exportBatch = async (batch: Batch) => {
    try {
      setExportProgress({
        current: 0,
        total: batch.photos.length,
        currentFile: '',
        status: 'downloading'
      })

      const zip = new JSZip()
      const batchFolder = zip.folder(`${batch.uploaderName} - ${new Date(batch.timestamp).toLocaleDateString().replace(/\//g, '-')}`)

      if (!batchFolder) throw new Error('Failed to create batch folder')

      // Create metadata file
      const metadata = {
        uploader: batch.uploaderName,
        batchComment: batch.comment,
        uploadDate: new Date(batch.timestamp).toISOString(),
        photoCount: batch.photos.length,
        photos: batch.photos.map(p => ({
          filename: p.originalFilename || `photo-${p.id}.jpg`,
          uploadedAt: new Date(p.uploadedAt).toISOString(),
          comment: p.comment
        }))
      }
      batchFolder.file('metadata.json', JSON.stringify(metadata, null, 2))

      // Download photos in batches of 5 to avoid overwhelming the browser
      const BATCH_SIZE = 5
      for (let i = 0; i < batch.photos.length; i += BATCH_SIZE) {
        const photoBatch = batch.photos.slice(i, Math.min(i + BATCH_SIZE, batch.photos.length))

        await Promise.all(photoBatch.map(async (photo) => {
          try {
            setExportProgress(prev => prev ? { ...prev, currentFile: photo.originalFilename || photo.id } : null)

            const response = await fetch(photo.originalUrl)
            const blob = await response.blob()
            const filename = photo.originalFilename || `photo-${photo.id}.jpg`

            batchFolder.file(filename, blob)

            setExportProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null)
          } catch (error) {
            console.error(`Failed to download ${photo.originalFilename}:`, error)
          }
        }))
      }

      // Generate zip file
      setExportProgress(prev => prev ? { ...prev, status: 'zipping' } : null)
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setExportProgress(prev => prev ? {
          ...prev,
          current: Math.round(metadata.percent)
        } : null)
      })

      // Save zip file
      const zipFilename = `${batch.uploaderName}-${new Date(batch.timestamp).toLocaleDateString().replace(/\//g, '-')}.zip`
      saveAs(zipBlob, zipFilename)

      setExportProgress({ current: 100, total: 100, currentFile: '', status: 'complete' })
      setTimeout(() => setExportProgress(null), 2000)
    } catch (error) {
      console.error('Error exporting batch:', error)
      setExportProgress(null)
      alert('Failed to export batch. Please try again.')
    }
  }

  const exportAll = async () => {
    try {
      const totalPhotos = batches.reduce((sum, b) => sum + b.photos.length, 0)

      setExportProgress({
        current: 0,
        total: totalPhotos,
        currentFile: '',
        status: 'downloading'
      })

      const zip = new JSZip()

      let photoCount = 0

      for (const batch of batches) {
        const batchFolder = zip.folder(`${batch.uploaderName} - ${new Date(batch.timestamp).toLocaleDateString().replace(/\//g, '-')}`)
        if (!batchFolder) continue

        // Create metadata file for each batch
        const metadata = {
          uploader: batch.uploaderName,
          batchComment: batch.comment,
          uploadDate: new Date(batch.timestamp).toISOString(),
          photoCount: batch.photos.length,
          photos: batch.photos.map(p => ({
            filename: p.originalFilename || `photo-${p.id}.jpg`,
            uploadedAt: new Date(p.uploadedAt).toISOString(),
            comment: p.comment
          }))
        }
        batchFolder.file('metadata.json', JSON.stringify(metadata, null, 2))

        // Download photos in batches
        const BATCH_SIZE = 5
        for (let i = 0; i < batch.photos.length; i += BATCH_SIZE) {
          const photoBatch = batch.photos.slice(i, Math.min(i + BATCH_SIZE, batch.photos.length))

          await Promise.all(photoBatch.map(async (photo) => {
            try {
              setExportProgress(prev => prev ? { ...prev, currentFile: photo.originalFilename || photo.id } : null)

              const response = await fetch(photo.originalUrl)
              const blob = await response.blob()
              const filename = photo.originalFilename || `photo-${photo.id}.jpg`

              batchFolder.file(filename, blob)

              photoCount++
              setExportProgress(prev => prev ? { ...prev, current: photoCount } : null)
            } catch (error) {
              console.error(`Failed to download ${photo.originalFilename}:`, error)
            }
          }))
        }
      }

      // Generate zip file
      setExportProgress(prev => prev ? { ...prev, status: 'zipping' } : null)
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setExportProgress(prev => prev ? {
          ...prev,
          current: Math.round(metadata.percent)
        } : null)
      })

      // Save zip file
      const zipFilename = `all-photos-${new Date().toISOString().split('T')[0]}.zip`
      saveAs(zipBlob, zipFilename)

      setExportProgress({ current: 100, total: 100, currentFile: '', status: 'complete' })
      setTimeout(() => setExportProgress(null), 2000)
    } catch (error) {
      console.error('Error exporting all:', error)
      setExportProgress(null)
      alert('Failed to export photos. Please try again.')
    }
  }

  // Password form
  if (showPasswordForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <div className="text-4xl mb-4">🔧</div>
              <h2 className="text-xl font-medium text-gray-800 mb-4">
                Access Management
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
              Access Management
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
          <div className="text-6xl mb-4 animate-spin">🔧</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    )
  }

  const totalPhotos = batches.reduce((sum, b) => sum + b.photos.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔧</span>
              <h1 className="text-xl font-semibold text-gray-800">Manage Photos</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {batches.length} batches • {totalPhotos} photos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportAll}
                disabled={exportProgress !== null || totalPhotos === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export All ({totalPhotos})
              </button>
              <a
                href="/gallery"
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                View Gallery
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Export Progress Modal */}
      {exportProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">
                {exportProgress.status === 'downloading' && '📥'}
                {exportProgress.status === 'zipping' && '🗜️'}
                {exportProgress.status === 'complete' && '✅'}
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                {exportProgress.status === 'downloading' && 'Downloading Photos'}
                {exportProgress.status === 'zipping' && 'Creating Zip File'}
                {exportProgress.status === 'complete' && 'Export Complete!'}
              </h3>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{exportProgress.current} / {exportProgress.total}</span>
                <span>{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                />
              </div>
              {exportProgress.currentFile && (
                <p className="text-xs text-gray-500 truncate">
                  {exportProgress.currentFile}
                </p>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center">
              Please keep this window open...
            </p>
          </div>
        </div>
      )}

      {/* Batches List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {batches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No photos yet!
            </h2>
            <p className="text-gray-500 mb-4">
              Upload some photos first to manage them here.
            </p>
            <a
              href="/upload"
              className="inline-block bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-gray-800 transition-colors"
            >
              Upload Photos
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => {
              const isExpanded = expandedBatches.has(batch.id)

              return (
                <div key={batch.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Batch Header */}
                  <div className="p-4 flex items-center justify-between">
                    <button
                      onClick={() => toggleBatch(batch.id)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <span className="text-xl">{isExpanded ? '📂' : '📁'}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{batch.uploaderName}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{new Date(batch.timestamp).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{batch.photos.length} photos</span>
                          {batch.comment && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-xs">{batch.comment}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                    </button>

                    <button
                      onClick={() => exportBatch(batch)}
                      disabled={exportProgress !== null}
                      className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export Batch
                    </button>
                  </div>

                  {/* Photos Grid */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {batch.photos.map((photo) => {
                          const isDeleting = deletingPhotos.has(photo.id)
                          const isDeleted = photo.comment?.startsWith('__DELETED__')

                          return (
                            <div
                              key={photo.id}
                              className={`relative aspect-square group ${isDeleted ? 'opacity-50' : ''}`}
                            >
                              <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100">
                                <img
                                  src={photo.thumbnailUrl}
                                  alt={photo.originalFilename || photo.id}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                {isDeleted && (
                                  <div className="absolute inset-0 bg-red-500 bg-opacity-30 flex items-center justify-center">
                                    <span className="text-white text-2xl">🗑️</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center">
                                  <button
                                    onClick={() => togglePhotoDeleted(photo.id, !!isDeleted)}
                                    disabled={isDeleting}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50"
                                  >
                                    {isDeleting ? '...' : isDeleted ? 'Restore' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                              {photo.originalFilename && (
                                <p className="text-xs text-gray-600 mt-1 truncate" title={photo.originalFilename}>
                                  {photo.originalFilename}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
