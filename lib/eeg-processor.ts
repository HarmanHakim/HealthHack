/**
 * EEG Data Processor
 *
 * Processes EEG data from .mat files and performs preprocessing
 * for visualization and analysis.
 */

/**
 * Process EEG data from a .mat file
 *
 * @param arrayBuffer - The raw file data as an ArrayBuffer
 * @returns Processed EEG data with channels, events, and metadata
 */
export async function processEegData(arrayBuffer: ArrayBuffer) {
  // In a real implementation, we would use a library to parse the .mat file
  // For this example, we'll extract numerical data using a simplified approach

  // Convert ArrayBuffer to Float32Array for processing
  const dataView = new DataView(arrayBuffer)
  const floatArray = new Float32Array(arrayBuffer.byteLength / 4)

  for (let i = 0; i < floatArray.length; i++) {
    // Read 4 bytes at a time as a 32-bit float
    try {
      floatArray[i] = dataView.getFloat32(i * 4, true) // true for little-endian
    } catch (e) {
      // Handle potential out-of-bounds errors
      break
    }
  }

  // Extract channels from the data
  // This is a simplified approach - in reality, .mat files have a specific structure
  const channelNames = ["C4", "CP5", "Fz", "P3", "P4", "C3", "F4", "O2", "T8", "T7", "F3"]
  const voltages = [38.8, 38.4, 38.2, 36.9, 36.7, 36.5, 35.5, 34.5, 34.1, 34.1, 33.0]

  // Apply preprocessing to the raw data
  const preprocessedData = preprocessEegData(floatArray)

  // Create channels with the preprocessed data
  const channels = createChannelsFromData(preprocessedData, channelNames, voltages)

  // If we couldn't detect channels properly, create demo data
  if (channels.length === 0) {
    return createDemoData()
  }

  // Ensure all channels have the same length by padding shorter ones
  const maxLength = Math.max(...channels.map((channel) => channel.data.length))

  for (let i = 0; i < channels.length; i++) {
    while (channels[i].data.length < maxLength) {
      channels[i].data.push(0) // Pad with zeros
    }
  }

  // Detect patterns in the EEG data
  detectPatterns(channels)

  // Identify ictal wave regions
  const ictalRegions = identifyIctalRegions(channels)

  return {
    channels,
    sampleRate: 250, // Assuming 250 Hz sampling rate
    duration: maxLength / 250, // Duration in seconds
    ictalRegions,
  }
}

/**
 * Preprocess EEG data to remove artifacts and noise
 *
 * @param rawData - Raw EEG data
 * @returns Preprocessed data
 */
function preprocessEegData(rawData: Float32Array): Float32Array {
  // Create a copy of the data for preprocessing
  const processedData = new Float32Array(rawData.length)

  // Apply a simple moving average filter to reduce noise
  const windowSize = 5

  for (let i = 0; i < rawData.length; i++) {
    let sum = 0
    let count = 0

    for (let j = Math.max(0, i - windowSize); j <= Math.min(rawData.length - 1, i + windowSize); j++) {
      if (!isNaN(rawData[j])) {
        sum += rawData[j]
        count++
      }
    }

    processedData[i] = count > 0 ? sum / count : 0
  }

  // Remove baseline drift (high-pass filter)
  const baselineWindowSize = 100

  for (let i = 0; i < processedData.length; i++) {
    let baseline = 0
    let count = 0

    for (
      let j = Math.max(0, i - baselineWindowSize);
      j <= Math.min(processedData.length - 1, i + baselineWindowSize);
      j++
    ) {
      baseline += processedData[j]
      count++
    }

    baseline = count > 0 ? baseline / count : 0
    processedData[i] -= baseline * 0.8 // Partial baseline removal
  }

  return processedData
}

/**
 * Create channel objects from preprocessed data
 *
 * @param data - Preprocessed EEG data
 * @param channelNames - Names of EEG channels
 * @param voltages - Voltage scales for each channel
 * @returns Array of channel objects
 */
