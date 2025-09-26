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
  const [showNameForm, setShowNameForm] = useState(true)
  const [batchCreated, setBatchCreated] = useState(false)

  useEffect(() => {
    const savedName = Cookies.get('uploaderName')
    if (savedName) {
      setName(savedName)
      setShowNameForm(false)
    }
  }, [])



  // Upload individual file to existing batch
  const uploadFile = async (uploadFile: UploadFile) => {
    console.log('Upload file called:', {
      fileId: uploadFile.id,
      batchCreated,
      batchId
    })

    // Ensure batch exists - create one if needed
    if (!batchCreated && name.trim()) {
      console.log('Creating batch in uploadFile for:', name)
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

        if (!batchResponse.ok) {
          throw new Error('Failed to create batch')
        }

        setBatchCreated(true)
        console.log('Batch ready for upload')
      } catch (error) {
        console.error('Batch creation error in uploadFile:', error)
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error' as const }
            : f
        ))
        return
      }
    }

    if (!batchCreated && !name.trim()) {
      console.error('Cannot upload - no name provided')
      return
    }

    setFiles(prev => prev.map(f =>
      f.id === uploadFile.id
        ? { ...f, status: 'uploading' as const }
        : f
    ))

    try {
      // Upload the file to existing batch
      const formData = new FormData()
      formData.append('file', uploadFile.file)
      formData.append('batchId', batchId) // Use session batch ID
      formData.append('fileId', uploadFile.id)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const result = await response.json() as { photo: { thumbnailUrl: string } }

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? {
              ...f,
              status: 'complete' as const,
              progress: 100,
              // Update preview to use uploaded thumbnail instead of blob
              preview: result.photo.thumbnailUrl
            }
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

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    console.log('File select triggered:', {
      hasFiles: !!e.target.files,
      showNameForm,
      batchCreated,
      filesLength: e.target.files?.length
    })

    if (!e.target.files || showNameForm) return

    // Create batch automatically if user has saved name but no batch exists
    if (!batchCreated && name.trim()) {
      console.log('Auto-creating batch for user with saved name:', name)
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

        setBatchCreated(true)
        console.log('Auto-created batch:', batchId)
      } catch (error) {
        console.error('Auto batch creation error:', error)
        alert('Failed to start session. Please try again.')
        setBatchId(uuidv4()) // Reset batch ID on error
        return
      }
    }

    const selectedFiles = Array.from(e.target.files)

    // Only allow image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const validFiles = selectedFiles.filter(file => allowedTypes.includes(file.type.toLowerCase()))

    if (validFiles.length !== selectedFiles.length) {
      alert('Only image files are allowed (JPEG, PNG, WebP, HEIC)')
    }

    const newFiles = validFiles.map(file => ({
      id: uuidv4(),
      file,
      preview: '', // No preview until upload completes
      progress: 0,
      status: 'pending' as const
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Start uploads immediately (no local previews)
    newFiles.forEach(file => {
      uploadFile(file)
    })

    // Reset file input so user can select more files
    e.target.value = ''
  }

  const handleNameSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('Please enter your name')
      return
    }

    Cookies.set('uploaderName', name, { expires: 365 })

    // Create ONE batch for this user session
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

      setBatchCreated(true)
      setShowNameForm(false)
    } catch (error) {
      console.error('Batch creation error:', error)
      alert('Failed to start session. Please try again.')
      setBatchId(uuidv4()) // Reset batch ID on error
    }
  }

  // Show confetti when all uploads complete
  const checkForCompletion = () => {
    const completedFiles = files.filter(f => f.status === 'complete')
    if (files.length > 0 && completedFiles.length === files.length) {
      setTimeout(() => {
        setShowConfetti(true)
        // Don't auto-hide confetti - user must click to dismiss
      }, 500)
    }
  }

  // Upload more photos (start new session)
  const uploadMore = async () => {
    setFiles([])
    setShowConfetti(false)
    setComment('') // Clear previous comment

    // Generate ONE new batch ID for the new session
    const newBatchId = uuidv4()
    setBatchId(newBatchId)
    setBatchCreated(false) // Reset batch created flag for new session

    // If user name is already set, create batch immediately
    if (name.trim()) {
      try {
        const batchResponse = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: newBatchId,
            uploaderName: name,
            comment: comment || undefined
          })
        })

        if (!batchResponse.ok) throw new Error('Failed to create batch')

        setBatchCreated(true)
        console.log('New batch created for upload more:', newBatchId)
      } catch (error) {
        console.error('Batch creation error on upload more:', error)
        setBatchCreated(false)
        // Show name form again if batch creation fails
        setShowNameForm(true)
      }
    } else {
      setShowNameForm(true) // Show name form if no name saved
    }
  }

  // Check for completion whenever files change
  useEffect(() => {
    checkForCompletion()
  }, [files])

  const removeFile = (id: string) => {
    const file = files.find(f => f.id === id)
    if (file && file.preview.startsWith('blob:')) {
      URL.revokeObjectURL(file.preview)
    }
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleNameChange = () => {
    setShowNameForm(true)
    setBatchCreated(false) // Allow creating new batch with new name
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div
          className="fixed inset-0 z-50 overflow-hidden cursor-pointer"
          onClick={() => setShowConfetti(false)}
        >
          {Array.from({ length: 100 }).map((_, i) => {
            const shapes = ['📸', '📷', '📹', '🎬', '🖼️', '🎨', '🌟', '✨', '💫', '🎞️', '📺', '🎥', '🏞️', '🌅', '🌄', '🌆', '🌇', '🌉', '🎆', '🎇']
            const colors = ['#ff6b9d', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#fd79a8', '#00cec9', '#a29bfe', '#ffeaa7']
            const isEmoji = Math.random() > 0.3 // More emojis!

            return (
              <div
                key={i}
                className="absolute animate-confetti pointer-events-none"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${4 + Math.random() * 3}s` // Slower falling
                }}
              >
                {isEmoji ? (
                  <span style={{ fontSize: `${18 + Math.random() * 12}px` }}>
                    {shapes[Math.floor(Math.random() * shapes.length)]}
                  </span>
                ) : (
                  <div
                    style={{
                      width: `${8 + Math.random() * 8}px`,
                      height: `${8 + Math.random() * 8}px`,
                      backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                      borderRadius: Math.random() > 0.5 ? '50%' : '3px'
                    }}
                  />
                )}
              </div>
            )
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-xl border border-gray-200 text-center animate-bounce">
              <div className="text-4xl mb-2 animate-pulse">📸🎉</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Jean Cadre says</h3>
              <p className="text-sm text-gray-600 mb-4">Merci beaucoup ! Thank you so much!</p>
              <div className="space-y-3">
                <button
                  onClick={uploadMore}
                  className="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all duration-300 pointer-events-auto animate-pulse hover:animate-none hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  📸 Upload More Photos 🎉
                </button>
                <div className="text-center">
                  <a
                    href="/gallery"
                    className="inline-block bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200 pointer-events-auto"
                  >
                    🎡 Browse All Photos
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto pt-8">
        {showNameForm ? (
          /* Name form */
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <div className="text-4xl mb-4">📸</div>
              <h2 className="text-xl font-medium text-gray-800 mb-4">
                Start uploading photos
              </h2>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-transparent focus:border-gray-400 focus:ring-0 placeholder-gray-400 text-center"
                placeholder="Your name"
                required
                autoFocus
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full mt-4 px-4 py-3 border border-gray-200 rounded-xl bg-transparent focus:border-gray-400 focus:ring-0 placeholder-gray-400 resize-none"
                rows={2}
                placeholder="Add a comment (optional)"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
            >
              Continue
            </button>
          </form>
        ) : (
          /* Photo upload interface */
          <div className="space-y-6">
            {/* Header with name and edit option */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Uploading as</p>
                <p className="font-medium text-gray-800">{name}</p>
                {comment && <p className="text-sm text-gray-600 mt-1">{comment}</p>}
              </div>
              <button
                onClick={handleNameChange}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>

            {/* Photo selection */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />

              <label
                htmlFor="file-upload"
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Choose photos to upload
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Photos upload automatically
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
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {file.status === 'complete' && (
                        <div className="absolute inset-0 bg-green-500 bg-opacity-50 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {file.status === 'error' && (
                        <div className="absolute inset-0 bg-red-500 bg-opacity-50 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {file.status === 'error' && (
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-colors"
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

            {files.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {files.filter(f => f.status === 'complete').length} of {files.length} uploaded
                  </span>
                  <span className="text-gray-500">
                    {files.filter(f => f.status === 'uploading').length > 0 && 'Uploading...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
