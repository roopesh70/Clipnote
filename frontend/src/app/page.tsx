'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Upload,
  Video,
  CheckCircle,
  Clock,
  Download,
  History,
  BookOpen,
  Lightbulb,
  HelpCircle,
  FileText,
  AlignLeft,
  ArrowRight,
  ShieldCheck,
  Plus,
  Zap,
  Target,
  GraduationCap,
  Play,
  Layers,
  Brain,
  FileDown,
  ExternalLink as GithubIcon,
  Globe,
  Mail,
  Heart,
  Star,
  Users,
  TrendingUp,
  Clipboard,
  ChevronDown
} from 'lucide-react';

import { MediaSyncPlayer, MediaSyncPlayerRef } from '@/components/MediaSyncPlayer';
import { NotesTab } from '@/components/NotesTab';
import { KeyConceptsTab } from '@/components/KeyConceptsTab';
import { QuizTab } from '@/components/QuizTab';
import { StudyGuideTab } from '@/components/StudyGuideTab';
import { TranscriptTab } from '@/components/TranscriptTab';
import { ExportModal } from '@/components/ExportModal';
import { HistoryDrawer } from '@/components/HistoryDrawer';

interface LectureResults {
  job_id: string;
  title: string;
  source_type: 'upload' | 'youtube';
  source_reference: string;
  media_url: string;
  status: string;
  results?: {
    transcript: { raw_text: string; segments: any[] };
    notes: any[];
    key_concepts: any[];
    quiz: any[];
    study_guide: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://clipnote-1-nbeu.onrender.com';

export default function Home() {
  // Submission Form State
  const [submissionType, setSubmissionType] = useState<'upload' | 'youtube'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  // App Execution State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lectureData, setLectureData] = useState<LectureResults | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'concepts' | 'quiz' | 'guide' | 'transcript'>('notes');

  // Modals & Drawers
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLectures, setHistoryLectures] = useState<any[]>([]);

  const playerRef = useRef<MediaSyncPlayerRef | null>(null);
  const submitCardRef = useRef<HTMLDivElement | null>(null);

  const handleScrollToSubmit = () => {
    if (submitCardRef.current) {
      submitCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = submitCardRef.current.querySelector('input');
      if (input) input.focus();
    }
  };

  // Poll job status when processing
  useEffect(() => {
    if (!activeJobId || jobStatus === 'complete' || jobStatus?.startsWith('failed')) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/lectures/${activeJobId}/status`);
        if (res.ok) {
          const data = await res.json();
          setJobStatus(data.status);
          setStatusMessage(data.message || '');

          if (data.status === 'complete') {
            fetchResults(activeJobId);
          }
        }
      } catch (err) {
        console.error("Status polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobId, jobStatus]);

  // Fetch results when complete
  const fetchResults = async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/lectures/${jobId}/results`);
      if (res.ok) {
        const data = await res.json();
        setLectureData(data);
        setJobStatus('complete');
      }
    } catch (err) {
      console.error("Fetch results error:", err);
    }
  };

