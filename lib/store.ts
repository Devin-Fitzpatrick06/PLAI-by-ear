"use client"

import { create } from "zustand"

// Define the store types
interface SheetMusicData {
  title: string
  timeSignature: string
  keySignature: string
  tempo: number
  notes: Array<{
    pitch: string
    duration: string
    time: number
  }>
}

interface SheetMusicStore {
  sheetMusic: SheetMusicData | null
  isLoading: boolean
  setSheetMusic: (data: SheetMusicData) => void
  setLoading: (loading: boolean) => void
  clearSheetMusic: () => void
}

// Create the store
export const useSheetMusicStore = create<SheetMusicStore>((set) => ({
  sheetMusic: null,
  isLoading: false,
  setSheetMusic: (data) => set({ sheetMusic: data, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearSheetMusic: () => set({ sheetMusic: null, isLoading: false }),
}))
