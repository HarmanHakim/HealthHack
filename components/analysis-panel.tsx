"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Activity, Zap, AlertTriangle, Waves } from "lucide-react"

export function AnalysisPanel() {
  const [eegData, setEegData] = useState<any>(null)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    const handleDataUpdate = () => {
      const storedData = localStorage.getItem("eegData")
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          setEegData(parsedData)

          // Reset analysis results when new data is loaded
          setAnalysisResults(null)

          // Simulate analysis process
          setIsAnalyzing(true)
          setTimeout(() => {
            const results = generateAnalysisResults(parsedData)
            setAnalysisResults(results)

            // Store ictal regions in localStorage for other components to use
            localStorage.setItem("ictalRegions", JSON.stringify(results.ictalRegions))

            setIsAnalyzing(false)
          }, 2000)
        } catch (error) {
          console.error("Error parsing EEG data:", error)
        }
      } else {
        setEegData(null)
        setAnalysisResults(null)
        localStorage.removeItem("ictalRegions")
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

  if (!eegData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
          <CardDescription>Upload EEG data to see analysis results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No EEG data available for analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
          <CardDescription>Analyzing EEG data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">Preprocessing data...</p>
              <Progress value={100} />
            </div>
            <div className="space-y-2">
              <p className="text-sm">Identifying ictal regions...</p>
              <Progress value={80} />
            </div>
            <div className="space-y-2">
              <p className="text-sm">Detecting patterns...</p>
              <Progress value={60} />
            </div>
            <div className="space-y-2">
              <p className="text-sm">Extracting features...</p>
              <Progress value={40} />
            </div>
            <div className="space-y-2">
              <p className="text-sm">Classifying events...</p>
              <Progress value={20} />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Analysis Results</CardTitle>
        <CardDescription>Pattern detection and feature extraction</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="regions">Regions</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/20 p-3 rounded-lg">
                <div className="text-2xl font-bold">{analysisResults?.patternCounts.total}</div>
                <div className="text-xs text-muted-foreground">Total Patterns</div>
              </div>
              <div className="bg-muted/20 p-3 rounded-lg">
                <div className="text-2xl font-bold">{analysisResults?.ictalRegions.length}</div>
                <div className="text-xs text-muted-foreground">Ictal Regions</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Pattern Distribution</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center">
                      <Zap className="h-3 w-3 text-red-500 mr-1" />
                      HFOs
                    </span>
                    <span>{analysisResults?.patternCounts.hfo} patterns</span>
                  </div>
                  <Progress value={analysisResults?.patternPercentages.hfo} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center">
                      <Activity className="h-3 w-3 text-blue-500 mr-1" />
                      IEDs
                    </span>
                    <span>{analysisResults?.patternCounts.ied} patterns</span>
                  </div>
                  <Progress value={analysisResults?.patternPercentages.ied} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center">
                      <Waves className="h-3 w-3 text-green-500 mr-1" />
                      Rhythmic
                    </span>
                    <span>{analysisResults?.patternCounts.rhythmic} patterns</span>
                  </div>
                  <Progress value={analysisResults?.patternPercentages.rhythmic} className="h-2" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Epileptic Activity</h4>
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-full ${analysisResults?.epilepsyRisk > 70 ? "bg-red-100" : analysisResults?.epilepsyRisk > 30 ? "bg-yellow-100" : "bg-green-100"}`}
                >
                  {analysisResults?.epilepsyRisk > 70 ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : analysisResults?.epilepsyRisk > 30 ? (
                    <Activity className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Brain className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {analysisResults?.epilepsyRisk > 70
                      ? "High"
                      : analysisResults?.epilepsyRisk > 30
                        ? "Moderate"
                        : "Low"}{" "}
                    epileptic activity
                  </div>
                  <div className="text-xs text-muted-foreground">{analysisResults?.epilepsyRisk}% risk score</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Feature Extraction Results</h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/20 p-3 rounded-lg">
                  <div className="text-lg font-bold">{analysisResults?.featureStats.avgAmplitude.toFixed(1)} μV</div>
                  <div className="text-xs text-muted-foreground">Average Amplitude</div>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg">
                  <div className="text-lg font-bold">{analysisResults?.featureStats.avgFrequency.toFixed(1)} Hz</div>
                  <div className="text-xs text-muted-foreground">Average Frequency</div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="text-xs font-medium">Pattern Features by Type</h4>

                <div className="space-y-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">HFOs</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amplitude:</span>
                        <span>{analysisResults?.featuresByType.hfo.amplitude.toFixed(1)} μV</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency:</span>
                        <span>{analysisResults?.featuresByType.hfo.frequency.toFixed(1)} Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{analysisResults?.featuresByType.hfo.duration.toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Count:</span>
                        <span>{analysisResults?.patternCounts.hfo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">IEDs</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amplitude:</span>
                        <span>{analysisResults?.featuresByType.ied.amplitude.toFixed(1)} μV</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency:</span>
                        <span>{analysisResults?.featuresByType.ied.frequency.toFixed(1)} Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{analysisResults?.featuresByType.ied.duration.toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Count:</span>
                        <span>{analysisResults?.patternCounts.ied}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Waves className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Rhythmic Discharges</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amplitude:</span>
                        <span>{analysisResults?.featuresByType.rhythmic.amplitude.toFixed(1)} μV</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency:</span>
                        <span>{analysisResults?.featuresByType.rhythmic.frequency.toFixed(1)} Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{analysisResults?.featuresByType.rhythmic.duration.toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Count:</span>
                        <span>{analysisResults?.patternCounts.rhythmic}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="regions" className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Ictal Wave Regions</h4>

              {analysisResults?.ictalRegions.length > 0 ? (
                <div className="space-y-2">
                  {analysisResults?.ictalRegions.slice(0, 3).map((region: any, index: number) => (
                    <div key={index} className="p-2 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          {region.severity === "high" ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : region.severity === "medium" ? (
                            <Activity className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Brain className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm font-medium">Region {index + 1}</span>
                        </div>
                        <Badge variant="outline">{region.confidence}% confidence</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start:</span>
                          <span>{formatTime(region.start)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{(region.end - region.start).toFixed(1)}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Channels:</span>
                          <span>{region.channels.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Events:</span>
                          <span>{region.eventCount.hfo + region.eventCount.ied + region.eventCount.rhythmic}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {analysisResults?.ictalRegions.length > 3 && (
                    <div className="text-xs text-center text-muted-foreground mt-1">
                      + {analysisResults?.ictalRegions.length - 3} more regions
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No ictal regions detected in this recording</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function generateAnalysisResults(eegData: any) {
  // Count patterns by type
  const patternCounts = {
    hfo: 0,
    ied: 0,
    rhythmic: 0,
    total: 0,
  }

  // Extract all events from all channels with their features
  const allEvents: Array<{
    type: string
    channel: string
    amplitude: number
    frequency: number
    duration: number
    confidence: number
  }> = []

  eegData.channels.forEach((channel: any) => {
    if (channel.events) {
      channel.events.forEach((event: any) => {
        // Count by type
        if (event.type.includes("HFO")) {
          patternCounts.hfo++
        } else if (event.type.includes("IED")) {
          patternCounts.ied++
        } else if (event.type.includes("Rhythmic")) {
          patternCounts.rhythmic++
        }

        // Generate features for each event
        const amplitude = event.amplitude || Math.round(channel.voltage * (Math.random() * 0.5 + 0.5))
        let frequency = 0

        if (event.type.includes("HFO")) {
          frequency = 80 + Math.random() * 70 // 80-150 Hz
        } else if (event.type.includes("IED")) {
          frequency = 8 + Math.random() * 12 // 8-20 Hz
        } else if (event.type.includes("Rhythmic")) {
          frequency = 1 + Math.random() * 4 // 1-5 Hz
        }

        // Add to all events with additional info
        allEvents.push({
          type: event.type,
          channel: channel.name,
          amplitude,
          frequency,
          duration: event.end - event.start,
          confidence: Math.round((0.7 + Math.random() * 0.3) * 100),
        })
      })
    }
  })

  patternCounts.total = patternCounts.hfo + patternCounts.ied + patternCounts.rhythmic

  // Calculate percentages
  const patternPercentages = {
    hfo: patternCounts.total > 0 ? (patternCounts.hfo / patternCounts.total) * 100 : 0,
    ied: patternCounts.total > 0 ? (patternCounts.ied / patternCounts.total) * 100 : 0,
    rhythmic: patternCounts.total > 0 ? (patternCounts.rhythmic / patternCounts.total) * 100 : 0,
  }

  // Calculate average features by type
  const hfoEvents = allEvents.filter((e) => e.type.includes("HFO"))
  const iedEvents = allEvents.filter((e) => e.type.includes("IED"))
  const rhythmicEvents = allEvents.filter((e) => e.type.includes("Rhythmic"))

  const featuresByType = {
    hfo: {
      amplitude: hfoEvents.length > 0 ? hfoEvents.reduce((sum, e) => sum + e.amplitude, 0) / hfoEvents.length : 0,
      frequency: hfoEvents.length > 0 ? hfoEvents.reduce((sum, e) => sum + e.frequency, 0) / hfoEvents.length : 0,
      duration: hfoEvents.length > 0 ? hfoEvents.reduce((sum, e) => sum + e.duration, 0) / hfoEvents.length : 0,
    },
    ied: {
      amplitude: iedEvents.length > 0 ? iedEvents.reduce((sum, e) => sum + e.amplitude, 0) / iedEvents.length : 0,
      frequency: iedEvents.length > 0 ? iedEvents.reduce((sum, e) => sum + e.frequency, 0) / iedEvents.length : 0,
      duration: iedEvents.length > 0 ? iedEvents.reduce((sum, e) => sum + e.duration, 0) / iedEvents.length : 0,
    },
    rhythmic: {
      amplitude:
        rhythmicEvents.length > 0 ? rhythmicEvents.reduce((sum, e) => sum + e.amplitude, 0) / rhythmicEvents.length : 0,
      frequency:
        rhythmicEvents.length > 0 ? rhythmicEvents.reduce((sum, e) => sum + e.frequency, 0) / rhythmicEvents.length : 0,
      duration:
        rhythmicEvents.length > 0 ? rhythmicEvents.reduce((sum, e) => sum + e.duration, 0) / rhythmicEvents.length : 0,
    },
  }

  // Calculate overall feature statistics
  const featureStats = {
    avgAmplitude: allEvents.length > 0 ? allEvents.reduce((sum, e) => sum + e.amplitude, 0) / allEvents.length : 0,
    avgFrequency: allEvents.length > 0 ? allEvents.reduce((sum, e) => sum + e.frequency, 0) / allEvents.length : 0,
    avgDuration: allEvents.length > 0 ? allEvents.reduce((sum, e) => sum + e.duration, 0) / allEvents.length : 0,
    maxAmplitude: allEvents.length > 0 ? Math.max(...allEvents.map((e) => e.amplitude)) : 0,
    maxFrequency: allEvents.length > 0 ? Math.max(...allEvents.map((e) => e.frequency)) : 0,
  }

  // Generate ictal regions
  const ictalRegions = identifyIctalRegions(eegData)

  // Calculate epilepsy risk score (0-100)
  // Higher if more HFOs, IEDs, and ictal regions
  const hfoWeight = 0.4
  const iedWeight = 0.3
  const rhythmicWeight = 0.1
  const ictalWeight = 0.2

  const maxPatterns = 50 // Normalize pattern counts
  const normalizedHfo = Math.min(patternCounts.hfo / maxPatterns, 1)
  const normalizedIed = Math.min(patternCounts.ied / maxPatterns, 1)
  const normalizedRhythmic = Math.min(patternCounts.rhythmic / maxPatterns, 1)
  const normalizedIctal = Math.min(ictalRegions.length / 5, 1)

  const epilepsyRisk = Math.round(
    (normalizedHfo * hfoWeight +
      normalizedIed * iedWeight +
      normalizedRhythmic * rhythmicWeight +
      normalizedIctal * ictalWeight) *
      100,
  )

  return {
    patternCounts,
    patternPercentages,
    featuresByType,
    featureStats,
    ictalRegions,
    epilepsyRisk,
  }
}

function identifyIctalRegions(data: any) {
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

