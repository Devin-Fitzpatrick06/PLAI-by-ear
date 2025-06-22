import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Enhanced API key debugging
    const apiKey = process.env.GOOGLE_AI_API_KEY

    console.log("=== API Key Debug Info ===")
    console.log(
      "Environment variables available:",
      Object.keys(process.env).filter((key) => key.includes("GOOGLE")),
    )
    console.log("GOOGLE_AI_API_KEY exists:", !!apiKey)
    console.log("GOOGLE_AI_API_KEY length:", apiKey ? apiKey.length : 0)
    console.log("GOOGLE_AI_API_KEY starts with:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined")

    if (!apiKey) {
      console.error("❌ Google AI API key not found in environment variables")
      return NextResponse.json(
        {
          error: "Google AI API key not configured",
          details:
            "The GOOGLE_AI_API_KEY environment variable is not set. Please add it to your .env.local file and restart your development server.",
          debugInfo: {
            availableEnvVars: Object.keys(process.env).filter((key) => key.includes("GOOGLE")),
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV,
          },
          instructions: [
            "1. Create a .env.local file in your project root",
            "2. Add: GOOGLE_AI_API_KEY=your_actual_api_key_here",
            "3. Restart your development server completely",
            "4. Get your API key from: https://aistudio.google.com/app/apikey",
          ],
        },
        { status: 500 },
      )
    }

    console.log(`Processing ${audioFile.name} (${audioFile.type}, ${audioFile.size} bytes)`)

    const genAI = new GoogleGenerativeAI(apiKey)

    // Try multiple model variants starting with Gemini 2.5 Pro Preview
    let model
    let modelUsed = ""

    try {
      // First try Gemini 2.5 Pro Preview (latest and most advanced)
      model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" })
      modelUsed = "gemini-2.5-pro-preview-06-05"
      console.log("Using Gemini 2.5 Pro Preview model")
    } catch (error) {
      try {
        // Fallback to Gemini 1.5 Pro (stable and widely available)
        model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
        modelUsed = "gemini-1.5-pro"
        console.log("Falling back to Gemini 1.5 Pro model")
      } catch (error2) {
        try {
          // Fallback to Gemini 1.5 Flash
          model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
          modelUsed = "gemini-1.5-flash"
          console.log("Falling back to Gemini 1.5 Flash model")
        } catch (error3) {
          throw new Error("Unable to initialize any Gemini model. Please check your API key and model availability.")
        }
      }
    }

    // Convert file to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")
    const mimeType = audioFile.type || "audio/mpeg"

    // Enhanced prompt optimized for Gemini 2.5 Pro capabilities
    const prompt = `You are a professional music transcription AI using Gemini 2.5 Pro's advanced audio analysis capabilities. Analyze this audio file and extract musical notes for sheet music transcription with the highest possible accuracy. Assume you have perfect pitch and are able to hear the notes.

CRITICAL: Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "title": "Audio Analysis",
  "timeSignature": "4/4",
  "keySignature": "C",
  "tempo": 120,
  "duration": 30,
  "notes": [
    {"pitch": "C4", "duration": "q", "time": 0.0, "confidence": 0.95, "velocity": 80},
    {"pitch": "E4", "duration": "q", "time": 0.5, "confidence": 0.92, "velocity": 75}
  ],
  "analysis": {
    "instrument": "piano",
    "complexity": "moderate",
    "quality": "excellent",
    "keyDetected": "C major",
    "tempoDetected": 120,
    "timeSignatureDetected": "4/4",
    "musicalStyle": "classical",
    "dynamicRange": "moderate",
    "recommendations": "Clear polyphonic texture with well-defined melody line"
  }
}

ADVANCED ANALYSIS GUIDELINES FOR GEMINI 2.5 PRO:

1. **Pitch Detection (Use Gemini 2.5 Pro's enhanced audio understanding)**:
   - Standard notation: C3, C#3, D3, D#3, E3, F3, F#3, G3, G#3, A3, A#3, B3, C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, F5, G5, A5, B5, C6
   - Focus on the most prominent and clear pitches
   - Detect microtonal variations and pitch bends
   - Identify overtones and harmonics for richer analysis

2. **Duration Analysis (Leverage advanced temporal understanding)**:
   - "w" (whole), "h" (half), "q" (quarter), "e" (eighth), "s" (sixteenth)
   - Estimate durations based on note spacing and tempo
   - Detect triplets, dotted notes, and complex rhythmic patterns
   - Analyze swing timing and rubato

3. **Musical Intelligence (Use Gemini 2.5 Pro's deep musical knowledge)**:
   - Identify the primary instrument being played
   - Detect the musical key and time signature
   - Estimate tempo from note timing patterns
   - Assess the complexity and quality of the recording
   - Identify chord progressions and harmonic relationships
   - Detect musical phrases and structural elements
   - Recognize musical styles and genres

4. **Quality Standards for Gemini 2.5 Pro**:
   - **Confidence Scoring**: 0.0 to 1.0 (include notes with confidence > 0.7)
   - **Velocity Analysis**: MIDI velocity 1-127 based on amplitude and attack
   - **Musical Logic**: Ensure notes make musical sense
   - **Limit**: Maximum 150 most musically significant notes
   - **Accuracy**: Prioritize precision over quantity
   - **Harmonic Content**: Understand the role of each note in the musical structure

5. **Advanced Features**:
   - Identify specific instruments and playing techniques
   - Detect musical genres and stylistic elements
   - Recognize performance characteristics (legato, staccato, etc.)
   - Analyze dynamic changes and expression
   - Detect key changes and modulations
   - Identify rhythmic patterns and metric structures

MUSICAL ANALYSIS PRIORITIES:
- Focus on melodically and harmonically important notes
- Maintain musical coherence and theoretical accuracy
- Detect key changes and modulations
- Identify rhythmic patterns and metric structures
- Recognize musical phrases and formal structures
- Use advanced AI capabilities for professional-grade transcription

Analyze the audio carefully and return only the JSON response with your best musical transcription using Gemini 2.5 Pro's advanced capabilities.`

    console.log(`Sending request to ${modelUsed} for musical analysis...`)
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType,
        },
      },
    ])

    const response = await result.response
    const text = response.text()
    console.log(`✅ Successfully received response from ${modelUsed}`)
    console.log("Response length:", text.length)
    console.log("Response preview:", text.substring(0, 300) + "...")

    // Try to extract JSON from the response
    let analysisData
    try {
      // Clean the response text
      let cleanText = text.trim()

      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "")
      cleanText = cleanText.replace(/```\s*/g, "")

      // Find JSON object - try multiple patterns
      let jsonMatch = cleanText.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        // Try to find JSON between other text
        jsonMatch = cleanText.match(/.*?(\{[\s\S]*\}).*?/)
        if (jsonMatch) {
          cleanText = jsonMatch[1]
        }
      }

      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0] || cleanText)
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text)
      console.error("Parse error:", parseError)

      // Fallback: create a basic response structure
      analysisData = {
        title: "Analysis Failed - Parse Error",
        timeSignature: "4/4",
        keySignature: "C",
        tempo: 120,
        duration: 30,
        notes: [],
        analysis: {
          instrument: "unknown",
          complexity: "unknown",
          quality: "parsing_failed",
          keyDetected: "unknown",
          tempoDetected: 120,
          timeSignatureDetected: "4/4",
          musicalStyle: "unknown",
          dynamicRange: "unknown",
          recommendations: `Could not parse AI response. Raw response: ${text.substring(0, 200)}...`,
        },
      }
    }

    // Validate and clean the response with enhanced processing
    const cleanedData = {
      title: analysisData.title || "Audio Analysis",
      timeSignature: analysisData.timeSignature || "4/4",
      keySignature: analysisData.keySignature || "C",
      tempo: Number(analysisData.tempo) || 120,
      duration: Number(analysisData.duration) || 30,
      notes: Array.isArray(analysisData.notes) ? analysisData.notes : [],
      analysis: {
        instrument: analysisData.analysis?.instrument || "unknown",
        complexity: analysisData.analysis?.complexity || "moderate",
        quality: analysisData.analysis?.quality || "unknown",
        keyDetected: analysisData.analysis?.keyDetected || "unknown",
        tempoDetected: Number(analysisData.analysis?.tempoDetected) || 120,
        timeSignatureDetected: analysisData.analysis?.timeSignatureDetected || "4/4",
        musicalStyle: analysisData.analysis?.musicalStyle || "unknown",
        dynamicRange: analysisData.analysis?.dynamicRange || "unknown",
        recommendations: analysisData.analysis?.recommendations || "No specific recommendations",
      },
    }

    // Enhanced note validation and filtering for Gemini 2.5 Pro
    cleanedData.notes = cleanedData.notes
      .filter((note: any) => {
        // Only include notes with valid pitch and high confidence
        return note.pitch && note.time !== undefined && (note.confidence === undefined || note.confidence >= 0.7)
      })
      .map((note: any) => ({
        pitch: String(note.pitch).toUpperCase(),
        duration: note.duration || "q",
        time: Number(note.time) || 0,
        confidence: Number(note.confidence) || 0.8,
        velocity: Number(note.velocity) || 80,
      }))
      .sort((a: any, b: any) => a.time - b.time) // Sort by time
      .slice(0, 150) // Limit for performance

    console.log(`Gemini analysis complete: ${cleanedData.notes.length} high-confidence notes detected`)

    return NextResponse.json({
      ...cleanedData,
      modelUsed: modelUsed,
      processingInfo: {
        originalNotesCount: Array.isArray(analysisData.notes) ? analysisData.notes.length : 0,
        filteredNotesCount: cleanedData.notes.length,
        confidenceThreshold: 0.7,
        analysisMethod: "google_gemini_2.5_pro",
        enhancedFeatures: ["harmonic_analysis", "musical_intelligence", "advanced_timing"],
        modelFallback: modelUsed !== "gemini-2.5-pro-preview-06-05",
      },
    })
  } catch (error) {
    console.error("Error analyzing audio with Gemini:", error)

    // Enhanced error handling
    if (error instanceof Error) {
      // Handle specific error patterns
      if (error.message.includes("quota")) {
        return NextResponse.json(
          {
            error: "API quota exceeded",
            details: "You've reached your Google AI API usage limit. Please wait for quota reset or upgrade your plan.",
            errorType: "quota_exceeded",
            suggestions: [
              "Wait for your quota to reset (usually daily)",
              "Check usage at https://aistudio.google.com/app/apikey",
              "Consider upgrading to a paid plan",
              "Try again tomorrow",
            ],
          },
          { status: 429 },
        )
      }

      if (error.message.includes("pattern") || error.message.includes("model")) {
        return NextResponse.json(
          {
            error: "Model not available",
            details: "The requested Gemini model may not be available in your region or with your API key.",
            errorType: "model_unavailable",
            suggestions: [
              "Check if you have access to Gemini 2.5 Pro models",
              "Verify your API key has the necessary permissions",
              "Try again later as the model may be temporarily unavailable",
              "Check Google AI Studio for model availability",
            ],
          },
          { status: 400 },
        )
      }

      if (error.message.includes("API_KEY") || error.message.includes("key")) {
        return NextResponse.json(
          {
            error: "Invalid Google AI API key",
            details: "Please check your GOOGLE_AI_API_KEY environment variable",
            errorType: "invalid_key",
          },
          { status: 401 },
        )
      }

      if (error.message.includes("network")) {
        return NextResponse.json(
          {
            error: "Network error",
            details: "Unable to connect to Google AI services",
            errorType: "network_error",
          },
          { status: 503 },
        )
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to analyze audio",
        details: error instanceof Error ? error.message : "Unknown error occurred",
        errorType: "general_error",
      },
      { status: 500 },
    )
  }
}
