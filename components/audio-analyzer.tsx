"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
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
  const { toast } = useToast()
  const { setSheetMusic, setLoading } = useSheetMusicStore()

  const testApiKey = async () => {
    try {
      setIsAnalyzing(true)
      const response = await fetch("/api/test-gemini")
      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Gemini API Key Working!",
          description: `Your Google AI API key is working with ${result.workingModel}`,
        })
        setApiKeyError(false)
        setModelError(false)
      } else {
        toast({
          title: "❌ API Key Test Failed",
          description: result.error || "API key test failed",
          variant: "destructive",
        })
        setApiKeyError(true)
      }

      console.log("API Test Result:", result)
    } catch (error) {
      console.error("API test error:", error)
      toast({
        title: "❌ API Test Error",
        description: "Failed to test API key",
        variant: "destructive",
      })
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

      // Download raw API response as JSON
      const rawResponseData = {
        timestamp: new Date().toISOString(),
        audioFile: {
          name: audioFile.name,
          size: audioFile.size,
          type: audioFile.type,
        },
        geminiApiResponse: result,
        processingInfo: {
          modelUsed: result.modelUsed,
          sampleRate: audioBuffer.sampleRate,
          duration: audioBuffer.duration,
        }
      }

      // Create and download JSON file
      const jsonString = JSON.stringify(rawResponseData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gemini-api-response-${audioFile.name.replace(/\.[^/.]+$/, '')}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "🎼 Gemini 2.5 Pro Analysis Complete!",
        description: `Advanced AI detected ${result.notes.length} musical notes using ${result.modelUsed}. Raw API response downloaded as JSON.`,
      })

      // Close audio context
      audioContext.close()
    } catch (error) {
      console.error("Error analyzing audio:", error)
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "There was an error analyzing your audio file",
        variant: "destructive",
      })
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

          <Alert>
            <Crown className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center gap-2 mb-2">
                <strong>Google Gemini 2.5 Pro Preview Musical Analysis</strong>
                <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-blue-500">
                  <Crown className="h-3 w-3 mr-1" />
                  Gemini 2.5 Pro
                </Badge>
              </div>
              <p>
                Using Google's most advanced Gemini 2.5 Pro Preview model for state-of-the-art musical transcription.
                This flagship model offers the highest accuracy, deepest musical understanding, and most sophisticated
                audio analysis capabilities available.
              </p>
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Advanced AI Musical Analysis
              <Badge variant="outline" className="ml-2 border-purple-200">
                <Crown className="h-3 w-3 mr-1" />
                Gemini 2.5 Pro
              </Badge>
            </h3>

            <div className="space-y-4">
              {/* Add API test button */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={testApiKey} disabled={isAnalyzing} className="flex-1">
                  {isAnalyzing ? "Testing..." : "🔑 Test Gemini 2.5 Pro API"}
                </Button>
              </div>

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
                    {progress < 30 && "Preparing audio for Gemini 2.5 Pro analysis..."}
                    {progress >= 30 && progress < 50 && "Uploading to Google's most advanced AI..."}
                    {progress >= 50 && progress < 80 && "Gemini 2.5 Pro analyzing musical content..."}
                    {progress >= 80 && "Processing advanced AI transcription results..."}
                  </p>
                </div>
              )}

              <Button onClick={analyzeAudio} disabled={isAnalyzing} className="w-full">
                {isAnalyzing ? (
                  <>
                    <Crown className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing with Gemini 2.5 Pro...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Analyze with Gemini 2.5 Pro
                  </>
                )}
              </Button>
            </div>
          </div>

          {analysisResult && (
            <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Advanced AI Analysis Results
                <Badge variant="outline" className="border-purple-200">
                  {analysisResult.modelUsed?.includes("2.5") ? (
                    <Crown className="h-3 w-3 mr-1" />
                  ) : (
                    <Brain className="h-3 w-3 mr-1" />
                  )}
                  {analysisResult.modelUsed || "Gemini AI"}
                </Badge>
              </h4>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <strong>Detected Instrument:</strong> {analysisResult.analysis?.instrument || "Unknown"}
                </div>
                <div>
                  <strong>Musical Complexity:</strong>{" "}
                  <Badge variant={analysisResult.analysis?.complexity === "simple" ? "default" : "secondary"}>
                    {analysisResult.analysis?.complexity || "Unknown"}
                  </Badge>
                </div>
                <div>
                  <strong>Audio Quality:</strong> {analysisResult.analysis?.quality || "Unknown"}
                </div>
                <div>
                  <strong>AI-Detected Notes:</strong> {analysisResult.notes?.length || 0}
                </div>
                <div>
                  <strong>Key Detected:</strong> {analysisResult.analysis?.keyDetected || "Unknown"}
                </div>
                <div>
                  <strong>Tempo Detected:</strong> {analysisResult.analysis?.tempoDetected || "Unknown"} BPM
                </div>
                <div>
                  <strong>Musical Style:</strong> {analysisResult.analysis?.musicalStyle || "Unknown"}
                </div>
                <div>
                  <strong>Dynamic Range:</strong> {analysisResult.analysis?.dynamicRange || "Unknown"}
                </div>
              </div>

              {analysisResult.processingInfo && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded border mb-4">
                  <strong className="text-sm flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Gemini 2.5 Pro Processing Details:
                  </strong>
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <div>Original notes detected: {analysisResult.processingInfo.originalNotesCount}</div>
                    <div>High-confidence notes kept: {analysisResult.processingInfo.filteredNotesCount}</div>
                    <div>Confidence threshold: {analysisResult.processingInfo.confidenceThreshold * 100}%</div>
                    <div>Analysis method: {analysisResult.processingInfo.analysisMethod}</div>
                    <div>Model used: {analysisResult.modelUsed}</div>
                    {analysisResult.processingInfo.modelFallback && (
                      <div className="text-yellow-600 dark:text-yellow-400">
                        ⚠️ Fallback model used (Gemini 2.5 Pro may not be available)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analysisResult.analysis?.recommendations && (
                <div className="p-3 bg-background rounded border">
                  <strong className="text-sm">AI Recommendations:</strong>
                  <p className="text-sm text-muted-foreground mt-1">{analysisResult.analysis.recommendations}</p>
                </div>
              )}
            </div>
          )}

          {audioData && (
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Audio Waveform</h4>
              <canvas ref={canvasRef} width={600} height={200} className="w-full border rounded bg-background" />
              <p className="text-xs text-muted-foreground mt-2">
                Waveform visualization ({(audioData.length / 44100).toFixed(1)} seconds total)
              </p>
            </div>
          )}

          <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Gemini 2.5 Pro Advantages
            </h4>
            <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="h-3 w-3" />
                <span>
                  <strong>Latest Preview Model:</strong> Uses the most advanced Gemini 2.5 Pro Preview version
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                <span>
                  <strong>Advanced Harmonic Analysis:</strong> Detects complex chord progressions and voice leading
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                <span>
                  <strong>Professional-Grade Accuracy:</strong> Highest precision for complex musical arrangements
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-3 w-3" />
                <span>
                  <strong>Intelligent Fallback:</strong> Automatically uses best available model if 2.5 Pro unavailable
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