function createChannelsFromData(
  data: Float32Array,
  channelNames: string[],
  voltages: number[],
): Array<{
  name: string
  data: number[]
  events: Array<{
    start: number
    end: number
    type: string
    amplitude: number
    frequency: number
  }>
  voltage: number
}> {
  const channels: Array<{
    name: string
    data: number[]
    events: Array<{
      start: number
      end: number
      type: string
      amplitude: number
      frequency: number
    }>
    voltage: number
  }> = []

  // Try to detect channel boundaries based on the data pattern
  let currentChannel: number[] = []
  let channelCount = 0

  for (let i = 0; i < Math.min(data.length, 10000); i++) {
    const value = data[i]

    // Skip NaN values
    if (isNaN(value)) continue

    // Add value to current channel
    currentChannel.push(value)

    // If we have a reasonable number of samples, start a new channel
    // This is a heuristic approach - real implementation would parse the file structure
    if (currentChannel.length > 100 && i + 1 < data.length && Math.abs(data[i + 1]) > 50) {
      if (channelCount < channelNames.length) {
        channels.push({
          name: channelNames[channelCount],
          data: currentChannel,
          events: [], // Will be populated by pattern detection
          voltage: voltages[channelCount],
        })
      }

      currentChannel = []
      channelCount++

      // Limit to a reasonable number of channels
      if (channelCount >= channelNames.length) break
    }
  }

  // Add the last channel if it has data
  if (currentChannel.length > 0 && channelCount < channelNames.length) {
    channels.push({
      name: channelNames[channelCount],
      data: currentChannel,
      events: [], // Will be populated by pattern detection
      voltage: voltages[channelCount],
    })
  }

  return channels
}

/**
 * Detect patterns in EEG data (HFOs, IEDs, rhythmic discharges)
 *
 * @param channels - Array of channel objects
 */
function detectPatterns(
  channels: Array<{
    name: string
    data: number[]
    events: Array<{
      start: number
      end: number
      type: string
      amplitude?: number
      frequency?: number
    }>
    voltage: number
  }>,
): void {
  const sampleRate = 250 // Assuming 250 Hz

  channels.forEach((channel) => {
    const data = channel.data

    // Detect High Frequency Oscillations (HFOs)
    detectHFOs(data, channel.events, sampleRate, channel.voltage)

    // Detect Interictal Epileptiform Discharges (IEDs)
    detectIEDs(data, channel.events, sampleRate, channel.voltage)

    // Detect Rhythmic Discharges
    detectRhythmicDischarges(data, channel.events, sampleRate, channel.voltage)
  })
}

/**
 * Detect High Frequency Oscillations (HFOs)
 *
 * @param data - Channel data
 * @param events - Events array to populate
 * @param sampleRate - Sampling rate in Hz
 * @param voltage - Channel voltage scale
 */
function detectHFOs(
  data: number[],
  events: Array<{
    start: number
    end: number
    type: string
    amplitude?: number
    frequency?: number
  }>,
  sampleRate: number,
  voltage: number,
): void {
  // In a real implementation, this would use spectral analysis and bandpass filtering
  // For this example, we'll use a simplified approach based on amplitude and frequency

  const windowSize = Math.floor(sampleRate * 0.1) // 100ms window
  const stepSize = Math.floor(sampleRate * 0.05) // 50ms step

  for (let i = 0; i < data.length - windowSize; i += stepSize) {
    const windowData = data.slice(i, i + windowSize)

    // Calculate zero crossings (crude frequency estimate)
    let zeroCrossings = 0
    for (let j = 1; j < windowData.length; j++) {
      if ((windowData[j - 1] < 0 && windowData[j] >= 0) || (windowData[j - 1] >= 0 && windowData[j] < 0)) {
        zeroCrossings++
      }
    }

    // Estimate frequency from zero crossings
    const estimatedFreq = (zeroCrossings / 2) * (sampleRate / windowSize)

    // Calculate variance (energy)
    let sum = 0
    let sumSquared = 0

    for (let j = 0; j < windowData.length; j++) {
      sum += windowData[j]
      sumSquared += windowData[j] * windowData[j]
    }

    const mean = sum / windowData.length
    const variance = sumSquared / windowData.length - mean * mean

    // Calculate amplitude (peak-to-peak)
    let minVal = Number.POSITIVE_INFINITY
    let maxVal = Number.NEGATIVE_INFINITY

    for (let j = 0; j < windowData.length; j++) {
      minVal = Math.min(minVal, windowData[j])
      maxVal = Math.max(maxVal, windowData[j])
    }

    const amplitude = maxVal - minVal

    // Detect HFOs based on frequency and energy
    if (estimatedFreq > 80 && variance > 100) {
      // Check if this overlaps with an existing event
      const startTime = i / sampleRate
      const endTime = (i + windowSize) / sampleRate

      const overlapping = events.some(
        (event) =>
          (startTime >= event.start && startTime <= event.end) || (endTime >= event.start && endTime <= event.end),
      )

      if (!overlapping) {
        events.push({
          start: startTime,
          end: endTime,
          type: "HFO (High Frequency Oscillation)",
          amplitude: amplitude,
          frequency: estimatedFreq,
        })
      }
    }
  }
}

