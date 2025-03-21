"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { processEegData } from "@/lib/eeg-processor"

export function FileUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".mat") && !file.name.endsWith(".edf")) {
      toast({
        title: "Invalid file format",
        description: "Please upload a .mat or .edf file containing EEG data.",
        variant: "destructive",
      })
      return
    }

    setFileName(file.name)
    setIsLoading(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const processedData = await processEegData(arrayBuffer)

      // Store the processed data in localStorage for the visualization component to use
      localStorage.setItem("eegData", JSON.stringify(processedData))

      // Dispatch a custom event to notify the visualization component
      window.dispatchEvent(new Event("eegDataUpdated"))

      toast({
        title: "File uploaded successfully",
        description: "Your EEG data is ready for visualization.",
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 transition-colors hover:border-primary/50">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="bg-primary/10 p-2 rounded-full">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{fileName ? fileName : "Drag & drop or click to upload"}</p>
            <p className="text-xs text-muted-foreground">Supports .mat and .edf files containing EEG data</p>
          </div>
        </div>
        <input
          type="file"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={handleFileChange}
          accept=".mat,.edf"
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
  )
}

