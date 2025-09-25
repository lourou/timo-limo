'use client'

import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'

interface UploadFile {
  id: string
  file: File
  preview: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [batchId, setBatchId] = useState(uuidv4())
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const savedName = Cookies.get('uploaderName')
    if (savedName) {
      setName(savedName)
    }
  }, [])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const selectedFiles = Array.from(e.target.files)
    const currentFileCount = files.length
    const maxFiles = 6

    // Check if adding these files would exceed the limit
    if (currentFileCount + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. You can select ${maxFiles - currentFileCount} more.`)
      return
    }

    const newFiles = selectedFiles.map(file => ({
      id: uuidv4(),
      file,
      preview: '', // Start with empty preview
      progress: 0,
      status: 'pending' as const
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Generate previews with requestAnimationFrame to avoid UI freezing
    const generatePreviewsAsync = async () => {
      for (let i = 0; i < newFiles.length; i++) {
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            setFiles(prev => prev.map(f =>
              f.id === newFiles[i].id
                ? { ...f, preview: URL.createObjectURL(newFiles[i].file) }
                : f
            ))
            setTimeout(resolve, 16) // ~60fps timing
          })
        })
      }
    }
    generatePreviewsAsync()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || files.length === 0) {
      alert('Please enter your name and select at least one photo')
      return
    }

    Cookies.set('uploaderName', name, { expires: 365 })
    setIsUploading(true)

    try {
      const batchResponse = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          uploaderName: name,
          comment: comment || undefined
        })
      })

      if (!batchResponse.ok) throw new Error('Failed to create batch')

      for (const uploadFile of files) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading' as const }
            : f
        ))

        const formData = new FormData()
        formData.append('file', uploadFile.file)
        formData.append('batchId', batchId)
        formData.append('fileId', uploadFile.id)

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) throw new Error('Upload failed')

          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'complete' as const, progress: 100 }
              : f
          ))
        } catch (error) {
          console.error('Upload error:', error)
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error' as const }
              : f
          ))
        }
      }

      setTimeout(() => {
        setFiles([])
        setComment('')
        setBatchId(uuidv4()) // Reset batch ID for next upload
        setShowConfetti(true)

        // Hide confetti after 3 seconds
        setTimeout(() => setShowConfetti(false), 3000)
      }, 1500)
    } catch (error) {
      console.error('Batch creation error:', error)
      alert('Failed to start upload. Please try again.')
      setBatchId(uuidv4()) // Reset batch ID on error to avoid UNIQUE constraint
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (id: string) => {
    const file = files.find(f => f.id === id)
    if (file) {
      URL.revokeObjectURL(file.preview)
    }
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <div
                className="w-2 h-2 rounded"
                style={{
                  backgroundColor: ['#ff6b9d', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 6)]
                }}
              />
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl px-8 py-6 shadow-2xl text-center animate-bounce">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-xl font-semibold text-gray-800">Photos uploaded!</h3>
              <p className="text-gray-600 mt-1">Check the preview page</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto pt-8">
        <h1 className="text-2xl font-light text-gray-900 mb-8 text-center">
          Jean Cadre 📸
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo selection first */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isUploading || files.length >= 6}
            />

            <label
              htmlFor="file-upload"
              className={`w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors ${
                files.length >= 6
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 cursor-pointer hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm text-gray-600">
                  {files.length >= 6 ? 'Maximum 6 photos' : 'Choose photos'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {files.length >= 6 ? 'Remove some to add more' : `${files.length}/6 selected`}
                </p>
              </div>
            </label>

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {files.map(file => (
                  <div key={file.id} className="relative group">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt="Preview"
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
                        <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {file.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="text-white text-sm">Uploading...</div>
                      </div>
                    )}
                    {file.status === 'complete' && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-50 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {file.status === 'pending' && !isUploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Name and comment fields - minimal design */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-0 py-2 border-0 border-b border-gray-200 bg-transparent focus:border-gray-400 focus:ring-0 placeholder-gray-400"
              placeholder="Your name"
              required
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-0 py-2 border-0 border-b border-gray-200 bg-transparent focus:border-gray-400 focus:ring-0 placeholder-gray-400 resize-none"
              rows={2}
              placeholder="Add a comment (optional)"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="w-full bg-gray-900 text-white py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} Photo${files.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}