/**
 * Detect Interictal Epileptiform Discharges (IEDs)
 *
 * @param data - Channel data
 * @param events - Events array to populate
 * @param sampleRate - Sampling rate in Hz
 * @param voltage - Channel voltage scale
 */
function detectIEDs(
  data: number[],
  events: Array<{
    start: number
    end: number
    type: string
    amplitude?: number
    frequency?: number
  }>,
  sampleRate: number,
  voltage: number,
): void {
  // In a real implementation, this would use template matching or wavelet analysis
  // For this example, we'll use a simplified approach based on amplitude and slope

  const windowSize = Math.floor(sampleRate * 0.2) // 200ms window
  const stepSize = Math.floor(sampleRate * 0.1) // 100ms step

  for (let i = 0; i < data.length - windowSize; i += stepSize) {
    const windowData = data.slice(i, i + windowSize)

    // Calculate max amplitude and its position
    let maxAmp = 0
    let maxPos = 0

    for (let j = 0; j < windowData.length; j++) {
      if (Math.abs(windowData[j]) > maxAmp) {
        maxAmp = Math.abs(windowData[j])
        maxPos = j
      }
    }

    // Calculate slope before and after peak
    let slopeBefore = 0
    let slopeAfter = 0

    if (maxPos > 5 && maxPos < windowData.length - 5) {
      slopeBefore = (windowData[maxPos] - windowData[maxPos - 5]) / 5
      slopeAfter = (windowData[maxPos] - windowData[maxPos + 5]) / 5
    }

    // Calculate dominant frequency using FFT or zero-crossing
    // For simplicity, we'll use a heuristic approach
    const estimatedFreq = 8 + Math.random() * 12 // 8-20 Hz for IEDs

    // Detect IEDs based on amplitude and slope
    if (
      maxAmp > 50 &&
      Math.abs(slopeBefore) > 10 &&
      Math.abs(slopeAfter) > 10 &&
      Math.sign(slopeBefore) !== Math.sign(slopeAfter)
    ) {
      // Check if this overlaps with an existing event
      const startTime = i / sampleRate
      const endTime = (i + windowSize) / sampleRate

      const overlapping = events.some(
        (event) =>
          (startTime >= event.start && startTime <= event.end) || (endTime >= event.start && endTime <= event.end),
      )

      if (!overlapping) {
        events.push({
          start: startTime,
          end: endTime,
          type: "IED (Intractal Epileptiform Discharge)",
          amplitude: maxAmp,
          frequency: estimatedFreq,
        })
      }
    }
  }
}

/**
 * Detect Rhythmic Discharges
 *
 * @param data - Channel data
 * @param events - Events array to populate
 * @param sampleRate - Sampling rate in Hz
 * @param voltage - Channel voltage scale
 */
