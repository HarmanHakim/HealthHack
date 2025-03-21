"use client"

import { useState, useEffect } from "react"

interface PatternDetectionOverlayProps {
  eegData: any
  timeWindow: [number, number]
  selectedChannels: string[]
}

interface DetectedPattern {
  channelIndex: number
  channelName: string
  start: number
  end: number
  type: string
  confidence: number
  amplitude: number
  frequency: number
}

export function PatternDetectionOverlay({ eegData, timeWindow, selectedChannels }: PatternDetectionOverlayProps) {
  const [patterns, setPatterns] = useState<DetectedPattern[]>([])

  useEffect(() => {
    // In a real application, this would come from the AI analysis
    // For now, we'll use the events from the EEG data and add confidence scores
    if (!eegData || !eegData.channels) return

    const detectedPatterns: DetectedPattern[] = []

    eegData.channels.forEach((channel: any, channelIndex: number) => {
      if (channel.events && selectedChannels.includes(channel.name)) {
        channel.events.forEach((event: any) => {
          if (event.end >= timeWindow[0] && event.start <= timeWindow[1]) {
            // Generate random amplitude and frequency based on event type
            let amplitude = 0
            let frequency = 0

            if (event.type.includes("HFO")) {
              amplitude = channel.voltage * (0.3 + Math.random() * 0.4)
              frequency = 80 + Math.random() * 70 // 80-150 Hz
            } else if (event.type.includes("IED")) {
              amplitude = channel.voltage * (0.5 + Math.random() * 0.5)
              frequency = 8 + Math.random() * 12 // 8-20 Hz
            } else if (event.type.includes("Rhythmic")) {
              amplitude = channel.voltage * (0.4 + Math.random() * 0.3)
              frequency = 1 + Math.random() * 4 // 1-5 Hz
            }

            detectedPatterns.push({
              channelIndex,
              channelName: channel.name,
              start: event.start,
              end: event.end,
              type: event.type,
              confidence: 0.7 + Math.random() * 0.3, // 70-100% confidence
              amplitude,
              frequency,
            })
          }
        })
      }
    })

    setPatterns(detectedPatterns)
  }, [eegData, timeWindow, selectedChannels])

  // Calculate positions for pattern markers
  const getPatternStyle = (pattern: DetectedPattern) => {
    if (!eegData || !eegData.channels) return {}

    // Filter channels based on selection
    const filteredChannels = eegData.channels.filter((channel: any) => selectedChannels.includes(channel.name))

    // Find the index of the channel in the filtered list
    const filteredChannelIndex = filteredChannels.findIndex((channel: any) => channel.name === pattern.channelName)

    if (filteredChannelIndex === -1) return { display: "none" }

    const channelCount = filteredChannels.length
    const channelHeight = 100 / channelCount

    const top = channelHeight * filteredChannelIndex
    const height = channelHeight

    const timeRange = timeWindow[1] - timeWindow[0]
    const left = ((pattern.start - timeWindow[0]) / timeRange) * 100
    const width = ((pattern.end - pattern.start) / timeRange) * 100

    return {
      top: `${top}%`,
      height: `${height}%`,
      left: `${left}%`,
      width: `${width}%`,
    }
  }

  const getPatternClass = (pattern: DetectedPattern) => {
    // Different styles based on pattern type
    if (pattern.type.includes("HFO")) {
      return "border-red-500 bg-red-500/10"
    } else if (pattern.type.includes("IED")) {
      return "border-blue-500 bg-blue-500/10"
    } else if (pattern.type.includes("Rhythmic")) {
      return "border-green-500 bg-green-500/10"
    } else {
      return "border-yellow-500 bg-yellow-500/10"
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {patterns.map((pattern, index) => (
        <div
          key={index}
          className={`absolute border-2 rounded-sm ${getPatternClass(pattern)}`}
          style={getPatternStyle(pattern)}
          title={`${pattern.type} (${Math.round(pattern.confidence * 100)}% confidence)
Amplitude: ${pattern.amplitude.toFixed(1)}μV
Frequency: ${pattern.frequency.toFixed(1)}Hz
Time: ${pattern.start.toFixed(2)}s - ${pattern.end.toFixed(2)}s`}
        />
      ))}
    </div>
  )
}

