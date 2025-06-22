"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Music, Upload, FileAudio, Play, Pause } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AudioAnalyzer } from "@/components/audio-analyzer"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export default function AudioUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [audioData, setAudioData] = useState<Float32Array | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const processFile = async (selectedFile: File) => {
    // Check if the file is an audio file
    if (!selectedFile.type.startsWith("audio/")) {
      return
    }

    setFile(selectedFile)
    
    // Process audio for waveform
    try {
      console.log("Processing audio file:", selectedFile.name)
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      setAudioContext(context)
      
      const arrayBuffer = await selectedFile.arrayBuffer()
      console.log("Audio file loaded, size:", arrayBuffer.byteLength)
      
      const buffer = await context.decodeAudioData(arrayBuffer)
      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      
      console.log("Audio decoded:", { duration: buffer.duration, sampleRate: buffer.sampleRate })
      
      const channelData = buffer.getChannelData(0)
      setAudioData(channelData)
      
      console.log("Channel data ready, length:", channelData.length)
      
      // Draw waveform
      drawWaveform(channelData)
    } catch (error) {
      console.error("Error processing audio:", error)
    }
  }

  const drawWaveform = (channelData: Float32Array) => {
    const canvas = waveformRef.current
    if (!canvas) {
      console.log("Canvas not found")
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.log("Canvas context not found")
      return
    }

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 400
    canvas.height = rect.height || 80

    const width = canvas.width
    const height = canvas.height

    console.log("Drawing waveform:", { width, height, dataLength: channelData.length })

    ctx.clearRect(0, 0, width, height)
    
    // Create gradient background with proper color values
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)") // blue-500 with opacity
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.05)") // blue-500 with lower opacity
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw waveform with proper color
    ctx.strokeStyle = "#3b82f6" // blue-500
    ctx.lineWidth = 1.5

    ctx.beginPath()
    
    // Use fewer points for better performance and visibility
    const numPoints = Math.min(500, channelData.length)
    const step = Math.floor(channelData.length / numPoints)
    const sliceWidth = width / numPoints
    
    let x = 0
    let hasDrawn = false

    for (let i = 0; i < channelData.length && x < width; i += step) {
      const v = channelData[i] * 0.6 // Reduce amplitude for better visibility
      const y = ((v + 1) * height) / 2

      if (!hasDrawn) {
        ctx.moveTo(x, y)
        hasDrawn = true
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.stroke()
    console.log("Waveform drawn")
  }

  const togglePlayback = () => {
    if (!audioContext || !audioBuffer) return

    if (isPlaying) {
      // Stop playback
      if (audioSourceRef.current) {
        audioSourceRef.current.stop()
        audioSourceRef.current = null
      }
      setIsPlaying(false)
    } else {
      // Start playback
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      source.start(0, currentTime)
      source.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
      
      audioSourceRef.current = source
      setIsPlaying(true)
      
      // Update current time
      const startTime = audioContext.currentTime - currentTime
      const updateTime = () => {
        if (isPlaying) {
          const newTime = audioContext.currentTime - startTime
          if (newTime < duration) {
            setCurrentTime(newTime)
            requestAnimationFrame(updateTime)
          } else {
            setIsPlaying(false)
            setCurrentTime(0)
          }
        }
      }
      requestAnimationFrame(updateTime)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop()
      }
      if (audioContext) {
        audioContext.close()
      }
    }
  }, [audioContext])

  // Redraw waveform when audioData changes
  useEffect(() => {
    if (audioData && waveformRef.current) {
      // Small delay to ensure canvas is rendered
      const timer = setTimeout(() => {
        drawWaveform(audioData)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [audioData])

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="audio-file">Audio File</Label>
        
        {/* Hidden file input */}
        <Input 
          ref={fileInputRef}
          id="audio-file" 
          type="file" 
          accept="audio/*,.m4a" 
          onChange={handleFileChange}
          className="hidden"
        />
        
        {/* Drag and drop zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
            isDragOver 
              ? "border-primary bg-primary/5 scale-105" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            file && "border-green-500 bg-green-50 dark:bg-green-950/20"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center gap-2">
            {file ? (
              <>
                <FileAudio className="h-8 w-8 text-green-600" />
                <div className="text-sm">
                  <p className="font-medium text-green-700 dark:text-green-300">{file.name}</p>
                  <p className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <p className="text-xs text-muted-foreground">Click to change file or drag & drop new file here</p>
              </>
            ) : (
              <>
                <Upload className={cn("h-8 w-8", isDragOver ? "text-primary" : "text-muted-foreground")} />
                <div className="text-sm">
                  <p className="font-medium">
                    {isDragOver ? "Drop your audio file here" : "Drag & drop audio file here"}
                  </p>
                  <p className="text-muted-foreground">or click to browse</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mini Waveform Preview */}
      {audioData && (
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{file?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayback}
                className="h-8 w-8 p-0"
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <canvas
              ref={waveformRef}
              width={400}
              height={80}
              className="w-full h-20 border rounded bg-background cursor-pointer"
              style={{ minHeight: '80px' }}
            />
            
            {/* Playhead indicator */}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
                style={{
                  left: `${(currentTime / duration) * 100}%`,
                }}
              />
            )}
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            <p>Duration: {formatTime(duration)} • Sample Rate: {audioBuffer?.sampleRate || 0} Hz</p>
          </div>
        </div>
      )}

      <AudioAnalyzer audioFile={file} />

      <div className="text-xs text-muted-foreground">
        <p>Supported formats: MP3, WAV, OGG, FLAC, M4A</p>
        <p>Maximum file size: 10MB</p>
        <p>
          <strong>Note:</strong> This uses basic pitch detection powered by Gemini 2.5 Pro. Results may vary based on audio quality and
          complexity.
        </p>
      </div>
    </div>
  )
}
