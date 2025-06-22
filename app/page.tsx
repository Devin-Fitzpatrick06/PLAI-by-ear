import type { Metadata } from "next"
import Image from "next/image"
import AudioUploader from "@/components/audio-uploader"
import { SheetMusicDisplay } from "@/components/sheet-music-display"
import { ThemeToggle } from "@/components/theme-toggle"

export const metadata: Metadata = {
  title: "PLAI: An Audio to Sheet Music Converter",
  description: "Convert audio files to piano sheet music",
}

export default function Home() {
  return (
    <div className="container mx-auto py-4 space-y-6">
      <div className="relative">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Image
              src="/PlAI_logo.png"
              alt="PLAI Logo"
              width={200}
              height={80}
              className="h-auto dark:invert block"
              priority
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PLAI: An Audio to Sheet Music Converter</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
            Upload an audio file of music and we'll convert it to piano sheet music that you can read, play, and download.
          </p>
        </div>
        <div className="absolute top-0 right-0">
          <ThemeToggle />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6 upload-panel">
            <h2 className="text-xl font-semibold mb-4 glass-text">Upload Audio</h2>
            <AudioUploader />
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6 sheet-music-panel">
          <h2 className="text-xl font-semibold mb-4 glass-text">Sheet Music</h2>
          <SheetMusicDisplay />
        </div>
      </div>
    </div>
  )
}