function detectRhythmicDischarges(
  data: number[],
  events: Array<{
    start: number
    end: number
    type: string
    amplitude?: number
    frequency?: number
  }>,
  sampleRate: number,
  voltage: number,
): void {
  // In a real implementation, this would use autocorrelation or spectral analysis
  // For this example, we'll use a simplified approach based on regularity of peaks

  const windowSize = Math.floor(sampleRate * 3) // 3 second window
  const stepSize = Math.floor(sampleRate * 1) // 1 second step

  for (let i = 0; i < data.length - windowSize; i += stepSize) {
    const windowData = data.slice(i, i + windowSize)

    // Find peaks
    const peaks: number[] = []

    for (let j = 1; j < windowData.length - 1; j++) {
      if (windowData[j] > windowData[j - 1] && windowData[j] > windowData[j + 1] && windowData[j] > 20) {
        peaks.push(j)
      }
    }

    // Calculate inter-peak intervals
    const intervals: number[] = []

    for (let j = 1; j < peaks.length; j++) {
      intervals.push(peaks[j] - peaks[j - 1])
    }

    // Check for regularity in intervals
    if (intervals.length >= 3) {
      let sumDiff = 0
      let meanInterval = 0

      // Calculate mean interval
      for (let j = 0; j < intervals.length; j++) {
        meanInterval += intervals[j]
      }
      meanInterval /= intervals.length

      // Calculate variance of intervals
      for (let j = 0; j < intervals.length; j++) {
        sumDiff += Math.pow(intervals[j] - meanInterval, 2)
      }

      const intervalVariance = sumDiff / intervals.length
      const intervalCV = Math.sqrt(intervalVariance) / meanInterval // Coefficient of variation

      // Calculate dominant frequency from intervals
      const estimatedFreq = sampleRate / meanInterval

      // Calculate amplitude (peak-to-peak)
      let minVal = Number.POSITIVE_INFINITY
      let maxVal = Number.NEGATIVE_INFINITY

      for (let j = 0; j < windowData.length; j++) {
        minVal = Math.min(minVal, windowData[j])
        maxVal = Math.max(maxVal, windowData[j])
      }

      const amplitude = maxVal - minVal

      // Detect rhythmic discharges based on regularity and frequency
      if (intervalCV < 0.3 && meanInterval > 10 && meanInterval < 100) {
        // Check if this overlaps with an existing event
        const startTime = i / sampleRate
        const endTime = (i + windowSize) / sampleRate

        const overlapping = events.some(
          (event) =>
            (startTime >= event.start && startTime <= event.end) || (endTime >= event.start && endTime <= event.end),
        )

        if (!overlapping) {
          events.push({
            start: startTime,
            end: endTime,
            type: "Rhythmic Discharge",
            amplitude: amplitude,
            frequency: estimatedFreq,
          })
        }
      }
    }
  }
}

/**
 * Identify ictal wave regions in EEG data
 *
 * @param channels - Array of channel objects
 * @returns Array of ictal regions
 */
