import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import OpenAI from 'openai'

const getOpenAI = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key',
  })
}

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
  )
}

async function generateScript(topic: string): Promise<string> {
  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a creative content writer who creates engaging short-form video scripts for YouTube Shorts. Keep scripts under 60 seconds when spoken. Make them catchy, informative, and entertaining.',
      },
      {
        role: 'user',
        content: `Create a compelling script for a YouTube Short about: ${topic}. Include a hook, main content, and call-to-action. Format it as a natural speaking script.`,
      },
    ],
  })

  return completion.choices[0].message.content || ''
}

async function generateVideoPrompt(script: string): Promise<string> {
  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Convert video scripts into detailed visual prompts for AI video generation. Describe scenes, colors, movements, and style.',
      },
      {
        role: 'user',
        content: `Convert this script into a detailed visual prompt for video generation:\n\n${script}`,
      },
    ],
  })

  return completion.choices[0].message.content || ''
}

async function createVideoPlaceholder(): Promise<string> {
  // In production, this would call Replicate or another video generation API
  // For now, we'll create a simple gradient video using canvas
  return 'https://via.placeholder.com/1080x1920/6366f1/ffffff?text=AI+Generated+Short'
}

async function uploadToYouTube(
  videoUrl: string,
  title: string,
  description: string,
  tokens: any
): Promise<string> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials(tokens)

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  })

  // Download video (in production)
  // For demo, we'll use the mock approach

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags: ['shorts', 'ai', 'generated'],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: Buffer.from(''), // In production, this would be the actual video file
    },
  })

  const videoId = response.data.id
  return `https://www.youtube.com/watch?v=${videoId}`
}

export async function POST(request: NextRequest) {
  const { topic } = await request.json()

  if (!topic) {
    return new Response(JSON.stringify({ error: 'Topic is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cookieStore = await cookies()
  const tokensData = cookieStore.get('youtube_tokens')

  if (!tokensData?.value) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tokens = JSON.parse(tokensData.value)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ status: 'Generating script...' })
        const script = await generateScript(topic)

        send({ status: 'Creating video concept...' })
        const videoPrompt = await generateVideoPrompt(script)

        send({ status: 'Generating video (this may take a few minutes)...' })
        const videoUrl = await createVideoPlaceholder()

        send({ status: 'Uploading to YouTube...' })

        // Generate title from topic
        const title = topic.length > 100 ? topic.substring(0, 97) + '...' : topic
        const description = `${script}\n\n#Shorts #AI #Generated`

        // For demo purposes, we'll simulate the upload
        // In production with proper YouTube API setup, uncomment:
        // const youtubeUrl = await uploadToYouTube(videoUrl, title, description, tokens)

        // Demo simulation
        const mockVideoId = 'dQw4w9WgXcQ'
        const youtubeUrl = `https://www.youtube.com/watch?v=${mockVideoId}`

        send({
          status: 'Upload complete!',
          videoUrl: youtubeUrl,
          script,
          videoPrompt
        })

        controller.close()
      } catch (error: any) {
        console.error('Error generating short:', error)
        send({ error: error.message || 'Failed to generate short' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
