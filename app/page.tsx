import type { Metadata } from "next"
import AudioUploader from "@/components/audio-uploader"
import { SheetMusicDisplay } from "@/components/sheet-music-display"
import { ThemeToggle } from "@/components/theme-toggle"

export const metadata: Metadata = {
  title: "PlAI by Ear: An Audio to Sheet Music Converter",
  description: "Convert audio files to piano sheet music",
}

export default function Home() {
  return (
    <div className="container mx-auto py-10 space-y-10">
      <div className="flex justify-between items-start">
        <div className="text-center space-y-4 flex-1">
          <h1 className="text-4xl font-bold tracking-tight">PlAI by Ear: An Audio to Sheet Music Converter</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload an audio file of music and we'll convert it to piano sheet music that you can read, play, and download.
          </p>
        </div>
        <div className="ml-4">
          <ThemeToggle />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Audio</h2>
            <AudioUploader />
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Sheet Music</h2>
          <SheetMusicDisplay />
        </div>
      </div>
    </div>
  )
}
