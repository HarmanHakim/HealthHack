"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  SkipBack,
  SkipForward,
  Filter,
} from "lucide-react"
import { EegCanvas } from "@/components/eeg-canvas"
import { PatternDetectionOverlay } from "@/components/pattern-detection-overlay"

interface EegVisualizationPanelProps {
  className?: string
}

export function EegVisualizationPanel({ className }: EegVisualizationPanelProps) {
  const [eegData, setEegData] = useState<any>(null)
  const [timeWindow, setTimeWindow] = useState<[number, number]>([0, 60]) // 60 seconds view
  const [isPlaying, setIsPlaying] = useState(false)
  const [visualizationType, setVisualizationType] = useState("raw")
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedTime, setSelectedTime] = useState(0)
  const [showPatterns, setShowPatterns] = useState(true)
  const [showIctalRegions, setShowIctalRegions] = useState(true)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [amplitudeScale, setAmplitudeScale] = useState(1.0)
  const animationRef = useRef<number | null>(null)

  // Load data from localStorage when component mounts or when data is updated
  useEffect(() => {
    const handleDataUpdate = () => {
      const storedData = localStorage.getItem("eegData")
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          setEegData(parsedData)

          // Initialize selected channels with all channels
          if (parsedData.channels && Array.isArray(parsedData.channels)) {
            setSelectedChannels(parsedData.channels.map((ch: any) => ch.name))
          }
        } catch (error) {
          console.error("Error parsing EEG data:", error)
        }
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

  // Listen for time window changes from other components
  useEffect(() => {
    const handleTimeWindowChange = (e: CustomEvent) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length === 2) {
        setTimeWindow(e.detail as [number, number])
      }
    }

    window.addEventListener("timeWindowChanged", handleTimeWindowChange as EventListener)

    return () => {
      window.removeEventListener("timeWindowChanged", handleTimeWindowChange as EventListener)
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

  const handleTimeWindowChange = (values: number[]) => {
    if (values.length === 2) {
      setTimeWindow([values[0], values[1]])

      // Dispatch event to notify other components of the time window change
      const event = new CustomEvent("timeWindowChanged", { detail: [values[0], values[1]] })
      window.dispatchEvent(event)
    }
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const newZoom = prev * 1.5
      const currentCenter = (timeWindow[0] + timeWindow[1]) / 2
      const newTimeRange = (timeWindow[1] - timeWindow[0]) / 1.5

      const newTimeWindow: [number, number] = [
        Math.max(0, currentCenter - newTimeRange / 2),
        currentCenter + newTimeRange / 2,
      ]

      setTimeWindow(newTimeWindow)

      // Dispatch event to notify other components of the time window change
      const event = new CustomEvent("timeWindowChanged", { detail: newTimeWindow })
      window.dispatchEvent(event)

      return newZoom
    })
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = prev / 1.5
      const currentCenter = (timeWindow[0] + timeWindow[1]) / 2
      const newTimeRange = (timeWindow[1] - timeWindow[0]) * 1.5

      const newTimeWindow: [number, number] = [
        Math.max(0, currentCenter - newTimeRange / 2),
        currentCenter + newTimeRange / 2,
      ]

      setTimeWindow(newTimeWindow)

      // Dispatch event to notify other components of the time window change
      const event = new CustomEvent("timeWindowChanged", { detail: newTimeWindow })
      window.dispatchEvent(event)

      return newZoom
    })
  }

  const handlePanLeft = () => {
    const timeRange = timeWindow[1] - timeWindow[0]
    const panAmount = timeRange * 0.25

    const newTimeWindow: [number, number] = [
      Math.max(0, timeWindow[0] - panAmount),
      Math.max(timeRange, timeWindow[1] - panAmount),
    ]

    setTimeWindow(newTimeWindow)

    // Dispatch event to notify other components of the time window change
    const event = new CustomEvent("timeWindowChanged", { detail: newTimeWindow })
    window.dispatchEvent(event)
  }

  const handlePanRight = () => {
    const timeRange = timeWindow[1] - timeWindow[0]
    const panAmount = timeRange * 0.25
    const maxTime = eegData?.duration || 3600

    const newTimeWindow: [number, number] = [
      Math.min(maxTime - timeRange, timeWindow[0] + panAmount),
      Math.min(maxTime, timeWindow[1] + panAmount),
    ]

    setTimeWindow(newTimeWindow)

    // Dispatch event to notify other components of the time window change
    const event = new CustomEvent("timeWindowChanged", { detail: newTimeWindow })
    window.dispatchEvent(event)
  }

  const handleSkipToStart = () => {
    const timeRange = timeWindow[1] - timeWindow[0]

    const newTimeWindow: [number, number] = [0, timeRange]

    setTimeWindow(newTimeWindow)

    // Dispatch event to notify other components of the time window change
    const event = new CustomEvent("timeWindowChanged", { detail: newTimeWindow })
    window.dispatchEvent(event)
  }

  const handleSkipToEnd = () => {
    const timeRange = timeWindow[1] - timeWindow[0]
    const maxTime = eegData?.duration || 3600

    const newTimeWindow: [number, number] = [maxTime - timeRange, maxTime]

    setTimeWindow(newTimeWindow)

    // Dispatch event to notify other components of the time window change
    const event = new CustomEvent("timeWindowChanged", { detail: newTimeWindow })
    window.dispatchEvent(event)
  }

  const handleExportData = () => {
    if (!eegData) return

    // Create a JSON blob with the current view data
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        timeWindow: timeWindow,
        visualizationType: visualizationType,
        selectedChannels: selectedChannels,
      },
      channels: eegData.channels
        .filter((channel: any) => selectedChannels.includes(channel.name))
        .map((channel: any) => {
          // Calculate sample indices for the current time window
          const startSample = Math.floor(timeWindow[0] * eegData.sampleRate)
          const endSample = Math.ceil(timeWindow[1] * eegData.sampleRate)

          return {
            name: channel.name,
            voltage: channel.voltage,
            data: channel.data.slice(startSample, endSample),
            events: channel.events.filter((event: any) => event.end >= timeWindow[0] && event.start <= timeWindow[1]),
          }
        }),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    // Create a link and trigger download
    const a = document.createElement("a")
    a.href = url
    a.download = `epileptoscan_export_${formatTimeForFilename(timeWindow[0])}_${formatTimeForFilename(timeWindow[1])}.json`
    document.body.appendChild(a)
    a.click()

    // Clean up
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTimeForFilename = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, "0")}m${secs.toString().padStart(2, "0")}s`
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    } else {
      const minutes = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${minutes}m ${secs}s`
    }
  }

  const toggleChannelSelection = (channelName: string) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelName)) {
        return prev.filter((ch) => ch !== channelName)
      } else {
        return [...prev, channelName]
      }
    })
  }

  const selectAllChannels = () => {
    if (eegData && eegData.channels) {
      setSelectedChannels(eegData.channels.map((ch: any) => ch.name))
    }
  }

  const deselectAllChannels = () => {
    setSelectedChannels([])
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>EEG Visualization</CardTitle>
            <CardDescription>Interactive visualization of EEG data with pattern detection</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPatterns(!showPatterns)}
              className={showPatterns ? "bg-primary/10" : ""}
            >
              <Filter className="h-4 w-4 mr-1" />
              Patterns
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIctalRegions(!showIctalRegions)}
              className={showIctalRegions ? "bg-primary/10" : ""}
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              Ictal Regions
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportData} disabled={!eegData}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="raw" onValueChange={setVisualizationType} className="p-4 pt-0">
          <TabsList className="mb-4">
            <TabsTrigger value="raw">Raw EEG</TabsTrigger>
            <TabsTrigger value="filtered">Filtered</TabsTrigger>
            <TabsTrigger value="spectrogram">Spectrogram</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          </TabsList>

          <TabsContent value="raw" className="m-0">
            <div className="relative">
              <div className="flex gap-2 mb-2">
                <div className="w-48 border rounded-md p-2 h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Channels</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={selectAllChannels}>
                        All
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={deselectAllChannels}>
                        None
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {eegData?.channels?.map((channel: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-1 rounded text-sm cursor-pointer ${
                          selectedChannels.includes(channel.name) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleChannelSelection(channel.name)}
                      >
                        <span>{channel.name}</span>
                        <span className="text-xs">{channel.voltage.toFixed(1)}μV</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 relative bg-white border rounded-lg overflow-hidden" style={{ height: "400px" }}>
                  {eegData ? (
                    <>
                      <EegCanvas
                        eegData={eegData}
                        timeWindow={timeWindow}
                        zoomLevel={zoomLevel}
                        selectedTime={selectedTime}
                        selectedChannels={selectedChannels}
                        amplitudeScale={amplitudeScale}
                        showIctalRegions={showIctalRegions}
                      />
                      {showPatterns && (
                        <PatternDetectionOverlay
                          eegData={eegData}
                          timeWindow={timeWindow}
                          selectedChannels={selectedChannels}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">
                        No EEG data loaded. Please upload a .mat file or load demo data.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleSkipToStart}
                    className="h-8 w-8"
                    disabled={!eegData}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button size="icon" variant="outline" onClick={handlePanLeft} className="h-8 w-8" disabled={!eegData}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="h-8 w-8"
                    disabled={!eegData}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handlePanRight}
                    className="h-8 w-8"
                    disabled={!eegData}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleSkipToEnd}
                    className="h-8 w-8"
                    disabled={!eegData}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 px-4">
                  <Slider
                    value={[timeWindow[0], timeWindow[1]]}
                    min={0}
                    max={eegData?.duration || 600}
                    step={1}
                    onValueChange={handleTimeWindowChange}
                    disabled={!eegData}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" onClick={handleZoomIn} className="h-8 w-8" disabled={!eegData}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>

                  <Button size="icon" variant="outline" onClick={handleZoomOut} className="h-8 w-8" disabled={!eegData}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <span>
                    Time: {formatTime(timeWindow[0])} - {formatTime(timeWindow[1])}
                  </span>
                  <span className="mx-2">|</span>
                  <span>Duration: {formatDuration(timeWindow[1] - timeWindow[0])}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Amplitude:</span>
                  <Slider
                    value={[amplitudeScale]}
                    min={0.1}
                    max={3}
                    step={0.1}
                    onValueChange={(values) => setAmplitudeScale(values[0])}
                    className="w-32"
                  />
                  <span className="text-xs font-medium">{amplitudeScale.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="filtered" className="m-0">
            <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">Filtered view will be available in a future update.</p>
            </div>
          </TabsContent>

          <TabsContent value="spectrogram" className="m-0">
            <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">Spectrogram view will be available in a future update.</p>
            </div>
          </TabsContent>

          <TabsContent value="heatmap" className="m-0">
            <div className="flex items-center justify-center h-[400px] bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">Heatmap view will be available in a future update.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

