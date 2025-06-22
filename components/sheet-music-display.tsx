"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useSheetMusicStore } from "@/lib/store"

// VexFlow types
declare global {
  interface Window {
    Vex: any
    audioContext: AudioContext | null
    webkitAudioContext: typeof AudioContext
  }
}

export function SheetMusicDisplay() {
  const { sheetMusic, isLoading, clearSheetMusic } = useSheetMusicStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const [vexFlowLoaded, setVexFlowLoaded] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const vexflowContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load VexFlow library
  useEffect(() => {
    const loadVexFlow = async () => {
      if (typeof window !== "undefined" && !window.Vex) {
        try {
          // Load VexFlow from CDN
          const script = document.createElement("script")
          script.src = "https://unpkg.com/vexflow@4.2.2/build/cjs/vexflow.js"
          script.onload = () => {
            setVexFlowLoaded(true)
          }
          script.onerror = () => {
            console.error("Failed to load VexFlow")
            toast({
              title: "VexFlow loading failed",
              description: "Sheet music rendering may not work properly",
              variant: "destructive",
            })
          }
          document.head.appendChild(script)
        } catch (error) {
          console.error("Error loading VexFlow:", error)
        }
      } else if (window.Vex) {
        setVexFlowLoaded(true)
      }
    }

    loadVexFlow()
  }, [toast])

  useEffect(() => {
    if (sheetMusic && vexflowContainerRef.current && vexFlowLoaded) {
      renderSheetMusic(vexflowContainerRef.current, sheetMusic)
    }
  }, [sheetMusic, vexFlowLoaded, currentPage])

  const renderSheetMusic = (container: HTMLDivElement, musicData: any) => {
    // Clear previous content
    container.innerHTML = ""

    if (!musicData || !musicData.notes || musicData.notes.length === 0) {
      container.innerHTML =
        "<div class='text-center py-10 text-muted-foreground'>No sheet music to display. Upload an audio file to get started.</div>"
      return
    }

    if (!vexFlowLoaded || !window.Vex) {
      container.innerHTML = `
        <div class="p-4 bg-muted rounded-md">
          <h3 class="text-lg font-semibold mb-2">${musicData.title}</h3>
          <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><strong>Time Signature:</strong> ${musicData.timeSignature}</div>
            <div><strong>Key:</strong> ${musicData.keySignature}</div>
            <div><strong>Tempo:</strong> ${musicData.tempo} BPM</div>
            <div><strong>Notes:</strong> ${musicData.notes.length}</div>
          </div>
          <div class="p-4 bg-background rounded border">
            <p class="text-center mb-2">Loading VexFlow for sheet music rendering...</p>
          </div>
        </div>
      `
      return
    }

    try {
      // Create VexFlow renderer
      const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = window.Vex.Flow

      // Add title and info
      const infoDiv = document.createElement("div")
      infoDiv.className = "p-4 bg-muted rounded-md mb-4"

      // Calculate pagination info
      const notesPerPage = 32 // 8 measures × 4 notes per measure
      const totalPages = Math.ceil(musicData.notes.length / notesPerPage)
      const startNote = currentPage * notesPerPage
      const endNote = Math.min(startNote + notesPerPage, musicData.notes.length)

      infoDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">${musicData.title}</h3>
        <div class="grid grid-cols-3 gap-4 mb-2 text-sm">
          <div><strong>Time Signature:</strong> ${musicData.timeSignature}</div>
          <div><strong>Key:</strong> ${musicData.keySignature}</div>
          <div><strong>Tempo:</strong> ${musicData.tempo} BPM</div>
          <div><strong>Total Notes:</strong> ${musicData.notes.length}</div>
          <div><strong>Page:</strong> ${currentPage + 1} of ${totalPages}</div>
          <div><strong>Showing:</strong> Notes ${startNote + 1}-${endNote}</div>
        </div>
      `
      container.appendChild(infoDiv)

      // Create SVG renderer
      const div = document.createElement("div")
      div.className = "vexflow-container bg-gray-50 p-4 rounded-md border"
      container.appendChild(div)

      // Get notes for current page
      const pageNotes = musicData.notes.slice(startNote, endNote)

      // Calculate how many measures we need (8 measures per page, 2 rows of 4)
      const notesPerMeasure = 4 // 4 quarter notes per measure in 4/4 time
      const measuresPerRow = 4
      const rowsPerPage = 2
      const measuresPerPage = measuresPerRow * rowsPerPage

      const renderer = new Renderer(div, Renderer.Backends.SVG)
      const staveWidth = 180
      const staveHeight = 120
      const totalWidth = measuresPerRow * staveWidth + 50
      const totalHeight = rowsPerPage * staveHeight + 100

      renderer.resize(totalWidth, totalHeight)
      const context = renderer.getContext()

      // Add light background for better visibility
      const svg = div.querySelector("svg")
      if (svg) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        rect.setAttribute("width", totalWidth.toString())
        rect.setAttribute("height", totalHeight.toString())
        rect.setAttribute("fill", "#f8f9fa") // Light gray background
        rect.setAttribute("stroke", "none")
        svg.insertBefore(rect, svg.firstChild)
      }

      // Convert detected notes to VexFlow format and group by measures
      const noteGroups = groupNotesIntoMeasures(pageNotes, notesPerMeasure, measuresPerPage)

      // Render each measure
      for (let i = 0; i < noteGroups.length; i++) {
        const row = Math.floor(i / measuresPerRow)
        const col = i % measuresPerRow
        const x = 10 + col * staveWidth
        const y = 40 + row * staveHeight

        const stave = new Stave(x, y, staveWidth - 10)

        // Add clef and time signature only to first measure of each row
        if (col === 0) {
          stave.addClef("treble").addTimeSignature("4/4")
        }

        stave.setContext(context).draw()

        const vexNotes = convertToVexFlowNotes(noteGroups[i])

        if (vexNotes.length > 0) {
          // Create a voice in 4/4 and add the notes
          const voice = new Voice({ num_beats: 4, beat_value: 4 })
          voice.addTickables(vexNotes)

          // Format and justify the notes to fit the stave
          new Formatter().joinVoices([voice]).format([voice], staveWidth - 20)

          // Render voice
          voice.draw(context, stave)
        }
      }

      if (pageNotes.length === 0) {
        // No valid notes to display
        const textDiv = document.createElement("div")
        textDiv.className = "text-center py-4 text-muted-foreground"
        textDiv.textContent = "No notes on this page."
        div.appendChild(textDiv)
      }
    } catch (error) {
      console.error("Error rendering sheet music:", error)
      container.innerHTML = `
        <div class="p-4 bg-destructive/10 rounded-md">
          <p class="text-destructive">Error rendering sheet music: ${error instanceof Error ? error.message : "Unknown error"}</p>
          <div class="mt-2 text-sm max-h-32 overflow-y-auto">
            <strong>Sample Notes (showing first 20):</strong>
            <div class="mt-2 space-y-1">
              ${musicData.notes
                .slice(0, 20)
                .map((note: any) => `<div>${note.pitch} (${note.duration}) at ${note.time.toFixed(1)}s</div>`)
                .join("")}
              ${musicData.notes.length > 20 ? `<div>... and ${musicData.notes.length - 20} more notes</div>` : ""}
            </div>
          </div>
        </div>
      `
    }
  }

  const groupNotesIntoMeasures = (detectedNotes: any[], notesPerMeasure: number, maxMeasures: number) => {
    const groups = []

    // Group notes into measures
    for (let i = 0; i < detectedNotes.length && groups.length < maxMeasures; i += notesPerMeasure) {
      const measureNotes = detectedNotes.slice(i, i + notesPerMeasure)
      groups.push(measureNotes)
    }

    return groups
  }

  const convertToVexFlowNotes = (detectedNotes: any[]) => {
    if (!window.Vex || !detectedNotes.length) return []

    const { StaveNote, Accidental } = window.Vex.Flow
    const vexNotes = []

    // Map pitch names to VexFlow format
    const pitchMap: { [key: string]: string } = {
      C3: "c/3",
      "C#3": "c#/3",
      D3: "d/3",
      "D#3": "d#/3",
      E3: "e/3",
      F3: "f/3",
      "F#3": "f#/3",
      G3: "g/3",
      "G#3": "g#/3",
      A3: "a/3",
      "A#3": "a#/3",
      B3: "b/3",
      C4: "c/4",
      "C#4": "c#/4",
      D4: "d/4",
      "D#4": "d#/4",
      E4: "e/4",
      F4: "f/4",
      "F#4": "f#/4",
      G4: "g/4",
      "G#4": "g#/4",
      A4: "a/4",
      "A#4": "a#/4",
      B4: "b/4",
      C5: "c/5",
      "C#5": "c#/5",
      D5: "d/5",
      "D#5": "d#/5",
      E5: "e/5",
      F5: "f/5",
      "F#5": "f#/5",
      G5: "g/5",
      "G#5": "g#/5",
      A5: "a/5",
      "A#5": "a#/5",
      B5: "b/5",
    }

    try {
      // Convert each note, ensuring we don't exceed 4 quarter notes per measure
      let totalTicks = 0
      const maxTicks = 4 * window.Vex.Flow.RESOLUTION // 4 quarter notes worth of ticks

      for (const note of detectedNotes) {
        if (totalTicks >= maxTicks) break // Stop if we've filled the measure

        const vexPitch = pitchMap[note.pitch]

        if (vexPitch) {
          // Always use quarter notes to keep it simple and avoid tick calculation issues
          const staveNote = new StaveNote({
            keys: [vexPitch],
            duration: "q", // Always quarter note
          })

          // Add accidentals for sharp notes
          if (note.pitch.includes("#")) {
            staveNote.addModifier(new Accidental("#"), 0)
          }

          vexNotes.push(staveNote)
          totalTicks += window.Vex.Flow.RESOLUTION // Add ticks for quarter note
        }
      }

      // Fill remaining space with quarter rests if needed
      while (totalTicks < maxTicks && vexNotes.length < 4) {
        vexNotes.push(new StaveNote({ keys: ["b/4"], duration: "qr" }))
        totalTicks += window.Vex.Flow.RESOLUTION
      }

      // Ensure we have exactly 4 quarter notes worth of content
      if (vexNotes.length === 0) {
        // Add 4 quarter rests if no valid notes
        for (let i = 0; i < 4; i++) {
          vexNotes.push(new StaveNote({ keys: ["b/4"], duration: "qr" }))
        }
      } else if (vexNotes.length > 4) {
        // Trim to exactly 4 notes
        vexNotes.splice(4)
      } else if (vexNotes.length < 4) {
        // Fill with rests
        while (vexNotes.length < 4) {
          vexNotes.push(new StaveNote({ keys: ["b/4"], duration: "qr" }))
        }
      }
    } catch (error) {
      console.error("Error converting notes to VexFlow format:", error)
      // Return 4 quarter rests as fallback
      return [
        new StaveNote({ keys: ["b/4"], duration: "qr" }),
        new StaveNote({ keys: ["b/4"], duration: "qr" }),
        new StaveNote({ keys: ["b/4"], duration: "qr" }),
        new StaveNote({ keys: ["b/4"], duration: "qr" }),
      ]
    }

    return vexNotes
  }

  // Add a simple HTML5 Audio test function
  const testHTML5Audio = () => {
    console.log("=== HTML5 AUDIO TEST START ===")
    
    try {
      // Create a simple audio context to generate a tone
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime) // A4
      oscillator.type = "sine"
      gain.gain.setValueAtTime(0.5, audioContext.currentTime)
      
      // Generate 2 seconds of audio
      const sampleRate = audioContext.sampleRate
      const length = sampleRate * 2 // 2 seconds
      const buffer = audioContext.createBuffer(1, length, sampleRate)
      const channelData = buffer.getChannelData(0)
      
      // Fill with sine wave
      for (let i = 0; i < length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }
      
      // Convert to WAV format
      const wavBuffer = audioBufferToWav(buffer)
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      // Create HTML5 audio element
      const audio = new Audio(url)
      audio.volume = 0.5
      
      console.log("🎵 Playing HTML5 Audio test...")
      audio.play().then(() => {
        console.log("✅ HTML5 Audio started successfully")
        toast({
          title: "HTML5 Audio Test",
          description: "Playing 2-second A4 tone via HTML5 Audio",
        })
      }).catch((error) => {
        console.error("❌ HTML5 Audio failed:", error)
        toast({
          title: "HTML5 Audio Failed",
          description: error.message,
          variant: "destructive",
        })
      })
      
      // Clean up
      audio.onended = () => {
        URL.revokeObjectURL(url)
        console.log("✅ HTML5 Audio test completed")
      }
      
    } catch (error) {
      console.error("❌ HTML5 Audio test failed:", error)
      toast({
        title: "HTML5 Audio Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  // Helper function to convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    // Write audio data
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return arrayBuffer
  }

  const handlePlayback = async () => {
    if (!sheetMusic) {
      console.log("No sheet music data available")
      return
    }

    console.log("Sheet music data:", sheetMusic)
    console.log("Total notes:", sheetMusic.notes?.length || 0)

    if (isPlaying) {
      // Stop playback
      setIsPlaying(false)
      return
    }

    try {
      setIsPlaying(true)

      // Get current page notes
      const notesPerPage = 32
      const startNote = currentPage * notesPerPage
      const endNote = Math.min(startNote + notesPerPage, sheetMusic.notes.length)
      const notesToPlay = sheetMusic.notes.slice(startNote, endNote)

      console.log("Current page:", currentPage)
      console.log("Start note:", startNote)
      console.log("End note:", endNote)
      console.log("Notes to play:", notesToPlay)

      if (notesToPlay.length === 0) {
        toast({
          title: "No notes to play",
          description: "This page doesn't contain any notes to play",
          variant: "destructive",
        })
        setIsPlaying(false)
        return
      }

      // Create audio context for generating the audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // Resume audio context if needed
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      // Note frequencies (in Hz) - including both sharp and flat notations
      const noteFrequencies: { [key: string]: number } = {
        // Natural notes
        C4: 261.63,
        D4: 293.66,
        E4: 329.63,
        F4: 349.23,
        G4: 392.0,
        A4: 440.0,
        B4: 493.88,
        C5: 523.25,
        D5: 587.33,
        E5: 659.25,
        F5: 698.46,
        G5: 783.99,
        A5: 880.0,
        B5: 987.77,
        C3: 130.81,
        D3: 146.83,
        E3: 164.81,
        F3: 174.61,
        G3: 196.0,
        A3: 220.0,
        B3: 246.94,
        
        // Sharp notes
        "C#3": 138.59,
        "D#3": 155.56,
        "F#3": 185.0,
        "G#3": 207.65,
        "A#3": 233.08,
        "C#4": 277.18,
        "D#4": 311.13,
        "F#4": 369.99,
        "G#4": 415.3,
        "A#4": 466.16,
        "C#5": 554.37,
        "D#5": 622.25,
        "F#5": 739.99,
        "G#5": 830.61,
        "A#5": 932.33,
        
        // Flat notes (alternative notation)
        "DB3": 138.59, // C#3
        "EB3": 155.56, // D#3
        "GB3": 185.0,  // F#3
        "AB3": 207.65, // G#3
        "BB3": 233.08, // A#3
        "DB4": 277.18, // C#4
        "EB4": 311.13, // D#4
        "GB4": 369.99, // F#4
        "AB4": 415.3,  // G#4
        "BB4": 466.16, // A#4
        "DB5": 554.37, // C#5
        "EB5": 622.25, // D#5
        "GB5": 739.99, // F#5
        "AB5": 830.61, // G#5
        "BB5": 932.33, // A#5
      }

      // Duration mapping for different note types
      const durationMap: { [key: string]: number } = {
        "w": 1.6,    // whole note
        "h": 0.8,    // half note
        "q": 0.4,    // quarter note
        "e": 0.2,    // eighth note
        "s": 0.1,    // sixteenth note
      }

      // Get tempo from sheet music data
      const tempo = sheetMusic.tempo || 120
      const tempoMultiplier = 120 / tempo // Adjust duration based on tempo

      console.log("Playing notes from JSON data:", notesToPlay)
      console.log("Tempo:", tempo, "BPM")

      // Calculate total duration needed
      let maxEndTime = 0
      for (let i = 0; i < notesToPlay.length; i++) {
        const note = notesToPlay[i] as any
        const startTime = note.time || i * 0.4
        const noteDuration = note.duration ? (durationMap[note.duration] || 0.4) * tempoMultiplier : 0.4
        maxEndTime = Math.max(maxEndTime, startTime + noteDuration)
      }

      // Create audio buffer for the entire piece
      const sampleRate = audioContext.sampleRate
      const totalSamples = Math.ceil(maxEndTime * sampleRate)
      const buffer = audioContext.createBuffer(1, totalSamples, sampleRate)
      const channelData = buffer.getChannelData(0)

      // Generate audio for each note
      for (let i = 0; i < notesToPlay.length; i++) {
        const note = notesToPlay[i] as any
        console.log(`Note ${i}:`, note)
        
        // Get frequency from note pitch
        const frequency = noteFrequencies[note.pitch] || 440
        console.log(`Note ${i} pitch: ${note.pitch}, frequency: ${frequency}`)
        
        // Calculate timing and duration from JSON data
        const startTime = note.time || i * 0.4
        const noteDuration = note.duration ? (durationMap[note.duration] || 0.4) * tempoMultiplier : 0.4
        const velocity = note.velocity ? note.velocity / 127 : 0.8 // Convert MIDI velocity (0-127) to gain (0-1)
        
        console.log(`Note ${i} timing: start=${startTime}, duration=${noteDuration}, velocity=${velocity}`)
        
        // Generate sine wave for this note
        const startSample = Math.floor(startTime * sampleRate)
        const endSample = Math.floor((startTime + noteDuration) * sampleRate)
        
        for (let j = startSample; j < endSample && j < totalSamples; j++) {
          const timeInNote = (j - startSample) / sampleRate
          const amplitude = velocity * Math.exp(-timeInNote * 2) // Simple decay envelope
          channelData[j] += Math.sin(2 * Math.PI * frequency * timeInNote) * amplitude * 0.3
        }
      }

      // Convert to WAV format
      const wavBuffer = audioBufferToWav(buffer)
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      // Create HTML5 audio element
      const audio = new Audio(url)
      audio.volume = 0.7
      
      console.log("🎵 Playing sheet music via HTML5 Audio...")
      audio.play().then(() => {
        console.log("✅ Sheet music playback started successfully")
        toast({
          title: "Playing sheet music from JSON",
          description: `Playing ${notesToPlay.length} notes from page ${currentPage + 1} at ${tempo} BPM`,
        })
      }).catch((error) => {
        console.error("❌ Sheet music playback failed:", error)
        setIsPlaying(false)
        toast({
          title: "Playback Failed",
          description: error.message,
          variant: "destructive",
        })
      })
      
      // Handle playback end
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsPlaying(false)
        console.log("✅ Sheet music playback completed")
      }

      // Handle playback errors
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setIsPlaying(false)
        console.error("❌ Audio playback error")
        toast({
          title: "Playback Error",
          description: "An error occurred during playback",
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error("Error playing audio:", error)
      setIsPlaying(false)
      toast({
        title: "Playback error",
        description: error instanceof Error ? error.message : "There was an error playing the sheet music",
        variant: "destructive",
      })
    }
  }

  const handleDownload = () => {
    if (!sheetMusic) {
      return
    }

    // Download the SVG
    const svgElement = vexflowContainerRef.current?.querySelector("svg")
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      const downloadLink = document.createElement("a")
      downloadLink.href = svgUrl
      downloadLink.download = `${sheetMusic.title}-page-${currentPage + 1}-sheet-music.svg`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(svgUrl)
    } else {
      // Fallback to JSON download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sheetMusic, null, 2))
      const downloadAnchorNode = document.createElement("a")
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", `${sheetMusic.title}-all-notes.json`)
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    }
  }

  const handleReset = () => {
    clearSheetMusic()
    setIsPlaying(false)
    setCurrentPage(0)

    if (vexflowContainerRef.current) {
      vexflowContainerRef.current.innerHTML =
        "<div class='text-center py-10 text-muted-foreground'>No sheet music to display. Upload an audio file to get started.</div>"
    }
  }

  // Calculate pagination info
  const notesPerPage = 32
  const totalPages = sheetMusic ? Math.ceil(sheetMusic.notes.length / notesPerPage) : 0

  return (
    <div className="space-y-4">
      <div ref={vexflowContainerRef} className="min-h-[400px] border rounded-md p-4 bg-background overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-muted-foreground">Processing your audio...</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No sheet music to display. Upload an audio file to get started.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {sheetMusic && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handlePlayback} disabled={!sheetMusic || isLoading} className="flex-1">
          {isPlaying ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Stop Playback
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Play Current Page
            </>
          )}
        </Button>

        <Button variant="outline" onClick={testHTML5Audio} className="flex-1">
          <Play className="mr-2 h-4 w-4" />
          Test HTML5 Audio
        </Button>

        <Button variant="outline" onClick={handleDownload} disabled={!sheetMusic || isLoading} className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Download Page
        </Button>

        <Button variant="outline" onClick={handleReset} disabled={!sheetMusic || isLoading} className="flex-1">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  )
}
