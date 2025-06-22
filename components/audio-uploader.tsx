"use client"

import type React from "react"

import { useState } from "react"
import { Music } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AudioAnalyzer } from "@/components/audio-analyzer"

export default function AudioUploader() {
  const [file, setFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check if the file is an audio file
      if (!selectedFile.type.startsWith("audio/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an audio file (MP3, WAV, etc.)",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
      toast({
        title: "File selected",
        description: `Selected ${selectedFile.name}. Click "Analyze Audio File" to process it.`,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="audio-file">Audio File</Label>
        <Input id="audio-file" type="file" accept="audio/*,.m4a" onChange={handleFileChange} />
      </div>

      {file && (
        <div className="flex items-center gap-2 text-sm">
          <Music className="h-4 w-4" />
          <span className="font-medium">{file.name}</span>
          <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
        </div>
      )}

      <AudioAnalyzer audioFile={file} />

      <div className="text-xs text-muted-foreground">
        <p>Supported formats: MP3, WAV, OGG, FLAC, M4A</p>
        <p>Maximum file size: 10MB</p>
        <p>
          <strong>Note:</strong> This uses basic pitch detection. Results may vary based on audio quality and
          complexity.
        </p>
      </div>
    </div>
  )
}
