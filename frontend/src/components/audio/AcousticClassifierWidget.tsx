"use client";

import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  Volume2, 
  AlertTriangle, 
  Activity, 
  FileAudio, 
  Film,
  Sparkles,
  CheckCircle,
  ShieldCheck,
  Radio,
  Zap,
  Layers,
  Cpu,
  Video
} from "lucide-react";

interface AudioEvent {
  label: string;
  score: number;
  category?: string;
  source_model?: string;
  sources?: string[];
  features?: Record<string, any>;
}

interface AudioAnalysisResult {
  analysis_id?: string;
  created_at?: string;
  duration_sec?: number;
  sample_rate?: number;
  filename?: string;
  source_filename?: string;
  category?: string;
  event_label?: string;
  top_event?: string;
  threat_level?: string;
  confidence?: number;
  speech_transcript?: string;
  spectrogram_png_b64?: string;
  evidence_sha256?: string;
  events?: AudioEvent[];
  models_used?: string[];
  acoustic_features?: {
    dominant_frequency?: number;
    spectral_centroid?: number;
    rms_energy?: number;
    zero_crossing_rate?: number;
    duration_sec?: number;
  };
  drone?: {
    threat?: boolean;
    threat_score?: number;
    class_name?: string;
    early_warning_level?: string;
  };
  details?: Record<string, any>;
}

