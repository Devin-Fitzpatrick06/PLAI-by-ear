"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useSheetMusicStore } from "@/lib/store"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Music, Info, AlertTriangle, ExternalLink, Brain, Zap, Crown } from "lucide-react"

interface AudioAnalyzerProps {
  audioFile: File | null
}

export function AudioAnalyzer({ audioFile }: AudioAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [audioData, setAudioData] = useState<Float32Array | null>(null)
  const [progress, setProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [apiKeyError, setApiKeyError] = useState(false)
  const [quotaError, setQuotaError] = useState(false)
  const [modelError, setModelError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { setSheetMusic, setLoading } = useSheetMusicStore()

  const testApiKey = async () => {
    try {
      setIsAnalyzing(true)
      const response = await fetch("/api/test-gemini")
      const result = await response.json()

      if (result.success) {
        console.log("API Test Result:", result)
        setApiKeyError(false)
        setModelError(false)
      } else {
        console.error("API key test failed", result)
        setApiKeyError(true)
      }
    } catch (error) {
      console.error("API test error:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeAudio = async () => {
    if (!audioFile) return

    try {
      setIsAnalyzing(true)
      setLoading(true)
      setProgress(0)
      setAnalysisResult(null)
      setApiKeyError(false)
      setQuotaError(false)
      setModelError(false)

      // Show initial progress
      setProgress(10)

      // Create audio context for waveform display
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const channelData = audioBuffer.getChannelData(0)
      setAudioData(channelData)
      drawWaveform(channelData)

      setProgress(30)

      // Prepare form data for API
      const formData = new FormData()
      formData.append("audio", audioFile)

      setProgress(50)

      // Call Gemini API for musical analysis
      console.log("🚀 Calling Gemini 2.5 Pro Preview API for analysis...")
      const response = await fetch("/api/analyze-audio-gemini", {
        method: "POST",
        body: formData,
      })

      console.log("📡 API Response status:", response.status)
      console.log("📡 API Response ok:", response.ok)

      setProgress(80)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ API Error:", errorData)

        // Check for quota error
        if (response.status === 429 || errorData.errorType === "quota_exceeded") {
          setQuotaError(true)
          throw new Error("API quota exceeded")
        }

        // Check for model availability error
        if (errorData.errorType === "model_unavailable") {
          setModelError(true)
          throw new Error("Gemini model not available")
        }

        // Check if it's an API key error
        if (
          errorData.errorType === "invalid_key" ||
          errorData.error?.includes("API key") ||
          errorData.details?.includes("API key") ||
          errorData.error?.includes("not configured")
        ) {
          setApiKeyError(true)
          console.error("🔑 API Key Error Details:", errorData)
        }

        throw new Error(errorData.error || "Failed to analyze audio")
      }

      const result = await response.json()
      setAnalysisResult(result)

      // Convert to sheet music format
      const sheetMusicData = {
        title: result.title,
        timeSignature: result.timeSignature,
        keySignature: result.keySignature,
        tempo: result.tempo,
        duration: result.duration,
        sampleRate: audioBuffer.sampleRate,
        notes: result.notes,
        analysis: result.analysis,
        processingInfo: result.processingInfo,
      }

      setSheetMusic(sheetMusicData)
      setProgress(100)

      console.log("🎼 Gemini 2.5 Pro Analysis Complete!")

      // Close audio context
      audioContext.close()
    } catch (error) {
      console.error("Error analyzing audio:", error)
    } finally {
      setIsAnalyzing(false)
      setLoading(false)
      setProgress(0)
    }
  }

  const drawWaveform = (channelData: Float32Array) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = "hsl(var(--primary))"
    ctx.lineWidth = 1

    ctx.beginPath()
    const sliceWidth = width / Math.min(channelData.length, 2000)
    let x = 0

    const step = Math.floor(channelData.length / 2000)
    for (let i = 0; i < channelData.length; i += step) {
      const v = channelData[i] * 0.5
      const y = ((v + 1) * height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.stroke()
  }

  return (
    <div className="space-y-4">
      {audioFile && (
        <div className="space-y-4">
          {quotaError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>API Quota Exceeded</strong>
                <p className="mt-2">You've reached your Google AI API usage limit. Try these solutions:</p>
                <ul className="text-sm space-y-1 ml-6 mt-3">
                  <li>• Wait for quota reset (usually daily)</li>
                  <li>
                    • Check usage at{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Google AI Studio <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </li>
                  <li>• Consider upgrading to a paid plan</li>
                  <li>• Try again tomorrow</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {modelError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Gemini Model Not Available</strong>
                <p className="mt-2">
                  The advanced Gemini models may not be available in your region or with your API key:
                </p>
                <ul className="text-sm space-y-1 ml-6 mt-3">
                  <li>• Check if you have access to Gemini 2.5 Pro models</li>
                  <li>• Verify your API key has the necessary permissions</li>
                  <li>• Try again later as the model may be temporarily unavailable</li>
                  <li>• The system will automatically fall back to available models</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {apiKeyError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Google AI API Key Not Found</strong>
                <p className="mt-2">The system cannot find your Google AI API key. Follow these steps:</p>
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border">
                    <strong>Step 1:</strong> Get your API key from{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Google AI Studio <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border">
                    <strong>Step 2:</strong> Create <code>.env.local</code> file in your project root directory
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border">
                    <strong>Step 3:</strong> Add this line: <code>GOOGLE_AI_API_KEY=your_actual_api_key_here</code>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border">
                    <strong>Step 4:</strong> Stop your development server (Ctrl+C) and restart it completely
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border">
                    <strong>Step 5:</strong> Refresh this page and try again
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200">
                  <strong>⚠️ Important:</strong> Make sure there are no spaces around the = sign and no quotes around the
                  API key.
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="p-4 border rounded-lg">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>File:</strong> {audioFile.name}
                </div>
                <div>
                  <strong>Size:</strong> {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <div>
                  <strong>Type:</strong> {audioFile.type}
                </div>
                <div>
                  <strong>Duration:</strong> {audioData ? (audioData.length / 44100).toFixed(1) : "?"} seconds
                </div>
              </div>

              {isAnalyzing && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    {progress < 30 && "Preparing..."}
                    {progress >= 30 && progress < 50 && "Uploading..."}
                    {progress >= 50 && progress < 80 && "Analyzing..."}
                    {progress >= 80 && "Processing results..."}
                  </p>
                </div>
              )}

              <Button onClick={analyzeAudio} disabled={isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <>
                    <Music className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
