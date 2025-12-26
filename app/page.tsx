'use client'

import { useState } from 'react'

export default function Home() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status')
      const data = await res.json()
      setIsAuthenticated(data.authenticated)
    } catch (err) {
      setIsAuthenticated(false)
    }
  }

  useState(() => {
    checkAuth()
  })

  const handleAuth = () => {
    window.location.href = '/api/auth/youtube'
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setLoading(true)
    setError('')
    setStatus('Generating script...')
    setVideoUrl('')

    try {
      const response = await fetch('/api/generate-short', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate short')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))

              if (data.status) {
                setStatus(data.status)
              }

              if (data.error) {
                setError(data.error)
              }

              if (data.videoUrl) {
                setVideoUrl(data.videoUrl)
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate short')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎬 AI Shorts Maker
          </h1>
          <p className="text-xl text-gray-300">
            Generate AI-powered shorts and upload to YouTube automatically
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          {!isAuthenticated ? (
            <div className="text-center">
              <p className="text-white mb-6">
                Connect your YouTube account to start creating shorts
              </p>
              <button
                onClick={handleAuth}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Connect YouTube Account
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-white mb-2 font-semibold">
                  What should your short be about?
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., 5 Amazing Facts About Space"
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Generating...' : 'Generate & Upload Short'}
              </button>

              {status && (
                <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <p className="text-white">📍 {status}</p>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                  <p className="text-red-300">❌ {error}</p>
                </div>
              )}

              {videoUrl && (
                <div className="mt-6 p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                  <p className="text-green-300 mb-2">✅ Successfully uploaded to YouTube!</p>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 underline"
                  >
                    View on YouTube →
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Powered by OpenAI GPT-4 • YouTube API • Replicate</p>
        </div>
      </div>
    </main>
  )
}
