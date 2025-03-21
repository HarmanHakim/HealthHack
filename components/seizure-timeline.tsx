"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"

interface SeizureTimelineProps {
  duration: number
  timeWindow: [number, number]
  onTimeWindowChange: (values: number[]) => void
}

interface Seizure {
  start: number
  end: number
  confidence: number
}

export function SeizureTimeline({ duration, timeWindow, onTimeWindowChange }: SeizureTimelineProps) {
  const [seizures, setSeizures] = useState<Seizure[]>([])

  useEffect(() => {
    // In a real application, this would come from the AI analysis
    // For now, we'll generate some random seizure events
    const demoSeizures: Seizure[] = []

    // Generate 3-5 seizure events
    const seizureCount = 3 + Math.floor(Math.random() * 3)

    for (let i = 0; i < seizureCount; i++) {
      const start = Math.random() * (duration - 30) // Random start time
      const seizureDuration = 5 + Math.random() * 25 // 5-30 seconds
      const end = Math.min(duration, start + seizureDuration)
      const confidence = 0.7 + Math.random() * 0.3 // 70-100% confidence

      demoSeizures.push({
        start,
        end,
        confidence,
      })
    }

    // Sort by start time
    demoSeizures.sort((a, b) => a.start - b.start)

    setSeizures(demoSeizures)
  }, [duration])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Seizure Timeline</h4>
        <span className="text-xs text-muted-foreground">{seizures.length} seizure events detected</span>
      </div>

      <div className="relative h-8 bg-muted/20 rounded-md">
        {/* Render seizure events */}
        {seizures.map((seizure, index) => {
          const startPercent = (seizure.start / duration) * 100
          const widthPercent = ((seizure.end - seizure.start) / duration) * 100

          // Color based on confidence (red for high confidence, yellow for medium)
          const bgColor =
            seizure.confidence > 0.9
              ? "bg-red-500/70"
              : seizure.confidence > 0.8
                ? "bg-orange-500/70"
                : "bg-yellow-500/70"

          return (
            <div
              key={index}
              className={`absolute top-0 h-full ${bgColor} rounded-sm cursor-pointer`}
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
              }}
              onClick={() => onTimeWindowChange([seizure.start, seizure.end])}
              title={`Seizure ${index + 1}: ${formatTime(seizure.start)} - ${formatTime(seizure.end)} (${Math.round(seizure.confidence * 100)}% confidence)`}
            />
          )
        })}

        {/* Current view indicator */}
        <div
          className="absolute top-0 h-full border-2 border-primary/50 bg-primary/10 pointer-events-none"
          style={{
            left: `${(timeWindow[0] / duration) * 100}%`,
            width: `${((timeWindow[1] - timeWindow[0]) / duration) * 100}%`,
          }}
        />
      </div>

      <Slider
        value={[timeWindow[0], timeWindow[1]]}
        min={0}
        max={duration}
        step={1}
        onValueChange={onTimeWindowChange}
      />
    </div>
  )
}

