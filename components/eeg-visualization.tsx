"use client"

import { useState, useEffect, useRef } from "react"
import type React from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Play, Pause, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react"

interface EegData {
  channels: {
    name: string
    data: number[]
    events: Array<{
      start: number
      end: number
      type: string
    }>
    voltage: number
  }[]
  sampleRate: number
  duration: number
}

export function EegVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [eegData, setEegData] = useState<EegData | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0, 1, 2])
  const [timeWindow, setTimeWindow] = useState<[number, number]>([0, 60]) // 60 seconds view
  const [isPlaying, setIsPlaying] = useState(false)
  const [visualizationType, setVisualizationType] = useState("time-series")
  const [autoScale, setAutoScale] = useState(true)
  const [yAxisRange, setYAxisRange] = useState<[number, number]>([-200, 200])
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedTime, setSelectedTime] = useState(0)
  const animationRef = useRef<number | null>(null)

  // Load data from localStorage when component mounts or when data is updated
  useEffect(() => {
    const handleDataUpdate = () => {
      const storedData = localStorage.getItem("eegData")
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)

          // If we don't have proper channel data, create demo data
          if (!parsedData.channels || !Array.isArray(parsedData.channels) || parsedData.channels.length === 0) {
            setEegData(createDemoData())
          } else {
            setEegData(parsedData)
          }
        } catch (error) {
          console.error("Error parsing EEG data:", error)
          setEegData(createDemoData())
        }
      } else {
        // Create demo data if no data is available
        setEegData(createDemoData())
      }
    }

    // Initial load
    handleDataUpdate()

    // Listen for updates
    window.addEventListener("eegDataUpdated", handleDataUpdate)

    return () => {
      window.removeEventListener("eegDataUpdated", handleDataUpdate)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Auto-advance the time window when playing
  useEffect(() => {
    if (!isPlaying || !eegData) return

    let lastTimestamp = 0

    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp

      const elapsed = timestamp - lastTimestamp
      if (elapsed > 50) {
        // Update every 50ms
        lastTimestamp = timestamp

        setTimeWindow(([start, end]) => {
          const step = 0.2 // Advance 0.2 seconds at a time
          const newStart = start + step
          const newEnd = end + step

          // Stop at the end of the recording
          if (newEnd >= eegData.duration) {
            setIsPlaying(false)
            return [start, end]
          }

          return [newStart, newEnd]
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, eegData])

  // Prepare data for visualization
  const prepareTimeSeriesData = () => {
    if (!eegData) return []

    const [start, end] = timeWindow
    const data = []

    for (let i = start; i < Math.min(end, eegData.channels[0]?.data?.length || 0); i++) {
      const point: Record<string, any> = { time: i }

      selectedChannels.forEach((channelIndex) => {
        if (channelIndex < eegData.channels.length) {
          point[`channel${channelIndex}`] = eegData.channels[channelIndex].data[i]
        }
      })

      data.push(point)
    }

    return data
  }

  const handleChannelToggle = (channelIndex: number) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelIndex)) {
        return prev.filter((c) => c !== channelIndex)
      } else {
        return [...prev, channelIndex]
      }
    })
  }

  const handleTimeWindowChange = (values: number[]) => {
    if (values.length === 2) {
      setTimeWindow([values[0], values[1]])
    }
  }

  // Draw the EEG visualization on canvas
  useEffect(() => {
    if (!canvasRef.current || !eegData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Calculate dimensions
    const channelCount = eegData.channels.length
    const channelHeight = rect.height / channelCount
    const timeRange = timeWindow[1] - timeWindow[0]
    const pixelsPerSecond = rect.width / timeRange

    // Draw time grid
    ctx.strokeStyle = "#00800080" // Green with transparency
    ctx.lineWidth = 1

    // Major grid lines every 20 seconds
    const majorGridInterval = 20 // seconds
    for (
      let t = Math.ceil(timeWindow[0] / majorGridInterval) * majorGridInterval;
      t <= timeWindow[1];
      t += majorGridInterval
    ) {
      const x = (t - timeWindow[0]) * pixelsPerSecond
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()

      // Add time label
      ctx.fillStyle = "#666666"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"

      // Format time as MM:SS
      const minutes = Math.floor(t / 60)
      const seconds = Math.floor(t % 60)
      const timeLabel = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

      ctx.fillText(timeLabel, x, rect.height - 5)
    }

    // Minor grid lines every 5 seconds
    ctx.strokeStyle = "#00800040" // Lighter green
    const minorGridInterval = 5 // seconds
    for (
      let t = Math.ceil(timeWindow[0] / minorGridInterval) * minorGridInterval;
      t <= timeWindow[1];
      t += minorGridInterval
    ) {
      if (t % majorGridInterval !== 0) {
        // Skip if it's already a major grid line
        const x = (t - timeWindow[0]) * pixelsPerSecond
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, rect.height)
        ctx.stroke()
      }
    }

    // Draw shaded region for selected time if applicable
    if (selectedTime >= timeWindow[0] && selectedTime <= timeWindow[1]) {
      const x = (selectedTime - timeWindow[0]) * pixelsPerSecond
      const width = 10 * pixelsPerSecond // 10 second width

      ctx.fillStyle = "rgba(200, 200, 200, 0.3)"
      ctx.fillRect(x - width / 2, 0, width, rect.height)
    }

    // Draw each channel
    eegData.channels.forEach((channel, index) => {
      const yCenter = channelHeight * (index + 0.5)
      const amplitude = 0.4 * channelHeight // Scale to fit within channel height

      // Draw channel label and voltage
      ctx.fillStyle = "#333333"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "left"
      ctx.fillText(channel.name, 5, yCenter - channelHeight * 0.3)

      ctx.font = "10px Arial"
      ctx.fillText(`${channel.voltage.toFixed(1)}μV`, 5, yCenter - channelHeight * 0.1)

      // Draw horizontal separator line
      ctx.strokeStyle = "#dddddd"
      ctx.beginPath()
      ctx.moveTo(0, (index + 1) * channelHeight)
      ctx.lineTo(rect.width, (index + 1) * channelHeight)
      ctx.stroke()

      // Calculate visible data points
      const startSample = Math.floor(timeWindow[0] * eegData.sampleRate)
      const endSample = Math.ceil(timeWindow[1] * eegData.sampleRate)
      const visibleData = channel.data.slice(startSample, endSample)

      // Draw the EEG signal
      if (visibleData.length > 0) {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 1
        ctx.beginPath()

        for (let i = 0; i < visibleData.length; i++) {
          const x = (i / eegData.sampleRate) * pixelsPerSecond
          const y = yCenter - (visibleData[i] / channel.voltage) * amplitude

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.stroke()

        // Draw events (highlighted regions)
        channel.events.forEach((event) => {
          if (event.end >= timeWindow[0] && event.start <= timeWindow[1]) {
            const eventStartX = Math.max(0, (event.start - timeWindow[0]) * pixelsPerSecond)
            const eventEndX = Math.min(rect.width, (event.end - timeWindow[0]) * pixelsPerSecond)
            const eventWidth = eventEndX - eventStartX

            // Get the data for this event
            const eventStartSample = Math.floor(event.start * eegData.sampleRate) - startSample
            const eventEndSample = Math.ceil(event.end * eegData.sampleRate) - startSample
            const eventData = visibleData.slice(
              Math.max(0, eventStartSample),
              Math.min(visibleData.length, eventEndSample),
            )

            // Draw the event in red
            ctx.strokeStyle = "#ff0000"
            ctx.lineWidth = 1.5
            ctx.beginPath()

            for (let i = 0; i < eventData.length; i++) {
              const sampleIndex = eventStartSample + i
              if (sampleIndex >= 0 && sampleIndex < visibleData.length) {
                const x = eventStartX + (i / eventData.length) * eventWidth
                const y = yCenter - (eventData[i] / channel.voltage) * amplitude

                if (i === 0) {
                  ctx.moveTo(x, y)
                } else {
                  ctx.lineTo(x, y)
                }
              }
            }

            ctx.stroke()
          }
        })
      }
    })
  }, [eegData, timeWindow, selectedTime, zoomLevel])

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const newZoom = prev * 1.5
      const currentCenter = (timeWindow[0] + timeWindow[1]) / 2
      const newTimeRange = (timeWindow[1] - timeWindow[0]) / 1.5

      setTimeWindow([Math.max(0, currentCenter - newTimeRange / 2), currentCenter + newTimeRange / 2])

      return newZoom
    })
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = prev / 1.5
      const currentCenter = (timeWindow[0] + timeWindow[1]) / 2
      const newTimeRange = (timeWindow[1] - timeWindow[0]) * 1.5

      setTimeWindow([Math.max(0, currentCenter - newTimeRange / 2), currentCenter + newTimeRange / 2])

      return newZoom
    })
  }

  const handlePanLeft = () => {
    const timeRange = timeWindow[1] - timeWindow[0]
    const panAmount = timeRange * 0.25

    setTimeWindow(([start, end]) => [Math.max(0, start - panAmount), Math.max(timeRange, end - panAmount)])
  }

  const handlePanRight = () => {
    const timeRange = timeWindow[1] - timeWindow[0]
    const panAmount = timeRange * 0.25
    const maxTime = eegData?.duration || 3600

    setTimeWindow(([start, end]) => [
      Math.min(maxTime - timeRange, start + panAmount),
      Math.min(maxTime, end + panAmount),
    ])
  }

  if (!eegData) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">Loading EEG data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className="relative bg-white border rounded-lg overflow-hidden"
        style={{ height: `${eegData.channels.length * 60}px` }}
      >
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={handlePanLeft} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={() => setIsPlaying(!isPlaying)} className="h-8 w-8">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button size="icon" variant="outline" onClick={handlePanRight} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 px-4">
          <Slider
            value={[timeWindow[0], timeWindow[1]]}
            min={0}
            max={eegData.duration}
            step={1}
            onValueChange={handleTimeWindowChange}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={handleZoomIn} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={handleZoomOut} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex justify-between">
        <span>
          Time: {formatTime(timeWindow[0])} - {formatTime(timeWindow[1])}
        </span>
        <span>Duration: {formatDuration(timeWindow[1] - timeWindow[0])}</span>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  } else {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}m ${secs}s`
  }
}

function createDemoData(): EegData {
  const channelNames = ["C4", "CP5", "Fz", "P3", "P4", "C3", "F4", "O2", "T8", "T7", "F3"]
  const voltages = [38.8, 38.4, 38.2, 36.9, 36.7, 36.5, 35.5, 34.5, 34.1, 34.1, 33.0]
  const sampleRate = 250 // 250 Hz
  const duration = 3600 // 1 hour in seconds
  const totalSamples = sampleRate * duration

  // Create channels with synthetic data
  const channels = channelNames.map((name, channelIndex) => {
    const voltage = voltages[channelIndex]

    // Generate synthetic EEG data
    const data: number[] = []
    const events: Array<{ start: number; end: number; type: string }> = []

    // Base frequencies for different channel types
    const baseFreq = 10 + (channelIndex % 5) // 10-14 Hz
    const baseAmp = voltage * 0.2

    // Generate data points
    for (let i = 0; i < totalSamples; i++) {
      const timeSeconds = i / sampleRate

      // Base signal (alpha waves)
      let value = Math.sin(2 * Math.PI * baseFreq * timeSeconds) * baseAmp

      // Add some beta waves
      value += Math.sin(2 * Math.PI * 20 * timeSeconds) * (baseAmp * 0.3)

      // Add some theta waves
      value += Math.sin(2 * Math.PI * 5 * timeSeconds) * (baseAmp * 0.4)

      // Add some random noise
      value += (Math.random() - 0.5) * (baseAmp * 0.5)

      data.push(value)
    }

    // Add some events (abnormal activity)
    const eventTypes = [
      "HFO (High Frequency Oscillation)",
      "IED (Intractal Epileptiform Discharge)",
      "Rhythmic Discharge",
    ]

    // Add 5-10 events per channel
    const eventCount = 5 + Math.floor(Math.random() * 6)

    for (let i = 0; i < eventCount; i++) {
      const eventStart = Math.floor(Math.random() * (duration - 30)) // Random start time
      const eventDuration = 0.1 + Math.random() * 3 // 0.1-3 seconds
      const eventEnd = eventStart + eventDuration
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]

      events.push({
        start: eventStart,
        end: eventEnd,
        type: eventType,
      })

      // Modify the signal during the event
      const startSample = Math.floor(eventStart * sampleRate)
      const endSample = Math.ceil(eventEnd * sampleRate)

      for (let j = startSample; j < endSample && j < data.length; j++) {
        if (eventType === "HFO (High Frequency Oscillation)") {
          // High frequency oscillation
          const localTime = (j - startSample) / sampleRate
          data[j] += Math.sin(2 * Math.PI * 150 * localTime) * (baseAmp * 1.5)
        } else if (eventType === "IED (Intractal Epileptiform Discharge)") {
          // Spike
          const relPos = (j - startSample) / (endSample - startSample)
          const spike = Math.exp(-Math.pow((relPos - 0.5) * 10, 2)) * (baseAmp * 2)
          data[j] += spike
        } else {
          // Rhythmic discharge
          const localTime = (j - startSample) / sampleRate
          data[j] += Math.sin(2 * Math.PI * 2 * localTime) * (baseAmp * 1.2)
        }
      }
    }

    return {
      name,
      data,
      events,
      voltage,
    }
  })

  return {
    channels,
    sampleRate,
    duration,
  }
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function getChannelColor(index: number): string {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
    "hsl(var(--chart-7))",
    "hsl(var(--chart-8))",
    "hsl(var(--chart-9))",
  ]

  return colors[index % colors.length]
}

