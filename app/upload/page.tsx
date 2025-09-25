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
  const [batchId] = useState(uuidv4())

  useEffect(() => {
    const savedName = Cookies.get('uploaderName')
    if (savedName) {
      setName(savedName)
    }
  }, [])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const newFiles = Array.from(e.target.files).map(file => ({
      id: uuidv4(),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending' as const
    }))

    setFiles(prev => [...prev, ...newFiles])
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
        alert('All photos uploaded successfully!')
      }, 1500)
    } catch (error) {
      console.error('Batch creation error:', error)
      alert('Failed to start upload. Please try again.')
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Share Your Photos
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Add a message or description..."
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <label className="block mb-4 text-sm font-medium text-gray-700">
              Select Photos
            </label>
            
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            
            <label
              htmlFor="file-upload"
              className="upload-button inline-block cursor-pointer"
            >
              Choose Photos
            </label>

            {files.length > 0 && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map(file => (
                  <div key={file.id} className="relative group">
                    <img
                      src={file.preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
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
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="w-full upload-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} Photo${files.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}