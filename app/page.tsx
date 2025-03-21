import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { FileUploadCard } from "@/components/file-upload-card"
import { EegVisualizationPanel } from "@/components/eeg-visualization-panel"
import { AnalysisPanel } from "@/components/analysis-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { EventListPanel } from "@/components/event-list-panel"
import { IctalRegionsPanel } from "@/components/ictal-regions-panel"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="EpileptoScan AI"
        description="Advanced analysis of EEG data for epileptic activity detection"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FileUploadCard className="md:col-span-2 lg:col-span-3" />
      </div>
      <div className="grid gap-4 md:grid-cols-7">
        <div className="space-y-4 md:col-span-5">
          <EegVisualizationPanel />
          <IctalRegionsPanel />
          <EventListPanel />
        </div>
        <div className="space-y-4 md:col-span-2">
          <AnalysisPanel />
          <SettingsPanel />
        </div>
      </div>
    </DashboardShell>
  )
}

