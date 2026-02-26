'use client'

import { useState, useEffect } from 'react'

interface HearingSession {
  id: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  created_at: string
  updated_at: string
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessions, setSessions] = useState<HearingSession[]>([])
  const [selectedSession, setSelectedSession] = useState<HearingSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/sessions', {
        headers: {
          'x-admin-password': password,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
        setIsAuthenticated(true)
        // Save password for subsequent requests
        sessionStorage.setItem('adminPassword', password)
      } else {
        alert('パスワードが正しくありません')
      }
    } catch {
      alert('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // Load sessions if already authenticated
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('adminPassword')
    if (savedPassword) {
      setPassword(savedPassword)
      fetch('/api/admin/sessions', {
        headers: { 'x-admin-password': savedPassword },
      })
        .then((res) => {
          if (res.ok) {
            res.json().then((data) => {
              setSessions(data.sessions)
              setIsAuthenticated(true)
            })
          }
        })
        .catch(() => {})
    }
  }, [])

  const extractInfo = (session: HearingSession) => {
    const messages = session.messages || []
    let name = '未取得'
    let job = '未取得'
    
    // Extract name and job from user messages
    for (const msg of messages) {
      if (msg.role === 'user') {
        const content = msg.content
        // Simple heuristic - first user message often contains name
        if (name === '未取得' && content.length < 50) {
          name = content.slice(0, 20)
        }
      }
    }

    return { name, messageCount: messages.filter(m => m.role === 'user').length }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">管理者ログイン</h1>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="パスワードを入力"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleLogin}
              disabled={isLoading || !password}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">ヒアリング管理</h1>
          <button
            onClick={() => {
              sessionStorage.removeItem('adminPassword')
              setIsAuthenticated(false)
              setPassword('')
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-semibold">セッション一覧</h2>
                <p className="text-sm text-gray-500">{sessions.length}件</p>
              </div>
              <div className="divide-y max-h-[70vh] overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    まだセッションがありません
                  </div>
                ) : (
                  sessions.map((session) => {
                    const info = extractInfo(session)
                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                          selectedSession?.id === session.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="font-medium truncate">{info.name}</p>
                        <p className="text-sm text-gray-500">
                          {info.messageCount}件の回答 • {formatDate(session.updated_at)}
                        </p>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Session Detail */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">会話履歴</h2>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedSession.created_at)} 開始
                  </p>
                </div>
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  {selectedSession.messages?.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-xs mb-1 opacity-70">
                          {msg.role === 'user' ? 'クライアント' : 'AI'}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                左のリストからセッションを選択してください
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
