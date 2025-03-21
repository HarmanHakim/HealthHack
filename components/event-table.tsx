"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface EegEvent {
  location: string
  timestamp: string
  class: string
  duration: number
  frequency: number
  amplitude: number
}

export function EventTable() {
  const [events, setEvents] = useState<EegEvent[]>([])

  useEffect(() => {
    // Load events from localStorage when component mounts or when data is updated
    const handleDataUpdate = () => {
      const storedData = localStorage.getItem("eegData")
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)

          if (parsedData.channels && Array.isArray(parsedData.channels)) {
            // Extract events from all channels
            const allEvents: EegEvent[] = []

            parsedData.channels.forEach((channel: any) => {
              if (channel.events && Array.isArray(channel.events)) {
                channel.events.forEach((event: any) => {
                  // Convert event to table format
                  allEvents.push({
                    location: channel.name,
                    timestamp: formatTimestamp(event.start),
                    class: event.type,
                    duration: Number.parseFloat((event.end - event.start).toFixed(2)),
                    frequency: getEventFrequency(event.type),
                    amplitude: Math.round(channel.voltage * (Math.random() * 0.5 + 0.5)), // Random amplitude based on channel voltage
                  })
                })
              }
            })

            // Sort events by timestamp
            allEvents.sort((a, b) => {
              return a.timestamp.localeCompare(b.timestamp)
            })

            setEvents(allEvents)
          } else {
            setEvents(createDemoEvents())
          }
        } catch (error) {
          console.error("Error parsing EEG events:", error)
          setEvents(createDemoEvents())
        }
      } else {
        // Create demo events if no data is available
        setEvents(createDemoEvents())
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

  return (
    <div className="overflow-auto max-h-[600px]">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead className="w-12">Loc</TableHead>
            <TableHead className="w-20">Timestamp</TableHead>
            <TableHead>Class</TableHead>
            <TableHead className="text-right w-14">Dur. (s)</TableHead>
            <TableHead className="text-right w-14">Freq. (Hz)</TableHead>
            <TableHead className="text-right w-14">Amp. (μV)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event, index) => (
            <TableRow key={index}>
              <TableCell className={getLocationClass(event.location)}>{event.location}</TableCell>
              <TableCell className={getClassColor(event.class)}>{event.timestamp}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`${getClassColor(event.class)} font-normal`}>
                  {event.class}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{event.duration}</TableCell>
              <TableCell className="text-right">{event.frequency}</TableCell>
              <TableCell className="text-right">{event.amplitude}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function getEventFrequency(eventType: string): number {
  if (eventType.includes("HFO")) {
    return 150
  } else if (eventType.includes("IED")) {
    return 12
  } else if (eventType.includes("Rhythmic")) {
    return 2
  } else {
    return Math.floor(Math.random() * 20) + 1
  }
}

function getLocationClass(location: string): string {
  if (location.startsWith("F")) {
    return "text-green-600 font-medium"
  } else if (location.startsWith("C")) {
    return "text-blue-600 font-medium"
  } else {
    return "font-medium"
  }
}

function getClassColor(className: string): string {
  if (className.includes("HFO")) {
    return "text-red-600"
  } else if (className.includes("IED")) {
    return "text-blue-600"
  } else if (className.includes("Rhythmic")) {
    return "text-green-600"
  } else {
    return ""
  }
}

function createDemoEvents(): Array<{
  location: string
  timestamp: string
  class: string
  duration: number
  frequency: number
  amplitude: number
}> {
  const locations = [
    "F5",
    "Fp1",
    "C4",
    "F5",
    "C4",
    "F5",
    "C4",
    "F5",
    "Fp1",
    "F5",
    "C4",
    "F5",
    "Fp1",
    "F5",
    "Fp1",
    "C4",
    "F5",
    "Fp1",
    "F5",
    "Fp1",
  ]
  const classes = [
    "Rhythmic Discharge",
    "HFO (High Frequency Oscillation)",
    "IED (Intractal Epileptiform Discharge)",
    "Rhythmic Discharge",
    "IED (Intractal Epileptiform Discharge)",
    "Rhythmic Discharge",
    "IED (Intractal Epileptiform Discharge)",
    "Rhythmic Discharge",
    "HFO (High Frequency Oscillation)",
    "Rhythmic Discharge",
    "IED (Intractal Epileptiform Discharge)",
    "Rhythmic Discharge",
    "HFO (High Frequency Oscillation)",
    "Rhythmic Discharge",
    "HFO (High Frequency Oscillation)",
    "IED (Intractal Epileptiform Discharge)",
    "Rhythmic Discharge",
    "HFO (High Frequency Oscillation)",
    "Rhythmic Discharge",
    "HFO (High Frequency Oscillation)",
  ]

  const timestamps = [
    "1:42:44",
    "0:26:12",
    "0:12:36",
    "1:42:44",
    "0:12:36",
    "1:42:44",
    "0:12:36",
    "1:42:44",
    "0:26:12",
    "1:42:44",
    "0:12:36",
    "1:42:44",
    "0:26:12",
    "1:42:44",
    "0:26:12",
    "0:12:36",
    "1:42:44",
    "0:26:12",
    "1:42:44",
    "0:26:12",
  ]

  const durations = [
    3.1, 0.13, 0.08, 3.1, 0.08, 3.1, 0.08, 3.1, 0.13, 3.1, 0.08, 3.1, 0.13, 3.1, 0.13, 0.08, 3.1, 0.13, 3.1, 0.13,
  ]
  const frequencies = [2, 150, 12, 2, 12, 2, 12, 2, 150, 2, 12, 2, 150, 2, 150, 12, 2, 150, 2, 150]
  const amplitudes = [38, 38, 36, 36, 34, 34, 34, 32, 33, 32, 31, 28, 28, 27, 26, 24, 23, 21, 20, 18]

  return locations.map((loc, index) => ({
    location: loc,
    timestamp: timestamps[index],
    class: classes[index],
    duration: durations[index],
    frequency: frequencies[index],
    amplitude: amplitudes[index],
  }))
}

