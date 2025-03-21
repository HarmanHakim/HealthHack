"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, AlertCircle, FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { processEegData } from "@/lib/eeg-processor"

interface FileUploadCardProps {
  className?: string
}

export function FileUploadCard({ className }: FileUploadCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".mat")) {
      toast({
        title: "Invalid file format",
        description: "Please upload a .mat file containing EEG data.",
        variant: "destructive",
      })
      return
    }

    setFileName(file.name)
    setFileSize(formatFileSize(file.size))
    setIsLoading(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const processedData = await processEegData(arrayBuffer)

      // Store the processed data in localStorage for the visualization component to use
      localStorage.setItem("eegData", JSON.stringify(processedData))

      // Dispatch a custom event to notify the visualization component
      window.dispatchEvent(new Event("eegDataUpdated"))

      toast({
        title: "File processed successfully",
        description: `Loaded ${processedData.channels.length} channels with ${formatSampleCount(processedData.channels[0]?.data.length || 0)} samples.`,
      })
    } catch (error) {
      console.error("Error processing file:", error)
      toast({
        title: "Error processing file",
        description: "There was an error processing your EEG data file.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatSampleCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(2) + "M"
    } else if (count >= 1000) {
      return (count / 1000).toFixed(2) + "K"
    }
    return count.toString()
  }

  const handleLoadDemo = async () => {
    setIsLoading(true)
    setFileName("demo_eeg_data.mat")
    setFileSize("2.5 MB")

    try {
      // Create demo data
      const demoData = createDemoData()

      // Store the demo data in localStorage
      localStorage.setItem("eegData", JSON.stringify(demoData))

      // Dispatch a custom event to notify the visualization component
      window.dispatchEvent(new Event("eegDataUpdated"))

      toast({
        title: "Demo data loaded",
        description: `Loaded ${demoData.channels.length} channels with ${formatSampleCount(demoData.channels[0]?.data.length || 0)} samples.`,
      })
    } catch (error) {
      console.error("Error loading demo data:", error)
      toast({
        title: "Error loading demo data",
        description: "There was an error loading the demo EEG data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Upload EEG Data</CardTitle>
        <CardDescription>Upload your .mat file containing EEG data for analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="relative flex flex-col items-center justify-center rounded-lg border border-dashed p-6 transition-colors hover:border-primary/50">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="bg-primary/10 p-3 rounded-full">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{fileName ? fileName : "Drag & drop or click to upload"}</p>
                <p className="text-xs text-muted-foreground">Supports .mat files containing EEG data</p>
                {fileSize && <p className="text-xs text-muted-foreground">File size: {fileSize}</p>}
              </div>
            </div>
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
              accept=".mat"
              disabled={isLoading}
            />
          </div>

          {fileName && (
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4" />
              <span>{fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                disabled={isLoading}
                onClick={() => {
                  setFileName(null)
                  setFileSize(null)
                  localStorage.removeItem("eegData")
                  window.dispatchEvent(new Event("eegDataUpdated"))
                }}
              >
                Remove
              </Button>
            </div>
          )}

          <Alert variant="outline" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The EEG data will be processed in your browser and not sent to any server.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleLoadDemo} disabled={isLoading}>
          <FileUp className="mr-2 h-4 w-4" />
          Load Demo Data
        </Button>
        <Button disabled={!fileName || isLoading}>Analyze Data</Button>
      </CardFooter>
    </Card>
  )
}

function createDemoData() {
  // This is a placeholder that will be replaced by the actual implementation
  // in the eeg-processor.ts file
  return {
    channels: [],
    sampleRate: 250,
    duration: 600,
  }
}