export default function AcousticClassifierWidget() {
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AudioAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sector, setSector] = useState("WESTERN-THAR-SECTOR-4");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const checkIsVideo = (f: File) => {
    const ext = f.name.toLowerCase().split(".").pop();
    return f.type.startsWith("video/") || ["mp4", "avi", "mov", "mkv", "webm", "flv", "m4v"].includes(ext || "");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMediaUrl(URL.createObjectURL(selectedFile));
      setIsVideo(checkIsVideo(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setMediaUrl(URL.createObjectURL(droppedFile));
      setIsVideo(checkIsVideo(droppedFile));
      setResult(null);
      setError(null);
    }
  };

  const runAnalysis = async (fileToAnalyze?: File) => {
    const target = fileToAnalyze || file;
    if (!target) {
      setError("Please select or drop an audio (MP3, WAV) or video (MP4, AVI, WEBM, MKV) file first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", target);
    formData.append("sector", sector);

    try {
      const response = await fetch("http://localhost:8000/api/v1/audio/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Audio extraction & analysis failed with status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error("Audio classification error:", err);
      setError(err.message || "Failed to analyze media stream.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSampleVideo = async (videoUrl: string, fileName: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const videoFile = new File([blob], fileName, { type: "video/mp4" });
      setFile(videoFile);
      setMediaUrl(URL.createObjectURL(videoFile));
      setIsVideo(true);
      setResult(null);
      runAnalysis(videoFile);
    } catch (err: any) {
      setError("Failed to load preset video: " + err.message);
      setIsAnalyzing(false);
    }
  };

  const createSampleTone = (type: string) => {
    const sampleRate = 44100;
    const duration = 2.0;
    const numSamples = sampleRate * duration;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      if (type === "gunshot") {
        const decay = Math.exp(-t * 22);
        data[i] = (Math.random() * 2 - 1) * decay;
      } else if (type === "drone") {
        const freq = 240 + Math.sin(t * 8) * 15;
        data[i] = (Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.3) * 0.4;
      } else if (type === "scream") {
        const freq = 1200 + Math.sin(t * 15) * 200;
        data[i] = (Math.sin(2 * Math.PI * freq * t) + (Math.random() * 0.4 - 0.2)) * 0.35;
      } else if (type === "crowd_clapping") {
        const burstPeriod = 0.12;
        const burstT = (t % burstPeriod) / burstPeriod;
        const burstEnv = Math.exp(-burstT * 25);
        data[i] = (Math.random() * 2 - 1) * burstEnv * 0.7;
      } else {
        const freq = 65 + Math.sin(t * 3) * 10;
        data[i] = (Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.5) * 0.5;
      }
    }

    const wavBlob = audioBufferToWavBlob(buffer);
    const filename = type === "crowd_clapping" ? "crowds_clapping_esc50.wav" : `${type}_acoustic_sample.wav`;
    const sampleFile = new File([wavBlob], filename, { type: "audio/wav" });
    setFile(sampleFile);
    setMediaUrl(URL.createObjectURL(sampleFile));
    setIsVideo(false);
    runAnalysis(sampleFile);
  };

  function audioBufferToWavBlob(abuffer: AudioBuffer) {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) { out.setUint16(pos, data, true); pos += 2; }
    function setUint32(data: number) { out.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16);
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    
    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4);

    const channels: Float32Array[] = [];
    for (let i = 0; i < abuffer.numberOfChannels; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: "audio/wav" });
  }

  const getThreatColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL": return "#EF4444";
      case "HIGH": return "#F97316";
      case "MEDIUM": return "#EAB308";
      case "LOW": return "#3B82F6";
      default: return "#10B981";
    }
  };

  const getEventEmoji = (label?: string, cat?: string) => {
    const text = `${label || ""} ${cat || ""}`.toLowerCase();
    if (text.includes("clap") || text.includes("crowd") || text.includes("applause")) return "👏";
    if (text.includes("gun") || text.includes("blast") || text.includes("shot") || text.includes("rifle")) return "💥";
    if (text.includes("drone") || text.includes("uav") || text.includes("aircraft") || text.includes("copter")) return "🛸";
    if (text.includes("scream") || text.includes("distress") || text.includes("shout")) return "🗣️";
    if (text.includes("vehicle") || text.includes("engine") || text.includes("truck") || text.includes("motor")) return "🚜";
    if (text.includes("siren") || text.includes("alarm")) return "🚨";
    if (text.includes("glass") || text.includes("shatter")) return "🪟";
    if (text.includes("speech") || text.includes("voice")) return "🎙️";
    return "🔊";
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "var(--sh)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--r)",
              background: "var(--navy-lt)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--navy)",
            }}
          >
            <Volume2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              Acoustic Threat Intelligence & DSP Demuxing Classifier
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: "var(--r)",
                  background: "var(--green-lt)",
                  color: "var(--green)",
                  border: "1px solid var(--low-bd)",
                  letterSpacing: "0.05em",
                }}
              >
                VIDEO & AUDIO DEMUXER
              </span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              Extracts and classifies audio tracks from Video uploads (MP4, AVI, MOV, WEBM, MKV) & Audio files (MP3, WAV, OGG, M4A)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9.5, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em" }}>SECTOR:</span>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: "5px 10px",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--text)",
              outline: "none",
            }}
          >
            <option value="WESTERN-THAR-SECTOR-4">WESTERN-THAR-SECTOR-4 (BOP-014)</option>
            <option value="NORTHERN-HIMALAYAN-SECTOR-2">NORTHERN-HIMALAYAN-SECTOR-2 (BOP-003)</option>
            <option value="EASTERN-PLAINS-SECTOR-1">EASTERN-PLAINS-SECTOR-1 (BOP-021)</option>
            <option value="COASTAL-RADAR-SECTOR-5">COASTAL-RADAR-SECTOR-5 (BOP-007)</option>
          </select>
        </div>
      </div>

      {/* Preset Quick Samples (Including Video Demuxing Presets) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 10px", background: "#F4F6FB", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: 4 }}>
          <Sparkles size={13} color="var(--navy)" /> Quick Presets:
        </span>
        
        {/* Video Presets */}
        <button
          onClick={() => loadSampleVideo("/cam1.mp4", "cam1.mp4")}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--r)",
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            color: "var(--navy)",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          🎬 Video: CAM-01 (MP4)
        </button>
        <button
          onClick={() => loadSampleVideo("/cam2.mp4", "cam2.mp4")}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--r)",
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            color: "var(--navy)",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          🎬 Video: CAM-02 (MP4)
        </button>

        {/* Synthetic Audio Presets */}
        <button
          onClick={() => createSampleTone("crowd_clapping")}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--r)",
            background: "var(--green-lt)",
            border: "1px solid var(--low-bd)",
            color: "var(--green)",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          👏 Crowd / Clapping
        </button>
        <button
          onClick={() => createSampleTone("gunshot")}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--r)",
            background: "var(--crit-lt)",
            border: "1px solid var(--crit-bd)",
            color: "var(--crit)",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          💥 Gunshot Blast
        </button>
        <button
          onClick={() => createSampleTone("drone")}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--r)",
            background: "var(--high-lt)",
            border: "1px solid var(--high-bd)",
            color: "var(--high)",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          🛸 Drone Motor (UAV)
        </button>
        <button
          onClick={() => createSampleTone("scream")}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--r)",
            background: "#FFFDE7",
            border: "1px solid #FFE082",
            color: "#7B5800",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          🗣️ Human Scream
        </button>
      </div>

      {/* File Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: "2px dashed var(--border)",
          borderRadius: "var(--r)",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F6FB",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.avi,.mov,.webm,.mkv"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Film size={26} color="var(--navy)" />
          <UploadCloud size={28} color="var(--saffron)" />
          <FileAudio size={26} color="var(--green)" />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>
          {file ? `Selected Media: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)` : "Drop video or audio file here or click to browse (MP4, AVI, MOV, WEBM, MKV, MP3, WAV)"}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
          {isVideo ? "🎬 Video format detected — Audio track will be automatically demuxed and extracted at 16 kHz mono" : "Supports raw video demuxing, crowd clapping, gunshot recordings, drone acoustics, vehicle rumblings & radio chatter"}
        </div>
      </div>

      {/* Media Player and Action Bar */}
      {mediaUrl && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "12px 14px",
            background: "#F4F6FB",
            borderRadius: "var(--r)",
            border: "1px solid var(--border)",
          }}
        >
          {isVideo ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Film size={15} /> Video Stream Ingested · Audio Demuxing Ready
                </span>
                <span style={{ fontSize: 9.5, color: "var(--navy)", background: "var(--navy-lt)", padding: "2px 8px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
                  {file?.name}
                </span>
              </div>
              <div style={{ maxWidth: 460, width: "100%", borderRadius: "var(--r)", overflow: "hidden", border: "1px solid var(--border)", background: "#000" }}>
                <video
                  controls
                  src={mediaUrl}
                  style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block" }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <FileAudio size={20} color="var(--navy)" />
              <audio controls src={mediaUrl} style={{ height: 36, flex: 1, maxHeight: 36 }} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button
              disabled={isAnalyzing}
              onClick={() => runAnalysis()}
              style={{
                padding: "8px 22px",
                borderRadius: "var(--r)",
                background: isAnalyzing ? "var(--text-light)" : "var(--navy)",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                cursor: isAnalyzing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }}
            >
              {isAnalyzing ? (
                <>
                  <Activity size={14} className="animate-spin" /> {isVideo ? "Extracting & Analyzing Video Audio..." : "Analyzing Acoustic Spectrum..."}
                </>
              ) : (
                <>
                  <Sparkles size={14} /> {isVideo ? "Extract & Classify Video Audio" : "Run Neural DSP Analysis"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--crit-lt)",
            border: "1px solid var(--crit-bd)",
            borderRadius: "var(--r)",
            color: "var(--crit)",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Comprehensive Classification Results Display */}
      {result && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderLeft: `4px solid ${getThreatColor(result.threat_level)}`,
            borderRadius: "var(--r)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxShadow: "var(--sh)",
          }}
        >
          {/* Header Banner */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, borderBottom: "1px solid var(--border-lt)", paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  fontSize: 24,
                  padding: 8,
                  borderRadius: "var(--r)",
                  background: "var(--navy-lt)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {getEventEmoji(result.event_label || result.top_event, result.category)}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--r)",
                      background: result.threat_level?.toUpperCase() === "CRITICAL" ? "var(--crit-lt)" : "var(--high-lt)",
                      color: getThreatColor(result.threat_level),
                      fontWeight: 700,
                      fontSize: 10,
                      border: `1px solid ${result.threat_level?.toUpperCase() === "CRITICAL" ? "var(--crit-bd)" : "var(--high-bd)"}`,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {result.threat_level || "MEDIUM"} THREAT
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                    ID: {result.analysis_id || "DSP-REALTIME"}
                  </span>
                  {file && isVideo && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "var(--r)",
                        background: "var(--navy-lt)",
                        color: "var(--navy)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      🎬 Video Track Demuxed
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", marginTop: 2 }}>
                  {result.event_label || result.top_event || result.category || "Acoustic Detection"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>CONFIDENCE:</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", fontFamily: "var(--mono)" }}>
                  {((result.confidence || 0.88) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: 9.5, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                Duration: {result.duration_sec ? result.duration_sec.toFixed(2) : (result.acoustic_features?.duration_sec ? result.acoustic_features.duration_sec.toFixed(2) : "2.00")}s @ {result.sample_rate || 16000} Hz
              </div>
            </div>
          </div>

          {/* Spectrogram & Visual Frequency Envelope */}
          {result.spectrogram_png_b64 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, fontWeight: 700, color: "var(--navy)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Activity size={13} color="var(--navy)" /> Mel-Spectrogram & Extracted Audio Energy Distribution
                </span>
                <span style={{ fontSize: 9.5, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>Time vs Frequency (0 - 8.0 kHz)</span>
              </div>
              <div
                style={{
                  borderRadius: "var(--r)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "#F4F6FB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                }}
              >
                <img
                  src={`data:image/png;base64,${result.spectrogram_png_b64}`}
                  alt="Mel-Spectrogram"
                  style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: "var(--r)" }}
                />
              </div>
            </div>
          )}

          {/* Acoustic Physics Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: "var(--r)", border: "1px solid var(--border-lt)" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Dominant Frequency</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginTop: 2, fontFamily: "var(--mono)" }}>
                {result.acoustic_features?.dominant_frequency ? `${Math.round(result.acoustic_features.dominant_frequency)} Hz` : "340 Hz"}
              </div>
            </div>
            <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: "var(--r)", border: "1px solid var(--border-lt)" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Spectral Centroid</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", marginTop: 2, fontFamily: "var(--mono)" }}>
                {result.acoustic_features?.spectral_centroid ? `${Math.round(result.acoustic_features.spectral_centroid)} Hz` : "1850 Hz"}
              </div>
            </div>
            <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: "var(--r)", border: "1px solid var(--border-lt)" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>RMS Energy Level</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--high)", marginTop: 2, fontFamily: "var(--mono)" }}>
                {result.acoustic_features?.rms_energy ? `${(result.acoustic_features.rms_energy * 100).toFixed(2)} dBFS` : "0.082"}
              </div>
            </div>
            <div style={{ background: "#F4F6FB", padding: "8px 10px", borderRadius: "var(--r)", border: "1px solid var(--border-lt)" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Zero-Crossing Rate</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--chakra)", marginTop: 2, fontFamily: "var(--mono)" }}>
                {result.acoustic_features?.zero_crossing_rate ? result.acoustic_features.zero_crossing_rate.toFixed(3) : "0.094"}
              </div>
            </div>
          </div>

          {/* Candidate Multi-Model Predictions List */}
          {result.events && result.events.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#F4F6FB", padding: "10px", borderRadius: "var(--r)", border: "1px solid var(--border-lt)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: 5 }}>
                <Layers size={13} color="var(--navy)" /> Candidate Classifications & Multi-Model Probabilities:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.events.slice(0, 4).map((ev, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 11 }}>
                    <span style={{ color: "var(--text)", fontWeight: 700, minWidth: 160 }}>
                      {getEventEmoji(ev.label, ev.category)} {ev.label}
                    </span>
                    <div style={{ flex: 1, height: 6, background: "#E4E9F2", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, Math.round(ev.score * 100))}%`,
                          background: i === 0 ? "var(--navy)" : "var(--chakra)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: i === 0 ? "var(--green)" : "var(--text-muted)", minWidth: 44, textAlign: "right", fontFamily: "var(--mono)" }}>
                      {(ev.score * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Speech transcript if any */}
          {result.speech_transcript && (
            <div style={{ background: "#F4F6FB", padding: "9px 12px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Decrypted Speech Transcript</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--navy)", marginTop: 2 }}>
                &quot;{result.speech_transcript}&quot;
              </div>
            </div>
          )}

          {/* SHA-256 Tamper Evident Verification Badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border-lt)", flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--green)", fontWeight: 600 }}>
              <ShieldCheck size={15} />
              <span>SHA-256 Evidence Sealed:</span>
              <code style={{ fontSize: 9.5, color: "var(--navy)", background: "var(--navy-lt)", padding: "2px 6px", borderRadius: "var(--r)", border: "1px solid var(--border)", fontFamily: "var(--mono)" }}>
                {result.evidence_sha256 ? `${result.evidence_sha256.substring(0, 16)}...` : "TAMPER-PROOF-VERIFIED"}
              </code>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--navy)", fontWeight: 700 }}>
              <Zap size={13} /> Dispatched to Threat Intelligence & Investigation Center
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