  // Fetch past lectures for history drawer
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/lectures`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLectures(data);
      }
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  };

  const handleOpenHistory = () => {
    fetchHistory();
    setIsHistoryOpen(true);
  };

  const handleDeleteLecture = async (jobId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/lectures/${jobId}`, { method: 'DELETE' });
      fetchHistory();
      if (activeJobId === jobId) {
        setActiveJobId(null);
        setLectureData(null);
        setJobStatus(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submissionType === 'youtube') {
      if (!youtubeUrl.trim()) return;
      if (!rightsConfirmed) {
        alert("Please confirm that you have rights to process this YouTube lecture.");
        return;
      }

      try {
        setJobStatus('queued');
        setStatusMessage('Submitting YouTube link...');
        const res = await fetch(`${API_BASE_URL}/api/lectures/youtube`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            youtube_url: youtubeUrl,
            rights_confirmed: true
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setActiveJobId(data.job_id);
          setJobStatus('queued');
        } else {
          const err = await res.json();
          alert(err.detail || 'Submission failed');
          setJobStatus(null);
        }
      } catch (err) {
        console.error(err);
        setJobStatus(null);
      }
    } else {
      if (!file) return;

      try {
        setJobStatus('queued');
        setStatusMessage('Uploading audio/video file...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('rights_confirmed', 'true');

        const res = await fetch(`${API_BASE_URL}/api/lectures/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setActiveJobId(data.job_id);
          setJobStatus('queued');
        } else {
          alert('Upload failed');
          setJobStatus(null);
        }
      } catch (err) {
        console.error(err);
        setJobStatus(null);
      }
    }
  };

  const handleTimestampClick = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
    }
  };

  // Stage indicator calculation
  const getStageNumber = (status: string | null) => {
    if (status === 'queued') return 1;
    if (status === 'extracting') return 2;
    if (status === 'transcribing') return 3;
    if (status === 'structuring') return 4;
    if (status === 'complete') return 5;
    return 0;
  };

  const currentStage = getStageNumber(jobStatus);

  const tabs = [
    { key: 'notes' as const, label: 'Notes', icon: BookOpen, count: lectureData?.results?.notes?.length },
    { key: 'concepts' as const, label: 'Concepts', icon: Lightbulb, count: lectureData?.results?.key_concepts?.length },
    { key: 'quiz' as const, label: 'Quiz', icon: HelpCircle, count: lectureData?.results?.quiz?.length },
    { key: 'guide' as const, label: 'Study Guide', icon: FileText },
    { key: 'transcript' as const, label: 'Transcript', icon: AlignLeft },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-warm)' }}>
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 px-4 sm:px-6 lg:px-10 py-3 flex sm:py-3.5 items-center justify-between border-b"
        style={{ background: 'rgba(250, 247, 242, 0.9)', backdropFilter: 'blur(16px)', borderColor: 'var(--border-warm)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-olive)' }}>
            <Clipboard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Clipnote
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {!lectureData && (
            <button
              onClick={handleScrollToSubmit}
              className="cta-btn px-2.5 sm:px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Start Processing</span>
            </button>
          )}

          {lectureData && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="btn-warm inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs"
            >
              <Download className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-olive)' }} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          <button
            onClick={handleOpenHistory}
            className="btn-warm inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs"
          >
            <History className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-brown)' }} />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* ── Single View Dashboard Wrapper (Before Results) ── */}
        {!lectureData && (
          <section className="animate-float-in relative rounded-2xl sm:rounded-[32px] overflow-hidden border-[3px] sm:border-[6px] border-double shadow-2xl p-5 sm:p-6 lg:p-10"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundImage: 'linear-gradient(to bottom, rgba(250, 247, 242, 0.85), rgba(250, 247, 242, 0.95)), url(/images/hero-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Left Column: Core pitch and step badges (compact) */}
              <div className="lg:col-span-6 space-y-5 lg:space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold" style={{ background: 'rgba(123,140,62,0.1)', color: 'var(--accent-olive)', border: '1px solid rgba(123,140,62,0.2)' }}>
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  AI-Powered Study Assistant
                </div>

                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.15] tracking-tight">
                  Transform Lectures Into{' '}
                  <em className="italic whitespace-nowrap" style={{ color: 'var(--accent-olive)' }}>Revision-Ready</em><br className="hidden sm:block" />
                  Study Decks
                </h2>

                <p className="text-[13px] sm:text-xs md:text-sm leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)' }}>
                  Paste a YouTube link or upload any audio/video. Clipnote&rsquo;s AI instantly generates structured notes, key concept glossaries, interactive quizzes, and single-page study guides.
                </p>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
                  {[
                    { icon: Zap, value: '5 Outputs', label: 'Notes, Quiz, Guide, Glossary, Text' },
                    { icon: FileDown, value: '3 Exports', label: 'PDF, Markdown, Anki' },
                    { icon: Play, value: 'Sync Play', label: 'Interactive timestamps' },
                  ].map((stat) => (
                    <div key={stat.value} className="flex flex-col p-2 sm:p-2.5 rounded-lg sm:rounded-xl border bg-white/70" style={{ borderColor: 'var(--border-warm)' }}>
                      <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1" style={{ color: 'var(--accent-olive)' }} />
                      <p className="text-[10px] sm:text-[11px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                      <p className="text-[8px] sm:text-[9px] leading-tight hidden sm:block" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Submission Form (directly above the fold, side-by-side) */}
              <div ref={submitCardRef} className="lg:col-span-6 warm-card p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 shadow-xl relative bg-white/95">
                <div className="text-center space-y-1">
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }} className="text-lg sm:text-xl">
                    Start Processing
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Choose your lecture source and let AI do the rest.</p>
                </div>

                {/* Source Type Toggle */}
                <div className="flex items-center p-1 rounded-xl" style={{ background: 'var(--bg-card-alt)' }}>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('youtube')}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${submissionType === 'youtube' ? 'tab-active' : 'tab-inactive'
                      }`}
                  >
                    <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" style={{ color: submissionType === 'youtube' ? '#DC2626' : 'var(--text-muted)' }} />
                    YouTube Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${submissionType === 'upload' ? 'tab-active' : 'tab-inactive'
                      }`}
                  >
                    <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" style={{ color: submissionType === 'upload' ? 'var(--accent-olive)' : 'var(--text-muted)' }} />
                    File Upload
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {submissionType === 'youtube' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        YouTube Video URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        required
                        className="warm-input w-full px-3 sm:px-4 py-2.5"
                      />

                      <label className="flex items-start gap-2 p-2.5 rounded-xl cursor-pointer bg-white" style={{ border: '1px solid var(--border-warm)' }}>
                        <input
                          type="checkbox"
                          checked={rightsConfirmed}
                          onChange={(e) => setRightsConfirmed(e.target.checked)}
                          className="mt-0.5 rounded accent-[#7B8C3E] shrink-0"
                        />
                        <span className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          I confirm I have the right or authorization to process this YouTube lecture.
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Lecture File (.mp3, .wav, .m4a, .mp4, .mov)
                      </label>
                      <div className="border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-colors" style={{ borderColor: 'var(--border-warm)', background: 'var(--bg-card-alt)' }}>
                        <input
                          type="file"
                          accept="audio/*,video/*"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer space-y-1 block">
                          <Upload className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1" style={{ color: 'var(--accent-olive)' }} />
                          <p className="text-xs font-semibold break-all" style={{ color: 'var(--text-primary)' }}>
                            {file ? file.name : 'Select or drag lecture media'}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Up to 2GB</p>
                        </label>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={Boolean(jobStatus && jobStatus !== 'complete' && !jobStatus.startsWith('failed'))}
                    className="cta-btn w-full py-2.5 sm:py-3 text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Generate Study Materials
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* ── Pipeline Progress ── */}
        {jobStatus && jobStatus !== 'complete' && (
          <section className="max-w-2xl mx-auto warm-card p-4 sm:p-6 space-y-4 animate-float-in">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="pulse-dot shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    Processing Pipeline
                  </h3>
                  <p className="text-xs capitalize truncate" style={{ color: 'var(--accent-olive)' }}>{jobStatus}</p>
                </div>
              </div>
              <span className="badge-olive text-[11px] shrink-0">Stage {currentStage} of 4</span>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(currentStage / 4) * 100}%` }} />
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              {statusMessage || "Ingesting media and running AI transcription pipeline..."}
            </p>
          </section>
        )}

        {/* ── Structured Results Display ── */}
        {lectureData && (
          <div className="space-y-6 animate-float-in">
            {/* Lecture Title Header */}
            <div className="warm-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0 w-full sm:w-auto">
                <span className="badge-olive text-[10px] uppercase tracking-widest">Processed Lecture</span>
                <h2 className="font-display text-base sm:text-xl mt-1 truncate" style={{ color: 'var(--text-primary)' }}>
                  {lectureData.title}
                </h2>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => {
                    setLectureData(null);
                    setJobStatus(null);
                  }}
                  className="btn-warm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" style={{ color: 'var(--accent-olive)' }} />
                  New Submission
                </button>
              </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Media Player Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-20">
                  <MediaSyncPlayer
                    ref={playerRef}
                    mediaUrl={lectureData.media_url || lectureData.source_reference}
                    sourceType={lectureData.source_type}
                    title={lectureData.title}
                  />

                  <div className="mt-4 warm-section rounded-xl p-4 space-y-2 text-xs">
                    <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-olive)' }} />
                      Interactive Media Sync
                    </p>
                    <p style={{ color: 'var(--text-muted)' }}>
                      Click any timestamp chip <span className="timestamp-chip" style={{ cursor: 'default' }}>02:15</span> across Notes, Concepts, or Quiz to jump playback directly to that segment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabbed Results Column */}
              <div className="lg:col-span-7 space-y-4">
                {/* Tab Navigation - scrollable on mobile */}
                <div className="overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
                  <div className="flex items-center gap-1 p-1 rounded-xl min-w-max" style={{ background: 'var(--bg-card-alt)' }}>
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs transition-all whitespace-nowrap ${activeTab === tab.key ? 'tab-active' : 'tab-inactive'
                          }`}
                      >
                        <tab.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="inline">{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className="text-[10px] opacity-60">({tab.count || 0})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Contents */}
                <div>
                  {activeTab === 'notes' && (
                    <NotesTab
                      notes={lectureData.results?.notes || []}
                      onTimestampClick={handleTimestampClick}
                    />
                  )}

                  {activeTab === 'concepts' && (
                    <KeyConceptsTab
                      concepts={lectureData.results?.key_concepts || []}
                      onTimestampClick={handleTimestampClick}
                    />
                  )}

                  {activeTab === 'quiz' && (
                    <QuizTab
                      quiz={lectureData.results?.quiz || []}
                      onTimestampClick={handleTimestampClick}
                    />
                  )}

                  {activeTab === 'guide' && (
                    <StudyGuideTab
                      studyGuide={lectureData.results?.study_guide || ''}
                    />
                  )}

                  {activeTab === 'transcript' && (
                    <TranscriptTab
                      transcript={lectureData.results?.transcript || { raw_text: '', segments: [] }}
                      onTimestampClick={handleTimestampClick}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer>
        {/* Decorative top divider */}
        <div className="relative h-1 w-full overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, var(--border-warm) 0%, var(--accent-olive) 30%, var(--accent-green-cta) 50%, var(--accent-olive) 70%, var(--border-warm) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', animation: 'shimmer 3s ease-in-out infinite' }} />
        </div>

        <div style={{ background: 'var(--bg-card-alt)', borderTop: '1px solid var(--border-warm)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">

            {/* ── Main Footer Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-8 py-6 sm:py-14 lg:py-16">

              {/* Brand Column (3 cols) — spans full on mobile */}
              <div className="sm:col-span-2 lg:col-span-4 space-y-3 sm:space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'var(--accent-olive)' }}>
                    <Clipboard className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-base font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                      Clipnote
                    </span>
                    <p className="hidden sm:block text-[10px] font-medium" style={{ color: 'var(--accent-olive)' }}>AI Lecture Note Taker</p>
                  </div>
                </div>

                <p className="hidden sm:block text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Transform any lecture video or audio into structured, revision-ready study materials.
                </p>

                {/* Social links - compact on mobile */}
                <div className="flex items-center gap-2 pt-0 sm:pt-2">
                  {[
                    { icon: GithubIcon, label: 'GitHub' },
                    { icon: Globe, label: 'Website' },
                    { icon: Mail, label: 'Email' },
                    { icon: Heart, label: 'Support' },
                  ].map(({ icon: SocialIcon, label }, i) => (
                    <a
                      key={label}
                      href="#"
                      title={label}
                      className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 group hover:border-[var(--accent-olive)] hover:text-[var(--accent-olive)]"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-warm)', color: 'var(--text-muted)' }}
                    >
                      <SocialIcon className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 transition-all duration-200 group-hover:scale-110" />
                    </a>
                  ))}
                </div>
              </div>

              {/* ── Product & Export: Accordion on mobile, columns on sm+ ── */}
              {/* Mobile accordion toggle */}
              <div className="sm:hidden">
                <button
                  onClick={() => setResourcesOpen(!resourcesOpen)}
                  className="w-full flex items-center justify-between py-2.5 px-1 rounded-lg transition-all"
                  style={{ color: 'var(--accent-olive)' }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em]">Resources &amp; Exports</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${resourcesOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${resourcesOpen ? 'max-h-80 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
                >
                  <div className="grid grid-cols-2 gap-4 px-1 pb-2">
                    {/* Product links */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Product</h4>
                      <ul className="space-y-1.5">
                        {[
                          'Structured Notes',
                          'Key Concepts',
                          'Interactive Quizzes',
                          'Study Guides',
                          'Transcript Search',
                        ].map((label) => (
                          <li key={label}>
                            <a href="#" className="block text-xs transition-colors duration-200 hover:text-[var(--accent-olive)]" style={{ color: 'var(--text-secondary)' }}>
                              {label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Export links */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Export</h4>
                      <ul className="space-y-1.5">
                        {[
                          'PDF Documents',
                          'Markdown (.md)',
                          'Anki Flashcards',
                          'Obsidian / Notion',
                          'Clipboard Copy',
                        ].map((label) => (
                          <li key={label}>
                            <a href="#" className="block text-xs transition-colors duration-200 hover:text-[var(--accent-olive)]" style={{ color: 'var(--text-secondary)' }}>
                              {label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop columns (hidden on mobile) */}
              <div className="hidden sm:block lg:col-span-2 space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-olive)' }}>Product</h4>
                <ul className="space-y-3">
                  {[
                    { label: 'Structured Notes', desc: 'Sectioned with timestamps' },
                    { label: 'Key Concepts', desc: 'Glossary with definitions' },
                    { label: 'Interactive Quizzes', desc: 'MCQ & flashcards' },
                    { label: 'Study Guides', desc: 'Single-page summary' },
                    { label: 'Transcript Search', desc: 'Full-text with timestamps' },
                  ].map((item) => (
                    <li key={item.label}>
                      <a
                        href="#"
                        className="group block transition-all duration-200"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span className="text-xs font-medium transition-colors duration-200 group-hover:text-[var(--accent-olive)]">{item.label}</span>
                        <span className="block text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden sm:block lg:col-span-2 space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-olive)' }}>Export</h4>
                <ul className="space-y-3">
                  {[
                    { label: 'PDF Documents', icon: FileDown },
                    { label: 'Markdown (.md)', icon: FileText },
                    { label: 'Anki Flashcards', icon: Layers },
                    { label: 'Obsidian / Notion', icon: Brain },
                    { label: 'Clipboard Copy', icon: Clipboard },
                  ].map((item) => (
                    <li key={item.label}>
                      <a
                        href="#"
                        className="group flex items-center gap-2.5 transition-all duration-200"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <item.icon className="w-3 h-3 shrink-0 transition-all duration-200" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs transition-colors duration-200 group-hover:text-[var(--accent-olive)]">{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Newsletter / Stay Connected Column (4 cols) */}
              <div className="sm:col-span-2 lg:col-span-4 space-y-3 sm:space-y-5">
                <div className="space-y-0.5 sm:space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-olive)' }}>Stay Connected</h4>
                  <p className="hidden sm:block text-xs" style={{ color: 'var(--text-muted)' }}>Get product updates and study tips.</p>
                </div>

                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="email"
                    placeholder="you@university.edu"
                    className="warm-input flex-1 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs"
                  />
                  <button
                    type="submit"
                    className="cta-btn px-3.5 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5"
                  >
                    Subscribe
                    <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                </form>

                <p className="hidden sm:block text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  No spam, ever. Unsubscribe anytime.
                </p>

                {/* Trust / Stats Mini Row - hidden on mobile to save space */}
                <div className="hidden sm:flex flex-wrap items-center gap-5 pt-1">
                  {[
                    { icon: Star, label: '1.2k+', sub: 'lectures processed' },
                    { icon: Users, label: '500+', sub: 'active users' },
                    { icon: TrendingUp, label: '98%', sub: 'satisfaction' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-2">
                      <stat.icon className="w-3 h-3 shrink-0" style={{ color: 'var(--accent-olive)' }} />
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{stat.label}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{stat.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bottom Bar ── */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 py-3.5 sm:py-6"
              style={{ borderTop: '1px solid var(--border-warm)' }}
            >
              <p className="text-[10px] sm:text-[11px] text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>
                &copy; {new Date().getFullYear()} Clipnote{' '}
                <span className="hidden sm:inline">&bull; Built with <Heart className="w-2.5 h-2.5 inline-block align-text-bottom animate-pulse" style={{ color: 'var(--accent-terracotta)' }} /> for students and educators.</span>
              </p>

              <div className="flex items-center gap-2 sm:gap-5 flex-wrap justify-center">
                {['Privacy', 'Terms', 'Contact'].map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-[10px] sm:text-[11px] font-medium transition-all duration-200 relative group whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {link}
                    <span
                      className="absolute -bottom-0.5 left-0 w-0 h-px transition-all duration-300 group-hover:w-full"
                      style={{ background: 'var(--accent-olive)' }}
                    />
                  </a>
                ))}
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-warm)', color: 'var(--text-muted)' }}
                  title="Back to top"
                >
                  <svg className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      {activeJobId && (
        <ExportModal
          jobId={activeJobId}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        lectures={historyLectures}
        onSelectLecture={(id) => {
          setActiveJobId(id);
          fetchResults(id);
        }}
        onDeleteLecture={handleDeleteLecture}
      />
    </div>
  );
}
