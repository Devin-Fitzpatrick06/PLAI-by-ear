# 🎵 PLAI‑by‑ear

**PLAI** (Piano-Led Audio to sheet music Interpreter) is a TypeScript + React web app that uses Google's Gemini 2.5 Pro AI model to convert audio files (mp3, wav, ogg, flac, m4a) into piano sheet music, displayed with VexFlow.

---

## 🚀 Features

- 🎧 Upload or drag & drop your favorite audio clip
- 🎵 AI-powered note transcription using Gemini 2.5 Pro
- 📝 Display transcribed notes as readable sheet music
- 🎹 Playable piano format for easy practicing

---

## 🧠 Motivation

Ever heard a cool song and wished you could play it on piano? PLAI solves that by transcribing any audio clip into sheet music. Perfect for musicians or anyone wanting to learn piano by ear!

---

## 🛠 Tech Stack

- **TypeScript** & **React**
- **Web Audio API** for audio loading & processing
- **Google Gemini 2.5 Pro** for AI-based transcription
- **VexFlow** for sheet music rendering
- **Tailwind CSS** for styling

---

## 📦 How to Run

1. **Clone the repo**

   ```bash
   git clone https://github.com/Devin-Fitzpatrick06/PLAI-by-ear.git
   cd PLAI-by-ear
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up API keys**
   - Add Gemini 2.5 Pro credentials (e.g., in `.env.local`)

4. **Start dev server**

   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) and drop in an audio file. Let the AI do its magic!

---

## 🧩 Architecture Overview

```
[User Audio] → Web Audio API → (send audio) → Gemini 2.5  
             ← Note sequence ←        ← AI model  
                       ↓  
                  VexFlow  
                       ↓  
                Rendered Sheet Music
```

---

## 😬 Challenges

- Translating AI output to visually accurate, readable sheet notation
- Finding the right Gemini model that balances accuracy and aesthetic quality

---

## 🎉 Accomplishments

- Nailed down the best API for sheet-music transcription
- Built a pipeline: audio input → AI detection → readable sheet music

---

## 🔭 What's Next?

- Expand to support more instruments (guitar, violin)
- Handle full songs instead of short clips
- Support different clefs and time signatures
- Integrate tools like Essentia for improved music processing

---

## 📚 Credits

- **Devin Fitzpatrick**
- **Litong Deng**
- **BellaE72**  
  Team submission for UC Berkeley AI Hackathon 2025

---

## 📎 Try it Live

Check it out: [https://plai-by-ear.vercel.app](https://plai-by-ear.vercel.app)

---

## 📝 License

*(Add license info here if applicable)*

---

## 💬 Contribute

Want to help? Fork the repo, add features, debug, or improve the UI—and send a pull request! Let’s rock PLAI to its full potential 🤘
