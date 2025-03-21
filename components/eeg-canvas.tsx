"use client"

import { useEffect, useRef } from "react"

interface EegCanvasProps {
  eegData: any
  timeWindow: [number, number]
  zoomLevel: number
  selectedTime: number
  selectedChannels: string[]
  amplitudeScale: number
  showIctalRegions?: boolean
}

export function EegCanvas({
  eegData,
  timeWindow,
  zoomLevel,
  selectedTime,
  selectedChannels,
  amplitudeScale,
  showIctalRegions = true,
}: EegCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw the EEG visualization on canvas
  useEffect(() => {
    if (!canvasRef.current || !eegData || !eegData.channels || eegData.channels.length === 0) return

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

    // Filter channels based on selection
    const filteredChannels = eegData.channels.filter((channel: any) => selectedChannels.includes(channel.name))

    // Calculate dimensions
    const channelCount = filteredChannels.length
    if (channelCount === 0) return

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

    // Draw ictal regions if enabled
    if (showIctalRegions) {
      // Get ictal regions from localStorage
      try {
        const storedRegions = localStorage.getItem("ictalRegions")
        if (storedRegions) {
          const regions = JSON.parse(storedRegions)

          regions.forEach((region: any) => {
            if (region.end >= timeWindow[0] && region.start <= timeWindow[1]) {
              const startX = Math.max(0, (region.start - timeWindow[0]) * pixelsPerSecond)
              const endX = Math.min(rect.width, (region.end - timeWindow[0]) * pixelsPerSecond)

              // Color based on severity
              let bgColor = "rgba(0, 255, 0, 0.1)" // Default: low severity (green)

              if (region.severity === "high") {
                bgColor = "rgba(255, 0, 0, 0.1)" // High severity (red)
              } else if (region.severity === "medium") {
                bgColor = "rgba(255, 165, 0, 0.1)" // Medium severity (orange)
              }

              ctx.fillStyle = bgColor
              ctx.fillRect(startX, 0, endX - startX, rect.height)

              // Add a label at the top
              ctx.fillStyle = "#666666"
              ctx.font = "10px Arial"
              ctx.textAlign = "center"
              ctx.fillText(`Ictal Region`, (startX + endX) / 2, 10)
            }
          })
        }
      } catch (error) {
        console.error("Error rendering ictal regions:", error)
      }
    }

    // Draw each channel
    filteredChannels.forEach((channel: any, index: number) => {
      const yCenter = channelHeight * (index + 0.5)
      const amplitude = 0.4 * channelHeight * amplitudeScale // Scale to fit within channel height

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
        channel.events.forEach((event: any) => {
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

            // Choose color based on event type
            let eventColor = "#ff0000" // Default red

            if (event.type.includes("HFO")) {
              eventColor = "#ff0000" // Red for HFOs
            } else if (event.type.includes("IED")) {
              eventColor = "#0000ff" // Blue for IEDs
            } else if (event.type.includes("Rhythmic")) {
              eventColor = "#00aa00" // Green for Rhythmic Discharges
            }

            // Draw the event
            ctx.strokeStyle = eventColor
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

            // Add small label for the event type
            const eventLabel = event.type.split(" ")[0] // Just take the first word
            ctx.fillStyle = eventColor
            ctx.font = "8px Arial"
            ctx.textAlign = "center"
            ctx.fillText(eventLabel, eventStartX + eventWidth / 2, yCenter - amplitude - 2)
          }
        })
      }
    })
  }, [eegData, timeWindow, selectedTime, zoomLevel, selectedChannels, amplitudeScale, showIctalRegions])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
}

