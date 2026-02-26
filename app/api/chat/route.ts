import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const SYSTEM_PROMPT = `あなたは株式会社Elefantのヒアリング担当AIアシスタントです。
クライアントに対して親しみやすく、プロフェッショナルな態度で接してください。

【ヒアリングの目的】
クライアントのAI活用ニーズと業務課題を理解し、最適なソリューションを提案するための情報収集。

【収集すべき情報】
1. 名前と現在の職業（具体的にどのような業務をしているか）
2. AIをどのように使いたいか（期待していること）
3. 業務で具体的に困っていること（課題・ペイン）

【ヒアリングのルール】
- 一度に複数の質問をしない（1つずつ丁寧に聞く）
- 相手の回答を深掘りする（「具体的には？」「例えば？」）
- 共感を示しながら進める
- 専門用語は避け、わかりやすい言葉を使う
- 回答が曖昧な場合は、優しく具体例を求める

【会話の流れ】
1. 挨拶と自己紹介
2. 名前と職業を聞く
3. AI活用への期待を聞く
4. 業務上の課題を深掘りする
5. 最後に要約と感謝

最初のメッセージでは、明るく挨拶し、まずお名前と現在のお仕事について聞いてください。`

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Dynamic import to avoid build-time initialization
async function getOpenAI() {
  const { OpenAI } = await import('openai')
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(req: NextRequest) {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    )
  }

  try {
    const { messages, sessionId } = await req.json()
    const openai = await getOpenAI()

    // OpenAI API call
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const assistantMessage = response.choices[0].message.content

    // Save to Supabase
    if (sessionId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = createServerClient()
        
        // Update session with latest messages
        const allMessages = [
          ...messages,
          { role: 'assistant', content: assistantMessage },
        ]

        await supabase
          .from('hearing_sessions')
          .upsert({
            id: sessionId,
            messages: allMessages,
            updated_at: new Date().toISOString(),
          })
      } catch (dbError) {
        console.error('Database save error:', dbError)
        // Continue even if database save fails
      }
    }

    return NextResponse.json({ 
      message: assistantMessage,
      sessionId,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'チャットの処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// Disable static generation
export const dynamic = 'force-dynamic'
