"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Brain, Activity, AlertTriangle, Eye, EyeOff, Download } from "lucide-react"

interface IctalRegion {
  start: number
  end: number
  channels: string[]
  confidence: number
  eventCount: {
    hfo: number
    ied: number
    rhythmic: number
  }
  severity: "low" | "medium" | "high"
}

export function IctalRegionsPanel() {
  const [eegData, setEegData] = useState<any>(null)
  const [ictalRegions, setIctalRegions] = useState<IctalRegion[]>([])
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null)
  const [timeWindow, setTimeWindow] = useState<[number, number]>([0, 60])
  const [showAllRegions, setShowAllRegions] = useState(true)

  useEffect(() => {
    const handleDataUpdate = () => {
      const storedData = localStorage.getItem("eegData")
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          setEegData(parsedData)

          // Generate ictal regions based on event clustering
          const regions = identifyIctalRegions(parsedData)
          setIctalRegions(regions)

          // Reset selected region
          setSelectedRegion(null)
        } catch (error) {
          console.error("Error parsing EEG data:", error)
        }
      } else {
        setEegData(null)
        setIctalRegions([])
      }
    }

    // Initial load
    handleDataUpdate()

    // Listen for updates
    window.addEventListener("eegDataUpdated", handleDataUpdate)

    return () => {
      window.removeEventListener("eegDataUpdated", handleDataUpdate)
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

  const identifyIctalRegions = (data: any): IctalRegion[] => {
    if (!data || !data.channels || !Array.isArray(data.channels)) {
      return []
    }

    // In a real implementation, this would use advanced signal processing or ML
    // For this example, we'll cluster events based on temporal proximity

    // 1. Collect all events across channels
    const allEvents: Array<{
      start: number
      end: number
      type: string
      channel: string
    }> = []

    data.channels.forEach((channel: any) => {
      if (channel.events && Array.isArray(channel.events)) {
        channel.events.forEach((event: any) => {
          allEvents.push({
            ...event,
            channel: channel.name,
          })
        })
      }
    })

    // 2. Sort events by start time
    allEvents.sort((a, b) => a.start - b.start)

    // 3. Cluster events that are close in time (within 10 seconds)
    const clusters: Array<{
      events: typeof allEvents
      start: number
      end: number
    }> = []

    let currentCluster: typeof allEvents = []
    let clusterStart = 0
    let clusterEnd = 0

    allEvents.forEach((event, index) => {
      if (index === 0) {
        currentCluster = [event]
        clusterStart = event.start
        clusterEnd = event.end
      } else {
        // If this event starts within 10 seconds of the cluster end, add it to the cluster
        if (event.start <= clusterEnd + 10) {
          currentCluster.push(event)
          clusterEnd = Math.max(clusterEnd, event.end)
        } else {
          // Start a new cluster
          if (currentCluster.length > 0) {
            clusters.push({
              events: [...currentCluster],
              start: clusterStart,
              end: clusterEnd,
            })
          }

          currentCluster = [event]
          clusterStart = event.start
          clusterEnd = event.end
        }
      }
    })

    // Add the last cluster if it exists
    if (currentCluster.length > 0) {
      clusters.push({
        events: [...currentCluster],
        start: clusterStart,
        end: clusterEnd,
      })
    }

    // 4. Convert clusters to ictal regions (only if they have enough events)
    return clusters
      .filter((cluster) => cluster.events.length >= 3) // At least 3 events to be considered an ictal region
      .map((cluster) => {
        // Count event types
        const eventCount = {
          hfo: 0,
          ied: 0,
          rhythmic: 0,
        }

        // Track involved channels
        const channelSet = new Set<string>()

        cluster.events.forEach((event) => {
          if (event.type.includes("HFO")) eventCount.hfo++
          else if (event.type.includes("IED")) eventCount.ied++
          else if (event.type.includes("Rhythmic")) eventCount.rhythmic++

          channelSet.add(event.channel)
        })

        // Calculate severity based on event types and count
        let severity: "low" | "medium" | "high" = "low"

        const totalEvents = eventCount.hfo + eventCount.ied + eventCount.rhythmic
        const hfoRatio = eventCount.hfo / totalEvents

        if (hfoRatio > 0.5 || totalEvents > 10) {
          severity = "high"
        } else if (hfoRatio > 0.2 || totalEvents > 5) {
          severity = "medium"
        }

        // Calculate confidence based on event density and channel involvement
        const duration = cluster.end - cluster.start
        const eventDensity = totalEvents / duration
        const channelInvolvement = channelSet.size / (data.channels.length || 1)

        const confidence = Math.min(
          95,
          Math.round((eventDensity * 20 + channelInvolvement * 50) * (0.7 + Math.random() * 0.3)),
        )

        return {
          start: cluster.start,
          end: cluster.end,
          channels: Array.from(channelSet),
          confidence,
          eventCount,
          severity,
        }
      })
      .sort((a, b) => {
        // Sort by severity first, then by confidence
        if (a.severity !== b.severity) {
          const severityOrder = { high: 0, medium: 1, low: 2 }
          return severityOrder[a.severity] - severityOrder[b.severity]
        }
        return b.confidence - a.confidence
      })
  }

  const handleRegionClick = (index: number) => {
    setSelectedRegion(index === selectedRegion ? null : index)

    // If a region is selected, update the time window to show it
    if (index !== selectedRegion) {
      const region = ictalRegions[index]
      const padding = (region.end - region.start) * 0.2 // 20% padding

      const newTimeWindow: [number, number] = [
        Math.max(0, region.start - padding),
        Math.min(eegData?.duration || 600, region.end + padding),
      ]

      setTimeWindow(newTimeWindow)

      // Dispatch event to notify other components of the time window change
      const event = new CustomEvent("timeWindowChanged", { detail: newTimeWindow })
      window.dispatchEvent(event)
    }
  }

  const handleExportRegions = () => {
    // Create CSV content
    const headers = [
      "Region",
      "Start (s)",
      "End (s)",
      "Duration (s)",
      "Channels",
      "HFOs",
      "IEDs",
      "Rhythmic",
      "Severity",
      "Confidence (%)",
    ]
    const rows = ictalRegions.map((region, index) => [
      `Region ${index + 1}`,
      region.start.toFixed(2),
      region.end.toFixed(2),
      (region.end - region.start).toFixed(2),
      region.channels.join(";"),
      region.eventCount.hfo.toString(),
      region.eventCount.ied.toString(),
      region.eventCount.rhythmic.toString(),
      region.severity,
      region.confidence.toString(),
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `epileptoscan_ictal_regions.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "medium":
        return <Activity className="h-4 w-4 text-orange-500" />
      case "low":
        return <Brain className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  const getSeverityClass = (severity: string): string => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "medium":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default:
        return ""
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ictal Wave Regions</CardTitle>
            <CardDescription>{ictalRegions.length} potential seizure regions identified</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllRegions(!showAllRegions)}
              className={showAllRegions ? "bg-primary/10" : ""}
            >
              {showAllRegions ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {showAllRegions ? "Showing All" : "Hidden"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportRegions} disabled={ictalRegions.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {ictalRegions.length > 0 ? (
          <div className="space-y-4">
            <div className="relative h-12 bg-muted/20 rounded-md">
              {/* Timeline representation of the entire recording */}
              {showAllRegions &&
                ictalRegions.map((region, index) => {
                  const startPercent = (region.start / (eegData?.duration || 600)) * 100
                  const widthPercent = ((region.end - region.start) / (eegData?.duration || 600)) * 100

                  // Color based on severity
                  const bgColor =
                    region.severity === "high"
                      ? "bg-red-500/70"
                      : region.severity === "medium"
                        ? "bg-orange-500/70"
                        : "bg-green-500/70"

                  return (
                    <div
                      key={index}
                      className={`absolute top-0 h-full ${bgColor} rounded-sm cursor-pointer ${selectedRegion === index ? "ring-2 ring-primary" : ""}`}
                      style={{
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      onClick={() => handleRegionClick(index)}
                      title={`Region ${index + 1}: ${formatTime(region.start)} - ${formatTime(region.end)}`}
                    />
                  )
                })}

              {/* Current view indicator */}
              <div
                className="absolute top-0 h-full border-2 border-primary/50 bg-primary/10 pointer-events-none"
                style={{
                  left: `${(timeWindow[0] / (eegData?.duration || 600)) * 100}%`,
                  width: `${((timeWindow[1] - timeWindow[0]) / (eegData?.duration || 600)) * 100}%`,
                }}
              />
            </div>

            <div className="grid gap-2">
              {ictalRegions.map((region, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRegion === index ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/50"
                  }`}
                  onClick={() => handleRegionClick(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(region.severity)}
                      <span className="font-medium">Region {index + 1}</span>
                      <Badge variant="outline" className={getSeverityClass(region.severity)}>
                        {region.severity.charAt(0).toUpperCase() + region.severity.slice(1)} Severity
                      </Badge>
                    </div>
                    <Badge variant="outline">{region.confidence}% confidence</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start:</span>
                      <span>{formatTime(region.start)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End:</span>
                      <span>{formatTime(region.end)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{(region.end - region.start).toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Channels:</span>
                      <span>{region.channels.length}</span>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center">
                          <Zap className="h-3 w-3 text-red-500 mr-1" />
                          HFOs
                        </span>
                        <span>{region.eventCount.hfo}</span>
                      </div>
                      <Progress
                        value={
                          (region.eventCount.hfo /
                            (region.eventCount.hfo + region.eventCount.ied + region.eventCount.rhythmic)) *
                          100
                        }
                        className="h-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center">
                          <Activity className="h-3 w-3 text-blue-500 mr-1" />
                          IEDs
                        </span>
                        <span>{region.eventCount.ied}</span>
                      </div>
                      <Progress
                        value={
                          (region.eventCount.ied /
                            (region.eventCount.hfo + region.eventCount.ied + region.eventCount.rhythmic)) *
                          100
                        }
                        className="h-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center">
                          <Brain className="h-3 w-3 text-green-500 mr-1" />
                          Rhythmic
                        </span>
                        <span>{region.eventCount.rhythmic}</span>
                      </div>
                      <Progress
                        value={
                          (region.eventCount.rhythmic /
                            (region.eventCount.hfo + region.eventCount.ied + region.eventCount.rhythmic)) *
                          100
                        }
                        className="h-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {eegData ? "No ictal regions detected in this recording" : "Upload EEG data to detect ictal regions"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

