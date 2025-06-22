import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== Gemini API Test ===")

    // Check environment variables
    const apiKey = process.env.GOOGLE_AI_API_KEY
    const allEnvVars = Object.keys(process.env).filter((key) => key.includes("GOOGLE"))

    console.log("Available Google env vars:", allEnvVars)
    console.log("API key exists:", !!apiKey)
    console.log("API key length:", apiKey ? apiKey.length : 0)
    console.log("Node environment:", process.env.NODE_ENV)

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_AI_API_KEY not found",
        debug: {
          availableGoogleEnvVars: allEnvVars,
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV || "not set",
        },
        instructions: [
          "1. Create .env.local file in project root",
          "2. Add: GOOGLE_AI_API_KEY=your_api_key",
          "3. Restart development server",
          "4. Try again",
        ],
      })
    }

    // Test multiple model variants starting with Gemini 2.5 Pro Preview
    const genAI = new GoogleGenerativeAI(apiKey)
    const modelsToTest = ["gemini-2.5-pro-preview-06-05", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-pro-latest"]

    let workingModel = null
    const testResults = []

    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })

        const result = await model.generateContent(
          'Respond with this exact JSON: {"status": "working", "message": "API key works!", "model": "' +
            modelName +
            '"}',
        )
        const response = await result.response
        const text = response.text()

        testResults.push({
          model: modelName,
          success: true,
          response: text,
        })

        if (!workingModel) {
          workingModel = modelName
        }

        console.log(`✅ ${modelName} test successful!`)
      } catch (error) {
        console.log(`❌ ${modelName} test failed:`, error instanceof Error ? error.message : "Unknown error")
        testResults.push({
          model: modelName,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    if (workingModel) {
      return NextResponse.json({
        success: true,
        message: `Google AI API key is working correctly!`,
        workingModel: workingModel,
        allResults: testResults,
        debug: {
          apiKeyLength: apiKey.length,
          responseLength: testResults.find((r) => r.success)?.response?.length || 0,
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "No Gemini models are working",
          allResults: testResults,
          debug: {
            apiKeyExists: !!apiKey,
            apiKeyLength: apiKey.length,
            nodeEnv: process.env.NODE_ENV,
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ API test failed:", error)

    let errorType = "unknown"
    let suggestions = []

    if (error instanceof Error) {
      if (error.message.includes("API_KEY") || error.message.includes("key")) {
        errorType = "invalid_key"
        suggestions = [
          "Check that your API key is correct",
          "Ensure there are no extra spaces or characters",
          "Verify the key is enabled at https://aistudio.google.com/app/apikey",
        ]
      } else if (error.message.includes("quota")) {
        errorType = "quota_exceeded"
        suggestions = [
          "You've exceeded your API quota",
          "Wait for quota reset or upgrade your plan",
          "Check usage at https://aistudio.google.com/app/apikey",
        ]
      } else if (error.message.includes("network")) {
        errorType = "network_error"
        suggestions = [
          "Check your internet connection",
          "Try again in a few moments",
          "Verify Google AI services are accessible",
        ]
      } else if (error.message.includes("pattern") || error.message.includes("model")) {
        errorType = "model_not_available"
        suggestions = [
          "Some Gemini models may not be available in your region",
          "Check if you have access to the latest models",
          "Try again later as models may be temporarily unavailable",
        ]
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorType,
        suggestions,
        debug: {
          apiKeyExists: !!process.env.GOOGLE_AI_API_KEY,
          apiKeyLength: process.env.GOOGLE_AI_API_KEY?.length || 0,
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 },
    )
  }
}
