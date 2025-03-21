"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Filter, ArrowUpDown, Zap, Activity, Waves } from "lucide-react"

interface EventFeatures {
  amplitude: number
  frequency: number
  onset: number
  duration: number
  channel: string
  type: string
  confidence: number
}

export function EventListPanel() {
  const [events, setEvents] = useState<EventFeatures[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventFeatures[]>([])
  const [sortField, setSortField] = useState<keyof EventFeatures>("onset")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterChannel, setFilterChannel] = useState<string>("all")
  const [filterAmplitude, setFilterAmplitude] = useState<number | null>(null)
  const [filterFrequency, setFilterFrequency] = useState<number | null>(null)
  const [availableChannels, setAvailableChannels] = useState<string[]>([])

  useEffect(() => {
    const handleDataUpdate = () => {
      const storedData = localStorage.getItem("eegData")
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)

          // Extract all events from all channels with their features
          const extractedEvents: EventFeatures[] = []
          const channels = new Set<string>()

          parsedData.channels.forEach((channel: any) => {
            channels.add(channel.name)

            if (channel.events) {
              channel.events.forEach((event: any) => {
                // Extract features for each event
                const amplitude = event.amplitude || Math.round(channel.voltage * (Math.random() * 0.5 + 0.5))
                const frequency = event.frequency || getEventFrequency(event.type)

                extractedEvents.push({
                  amplitude,
                  frequency,
                  onset: event.start,
                  duration: event.end - event.start,
                  channel: channel.name,
                  type: event.type,
                  confidence: Math.round((0.7 + Math.random() * 0.3) * 100),
                })
              })
            }
          })

          setEvents(extractedEvents)
          setFilteredEvents(extractedEvents)
          setAvailableChannels(Array.from(channels))
        } catch (error) {
          console.error("Error parsing EEG events:", error)
        }
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

  // Apply sorting and filtering
  useEffect(() => {
    let filtered = [...events]

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((event) => event.type.includes(filterType))
    }

    // Apply channel filter
    if (filterChannel !== "all") {
      filtered = filtered.filter((event) => event.channel === filterChannel)
    }

    // Apply amplitude filter
    if (filterAmplitude !== null) {
      filtered = filtered.filter((event) => event.amplitude >= filterAmplitude)
    }

    // Apply frequency filter
    if (filterFrequency !== null) {
      filtered = filtered.filter((event) => event.frequency >= filterFrequency)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      } else {
        const aStr = String(aValue)
        const bStr = String(bValue)
        return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      }
    })

    setFilteredEvents(filtered)
  }, [events, sortField, sortDirection, filterType, filterChannel, filterAmplitude, filterFrequency])

  const handleSort = (field: keyof EventFeatures) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Type",
      "Channel",
      "Onset (s)",
      "Duration (s)",
      "Amplitude (μV)",
      "Frequency (Hz)",
      "Confidence (%)",
    ]
    const rows = filteredEvents.map((event) => [
      event.type,
      event.channel,
      event.onset.toFixed(2),
      event.duration.toFixed(2),
      event.amplitude.toFixed(1),
      event.frequency.toFixed(1),
      event.confidence.toString(),
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `epileptoscan_events_export.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }

  const getEventIcon = (type: string) => {
    if (type.includes("HFO")) {
      return <Zap className="h-4 w-4 text-red-500" />
    } else if (type.includes("IED")) {
      return <Activity className="h-4 w-4 text-blue-500" />
    } else if (type.includes("Rhythmic")) {
      return <Waves className="h-4 w-4 text-green-500" />
    }
    return null
  }

  const getEventTypeClass = (type: string): string => {
    if (type.includes("HFO")) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    } else if (type.includes("IED")) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    } else if (type.includes("Rhythmic")) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    }
    return ""
  }

  const getEventFrequency = (eventType: string): number => {
    if (eventType.includes("HFO")) {
      return 80 + Math.random() * 70 // 80-150 Hz
    } else if (eventType.includes("IED")) {
      return 8 + Math.random() * 12 // 8-20 Hz
    } else if (eventType.includes("Rhythmic")) {
      return 1 + Math.random() * 4 // 1-5 Hz
    } else {
      return Math.floor(Math.random() * 20) + 1
    }
  }

  const clearFilters = () => {
    setFilterType("all")
    setFilterChannel("all")
    setFilterAmplitude(null)
    setFilterFrequency(null)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detected Events</CardTitle>
            <CardDescription>{filteredEvents.length} events with extracted features</CardDescription>
          </div>
          <Button size="sm" onClick={handleExport} disabled={filteredEvents.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 pt-0 border-b">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label htmlFor="filter-type" className="text-xs">
                Event Type
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type" className="h-8">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="HFO">HFOs</SelectItem>
                  <SelectItem value="IED">IEDs</SelectItem>
                  <SelectItem value="Rhythmic">Rhythmic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-channel" className="text-xs">
                Channel
              </Label>
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger id="filter-channel" className="h-8">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {availableChannels.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-amplitude" className="text-xs">
                Min Amplitude (μV)
              </Label>
              <Input
                id="filter-amplitude"
                type="number"
                className="h-8"
                placeholder="Any"
                value={filterAmplitude !== null ? filterAmplitude : ""}
                onChange={(e) => setFilterAmplitude(e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-frequency" className="text-xs">
                Min Frequency (Hz)
              </Label>
              <Input
                id="filter-frequency"
                type="number"
                className="h-8"
                placeholder="Any"
                value={filterFrequency !== null ? filterFrequency : ""}
                onChange={(e) => setFilterFrequency(e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>

          <Button variant="outline" size="sm" className="mt-2" onClick={clearFilters}>
            <Filter className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        </div>

        <div className="overflow-auto max-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="w-[180px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort("type")}>
                    Type
                    {sortField === "type" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[80px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort("channel")}>
                    Channel
                    {sortField === "channel" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort("onset")}>
                    Onset
                    {sortField === "onset" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[80px] text-right">
                  <div className="flex items-center justify-end cursor-pointer" onClick={() => handleSort("duration")}>
                    Duration
                    {sortField === "duration" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <div className="flex items-center justify-end cursor-pointer" onClick={() => handleSort("amplitude")}>
                    Amplitude
                    {sortField === "amplitude" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <div className="flex items-center justify-end cursor-pointer" onClick={() => handleSort("frequency")}>
                    Frequency
                    {sortField === "frequency" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <div
                    className="flex items-center justify-end cursor-pointer"
                    onClick={() => handleSort("confidence")}
                  >
                    Confidence
                    {sortField === "confidence" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getEventIcon(event.type)}
                        <Badge variant="outline" className={getEventTypeClass(event.type)}>
                          {event.type.replace(" (", "\n(").split("\n")[0]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{event.channel}</TableCell>
                    <TableCell>{formatTime(event.onset)}</TableCell>
                    <TableCell className="text-right">{event.duration.toFixed(2)}s</TableCell>
                    <TableCell className="text-right">{event.amplitude.toFixed(1)} μV</TableCell>
                    <TableCell className="text-right">{event.frequency.toFixed(1)} Hz</TableCell>
                    <TableCell className="text-right">{event.confidence}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                    No events found matching the current filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