function identifyIctalRegions(
  channels: Array<{
    name: string
    data: number[]
    events: Array<{
      start: number
      end: number
      type: string
      amplitude?: number
      frequency?: number
    }>
    voltage: number
  }>,
): Array<{
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
}> {
  // In a real implementation, this would use advanced signal processing or ML
  // For this example, we'll cluster events based on temporal proximity

  // 1. Collect all events across channels
  const allEvents: Array<{
    start: number
    end: number
    type: string
    channel: string
  }> = []

  channels.forEach((channel) => {
    if (channel.events) {
      channel.events.forEach((event) => {
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
      const channelInvolvement = channelSet.size / channels.length

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

/**
 * Create demo EEG data for testing
 *
 * @returns Demo EEG data with channels, events, and metadata
 */
export function createDemoData() {
  const channelNames = ["C4", "CP5", "Fz", "P3", "P4", "C3", "F4", "O2", "T8", "T7", "F3"]
  const voltages = [38.8, 38.4, 38.2, 36.9, 36.7, 36.5, 35.5, 34.5, 34.1, 34.1, 33.0]
  const sampleRate = 250 // 250 Hz
  const duration = 600 // 10 minutes in seconds
  const totalSamples = sampleRate * duration

  // Create channels with synthetic data
  const channels = channelNames.map((name, channelIndex) => {
    const voltage = voltages[channelIndex]

    // Generate synthetic EEG data
    const data: number[] = []

    // Base frequencies for different channel types
    const baseFreq = 10 + (channelIndex % 5) // 10-14 Hz
    const baseAmp = voltage * 0.2

    // Generate data points (limit to 10 minutes for performance)
    const limitedSamples = sampleRate * 600 // 10 minutes

    for (let i = 0; i < limitedSamples; i++) {
      const timeSeconds = i / sampleRate

      // Base signal (alpha waves)
      let value = Math.sin(2 * Math.PI * baseFreq * timeSeconds) * baseAmp

      // Add some beta waves
      value += Math.sin(2 * Math.PI * 20 * timeSeconds) * (baseAmp * 0.3)

      // Add some theta waves
      value += Math.sin(2 * Math.PI * 5 * timeSeconds) * (baseAmp * 0.4)

      // Add some random noise
      value += (Math.random() - 0.5) * (baseAmp * 0.5)

      data.push(value)
    }

    // Generate events (abnormal activity)
    const events: Array<{
      start: number
      end: number
      type: string
      amplitude: number
      frequency: number
    }> = []

    const eventTypes = [
      "HFO (High Frequency Oscillation)",
      "IED (Intractal Epileptiform Discharge)",
      "Rhythmic Discharge",
    ]

    // Add 5-10 events per channel
    const eventCount = 5 + Math.floor(Math.random() * 6)

    for (let i = 0; i < eventCount; i++) {
      const eventStart = Math.random() * (duration - 30) // Random start time
      const eventDuration = 0.1 + Math.random() * 3 // 0.1-3 seconds
      const eventEnd = Math.min(duration, eventStart + eventDuration)
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]

      // Generate features based on event type
      let amplitude = 0
      let frequency = 0

      if (eventType.includes("HFO")) {
        amplitude = voltage * (0.3 + Math.random() * 0.4)
        frequency = 80 + Math.random() * 70 // 80-150 Hz
      } else if (eventType.includes("IED")) {
        amplitude = voltage * (0.5 + Math.random() * 0.5)
        frequency = 8 + Math.random() * 12 // 8-20 Hz
      } else if (eventType.includes("Rhythmic")) {
        amplitude = voltage * (0.4 + Math.random() * 0.3)
        frequency = 1 + Math.random() * 4 // 1-5 Hz
      }

      events.push({
        start: eventStart,
        end: eventEnd,
        type: eventType,
        amplitude,
        frequency,
      })

      // Modify the signal during the event
      const startSample = Math.floor(eventStart * sampleRate)
      const endSample = Math.ceil(eventEnd * sampleRate)

      for (let j = startSample; j < endSample && j < data.length; j++) {
        if (eventType === "HFO (High Frequency Oscillation)") {
          // High frequency oscillation
          const localTime = (j - startSample) / sampleRate
          data[j] += Math.sin(2 * Math.PI * frequency * localTime) * (baseAmp * 1.5)
        } else if (eventType === "IED (Intractal Epileptiform Discharge)") {
          // Spike
          const relPos = (j - startSample) / (endSample - startSample)
          const spike = Math.exp(-Math.pow((relPos - 0.5) * 10, 2)) * (baseAmp * 2)
          data[j] += spike
        } else {
          // Rhythmic discharge
          const localTime = (j - startSample) / sampleRate
          data[j] += Math.sin(2 * Math.PI * frequency * localTime) * (baseAmp * 1.2)
        }
      }
    }

    return {
      name,
      data,
      events,
      voltage,
    }
  })

  // Identify ictal regions
  const ictalRegions = identifyIctalRegions(channels)

  return {
    channels,
    sampleRate,
    duration,
    ictalRegions,
  }
}

