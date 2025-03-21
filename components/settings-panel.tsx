"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Settings, Save, RotateCcw, Download } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsPanel() {
  const [settings, setSettings] = useState({
    visualization: {
      showGrid: true,
      showEvents: true,
      showLabels: true,
      amplitudeScale: 1.0,
      timeScale: 1.0,
      theme: "light",
    },
    filtering: {
      filterType: "none",
      filterFrequency: 50,
      notchFilter: true,
      baselineCorrection: true,
    },
    detection: {
      hfoThreshold: 0.7,
      iedThreshold: 0.6,
      rhythmicThreshold: 0.5,
      minEventDuration: 0.1,
      maxEventDuration: 5.0,
    },
    export: {
      includeRawData: true,
      includeEvents: true,
      includeFeatures: true,
      format: "json",
    },
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedSettings = localStorage.getItem("eegSettings")
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings))
      } catch (error) {
        console.error("Error parsing settings:", error)
      }
    }
  }, [])

  const handleSwitchChange = (category: keyof typeof settings, key: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: !prev[category as keyof typeof prev][key as keyof (typeof prev)[keyof typeof prev]],
      },
    }))
  }

  const handleSliderChange = (category: keyof typeof settings, key: string, value: number[]) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value[0],
      },
    }))
  }

  const handleSelectChange = (category: keyof typeof settings, key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }))
  }

  const handleResetSettings = () => {
    setSettings({
      visualization: {
        showGrid: true,
        showEvents: true,
        showLabels: true,
        amplitudeScale: 1.0,
        timeScale: 1.0,
        theme: "light",
      },
      filtering: {
        filterType: "none",
        filterFrequency: 50,
        notchFilter: true,
        baselineCorrection: true,
      },
      detection: {
        hfoThreshold: 0.7,
        iedThreshold: 0.6,
        rhythmicThreshold: 0.5,
        minEventDuration: 0.1,
        maxEventDuration: 5.0,
      },
      export: {
        includeRawData: true,
        includeEvents: true,
        includeFeatures: true,
        format: "json",
      },
    })
  }

  const handleSaveSettings = () => {
    localStorage.setItem("eegSettings", JSON.stringify(settings))

    // Dispatch event to notify other components
    window.dispatchEvent(new Event("eegSettingsUpdated"))
  }

  const handleExportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "epileptoscan_settings.json"
    document.body.appendChild(a)
    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure analysis and visualization parameters</CardDescription>
          </div>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visualization">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
            <TabsTrigger value="detection">Detection</TabsTrigger>
            <TabsTrigger value="filtering">Filtering</TabsTrigger>
          </TabsList>

          <TabsContent value="visualization" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-grid" className="text-sm">
                  Show Grid
                </Label>
                <Switch
                  id="show-grid"
                  checked={settings.visualization.showGrid}
                  onCheckedChange={() => handleSwitchChange("visualization", "showGrid")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-events" className="text-sm">
                  Show Events
                </Label>
                <Switch
                  id="show-events"
                  checked={settings.visualization.showEvents}
                  onCheckedChange={() => handleSwitchChange("visualization", "showEvents")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-labels" className="text-sm">
                  Show Labels
                </Label>
                <Switch
                  id="show-labels"
                  checked={settings.visualization.showLabels}
                  onCheckedChange={() => handleSwitchChange("visualization", "showLabels")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Amplitude Scale</Label>
              <Slider
                value={[settings.visualization.amplitudeScale]}
                min={0.1}
                max={3}
                step={0.1}
                onValueChange={(value) => handleSliderChange("visualization", "amplitudeScale", value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.1x</span>
                <span>{settings.visualization.amplitudeScale}x</span>
                <span>3.0x</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Time Scale</Label>
              <Slider
                value={[settings.visualization.timeScale]}
                min={0.1}
                max={3}
                step={0.1}
                onValueChange={(value) => handleSliderChange("visualization", "timeScale", value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.1x</span>
                <span>{settings.visualization.timeScale}x</span>
                <span>3.0x</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme" className="text-sm">
                Theme
              </Label>
              <Select
                value={settings.visualization.theme}
                onValueChange={(value) => handleSelectChange("visualization", "theme", value)}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="detection" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">HFO Detection Threshold</Label>
              <Slider
                value={[settings.detection.hfoThreshold]}
                min={0.1}
                max={1.0}
                step={0.05}
                onValueChange={(value) => handleSliderChange("detection", "hfoThreshold", value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Sensitivity</span>
                <span>{settings.detection.hfoThreshold}</span>
                <span>High Sensitivity</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">IED Detection Threshold</Label>
              <Slider
                value={[settings.detection.iedThreshold]}
                min={0.1}
                max={1.0}
                step={0.05}
                onValueChange={(value) => handleSliderChange("detection", "iedThreshold", value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Sensitivity</span>
                <span>{settings.detection.iedThreshold}</span>
                <span>High Sensitivity</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Rhythmic Discharge Threshold</Label>
              <Slider
                value={[settings.detection.rhythmicThreshold]}
                min={0.1}
                max={1.0}
                step={0.05}
                onValueChange={(value) => handleSliderChange("detection", "rhythmicThreshold", value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Sensitivity</span>
                <span>{settings.detection.rhythmicThreshold}</span>
                <span>High Sensitivity</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Event Duration Limits (seconds)</Label>
              <Slider
                value={[settings.detection.minEventDuration, settings.detection.maxEventDuration]}
                min={0.05}
                max={10}
                step={0.05}
                onValueChange={(value) => {
                  if (value.length === 2) {
                    setSettings((prev) => ({
                      ...prev,
                      detection: {
                        ...prev.detection,
                        minEventDuration: value[0],
                        maxEventDuration: value[1],
                      },
                    }))
                  }
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {settings.detection.minEventDuration}s</span>
                <span>Max: {settings.detection.maxEventDuration}s</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="filtering" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-type" className="text-sm">
                Filter Type
              </Label>
              <Select
                value={settings.filtering.filterType}
                onValueChange={(value) => handleSelectChange("filtering", "filterType", value)}
              >
                <SelectTrigger id="filter-type">
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="lowpass">Low Pass</SelectItem>
                  <SelectItem value="highpass">High Pass</SelectItem>
                  <SelectItem value="bandpass">Band Pass</SelectItem>
                  <SelectItem value="notch">Notch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.filtering.filterType !== "none" && (
              <div className="space-y-2">
                <Label className="text-sm">Filter Frequency (Hz)</Label>
                <Slider
                  value={[settings.filtering.filterFrequency]}
                  min={1}
                  max={200}
                  step={1}
                  onValueChange={(value) => handleSliderChange("filtering", "filterFrequency", value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 Hz</span>
                  <span>{settings.filtering.filterFrequency} Hz</span>
                  <span>200 Hz</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="notch-filter" className="text-sm">
                60Hz Notch Filter
              </Label>
              <Switch
                id="notch-filter"
                checked={settings.filtering.notchFilter}
                onCheckedChange={() => handleSwitchChange("filtering", "notchFilter")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="baseline-correction" className="text-sm">
                Baseline Correction
              </Label>
              <Switch
                id="baseline-correction"
                checked={settings.filtering.baselineCorrection}
                onCheckedChange={() => handleSwitchChange("filtering", "baselineCorrection")}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handleResetSettings}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSettings}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
          <Button size="sm" onClick={handleSaveSettings}>
            <Save className="h-4 w-4 mr-1" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

