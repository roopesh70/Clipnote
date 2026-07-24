'use client';

import React, { useState } from 'react';
import { Download, FileText, FileCode, Layers, X, Check } from 'lucide-react';

interface ExportModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ jobId, isOpen, onClose }) => {
  const [withAnswers, setWithAnswers] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = (format: 'pdf' | 'md' | 'anki') => {
    setDownloadingFormat(format);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://clipnote-1-nbeu.onrender.com';
    const exportUrl = `${apiBaseUrl}/api/lectures/${jobId}/export?format=${format}&with_answers=${withAnswers}`;

    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `clipnote_export.${format === 'anki' ? 'txt' : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingFormat(null);
    }, 1000);
  };

  const formats = [
    {
      key: 'pdf' as const,
      title: 'PDF Document',
      desc: 'Formatted summary, notes & concept tables',
      icon: FileText,
      accentColor: 'var(--accent-olive)',
      accentBg: 'rgba(123, 140, 62, 0.1)',
    },
    {
      key: 'md' as const,
      title: 'Markdown Document (.md)',
      desc: 'Clean text format for Obsidian / Notion',
      icon: FileCode,
      accentColor: 'var(--accent-brown)',
      accentBg: 'rgba(139, 111, 71, 0.1)',
    },
    {
      key: 'anki' as const,
      title: 'Anki Flashcards (.txt)',
      desc: 'Importable flashcard deck for spaced repetition',
      icon: Layers,
      accentColor: 'var(--accent-terracotta)',
      accentBg: 'rgba(193, 127, 89, 0.1)',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="warm-card w-full max-w-md p-6 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h3 className="font-display text-xl flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Download className="w-5 h-5" style={{ color: 'var(--accent-olive)' }} />
            Export Study Material
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Choose your preferred export format.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl text-xs" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border-warm)' }}>
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Include Quiz Answer Keys</span>
          <button
            onClick={() => setWithAnswers(!withAnswers)}
            className="w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5"
            style={{ background: withAnswers ? 'var(--accent-olive)' : 'var(--border-strong)' }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
              style={{ transform: withAnswers ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Export Buttons */}
        <div className="space-y-3">
          {formats.map((fmt) => (
            <button
              key={fmt.key}
              onClick={() => handleExport(fmt.key)}
              disabled={downloadingFormat === fmt.key}
              className="w-full flex items-center justify-between p-4 rounded-xl transition-all group"
              style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-warm)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = fmt.accentColor)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-warm)')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg transition-transform group-hover:scale-105" style={{ background: fmt.accentBg, color: fmt.accentColor }}>
                  <fmt.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt.desc}</p>
                </div>
              </div>
              {downloadingFormat === fmt.key
                ? <Check className="w-4 h-4 animate-bounce" style={{ color: fmt.accentColor }} />
                : <Download className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: 'var(--text-muted)' }} />
              }
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
