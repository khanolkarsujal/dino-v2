import React, { useEffect, useState } from 'react';
import { ChevronRight, Film, Loader2, Play, Sparkles } from 'lucide-react';
import { STORY_CHAPTERS } from '../game/data';
import { soundEngine } from '../three/audio';

interface IntroCutsceneProps {
  customVideoUrl: string | null;
  onChapterChange: (chapterIdx: number) => void;
  onVideoGenerated: (url: string) => void;
  onFinishIntro: () => void;
}

export const IntroCutscene: React.FC<IntroCutsceneProps> = ({
  customVideoUrl,
  onChapterChange,
  onVideoGenerated,
  onFinishIntro,
}) => {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showCustomVideo, setShowCustomVideo] = useState(Boolean(customVideoUrl));

  useEffect(() => {
    setShowCustomVideo(Boolean(customVideoUrl));
  }, [customVideoUrl]);

  useEffect(() => {
    onChapterChange(chapterIdx);
    soundEngine.playStoryChord(chapterIdx);
  }, [chapterIdx, onChapterChange]);

  useEffect(() => {
    if (showCustomVideo) return;
    const chapter = STORY_CHAPTERS[chapterIdx];
    const start = performance.now();
    const durationMs = chapter.durationSec * 1000;

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      if (p >= 1) {
        if (chapterIdx < STORY_CHAPTERS.length - 1) {
          setChapterIdx((prev) => prev + 1);
          setProgress(0);
        } else {
          window.clearInterval(timer);
        }
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [chapterIdx, showCustomVideo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onFinishIntro();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (chapterIdx < STORY_CHAPTERS.length - 1) {
          setChapterIdx((prev) => prev + 1);
          setProgress(0);
        } else {
          onFinishIntro();
        }
      } else if (e.key === 'Enter' && chapterIdx === STORY_CHAPTERS.length - 1) {
        e.preventDefault();
        onFinishIntro();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chapterIdx, onFinishIntro]);

  const handleGenerateAiIntroVideo = async () => {
    setGeneratingVideo(true);
    setVideoError(null);
    try {
      const res = await fetch('/api/media/animate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aspectRatio: '16:9',
          prompt:
            'Dark atmospheric fantasy cinematic opening: four glowing violet obsidian caves erupt across a pine valley as a lone armored knight stokes a blazing campfire surrounded by four colorful dragon eggs under dusk storm clouds.',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate intro video.');
      }
      const url = data.videoBase64
        ? `data:${data.mimeType || 'video/mp4'};base64,${data.videoBase64}`
        : data.videoUri;
      if (!url) throw new Error('No video returned.');
      onVideoGenerated(url);
      setShowCustomVideo(true);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Video generation failed.');
    } finally {
      setGeneratingVideo(false);
    }
  };

  const chapter = STORY_CHAPTERS[chapterIdx];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Top Cinematic Letterbox Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div
          className="px-4 py-2 rounded border border-amber-500/30 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(11, 14, 20, 0.88)' }}
        >
          <Film className="w-4 h-4 text-amber-400" />
          <span className="font-display text-sm font-semibold tracking-wider text-amber-200">
            Chronicle of Elderglen
          </span>
          <span className="text-xs text-stone-400 font-mono-num">
            {showCustomVideo ? 'AI Video Cutscene' : `${chapterIdx + 1} / ${STORY_CHAPTERS.length}`}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenerateAiIntroVideo}
            disabled={generatingVideo}
            className="flex items-center gap-2 px-3.5 py-2 rounded border border-amber-500/40 bg-stone-900/95 hover:bg-stone-800 text-amber-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {generatingVideo ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            {generatingVideo ? 'Rendering Omni Video...' : 'Generate AI Video Intro'}
          </button>

          <button
            type="button"
            data-start="true"
            onClick={onFinishIntro}
            className="flex items-center gap-2 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Defense
          </button>
        </div>
      </div>

      {/* Optional AI Video Viewport */}
      {showCustomVideo && customVideoUrl && (
        <div className="my-auto mx-auto max-w-3xl w-full rounded-lg overflow-hidden border border-amber-500/40 shadow-2xl pointer-events-auto bg-black">
          <video
            src={customVideoUrl}
            controls
            autoPlay
            loop
            className="w-full max-h-[55vh] object-contain"
          />
          <div className="px-4 py-2 bg-stone-950 flex items-center justify-between text-xs text-stone-300">
            <span>Generated Storyline Video (gemini-omni-1.2-flash)</span>
            <button
              type="button"
              onClick={() => setShowCustomVideo(false)}
              className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Switch to 3D World Flythrough
            </button>
          </div>
        </div>
      )}

      {videoError && (
        <div
          className="mx-auto max-w-xl px-4 py-2.5 rounded border border-red-500/40 text-xs text-red-200 pointer-events-auto"
          style={{ backgroundColor: 'rgba(38, 12, 16, 0.92)' }}
        >
          {videoError}
        </div>
      )}

      {/* Bottom Storyline Subtitle & Act Controls */}
      <div
        className="max-w-3xl w-full mx-auto rounded-lg border border-amber-500/25 p-5 pointer-events-auto"
        style={{ backgroundColor: 'rgba(11, 14, 20, 0.92)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold tracking-widest uppercase text-amber-400">
              {chapter.act}
            </span>
            <span aria-hidden="true" className="text-stone-500">·</span>
            <h2 className="font-display text-lg font-bold text-stone-100">{chapter.title}</h2>
          </div>

          <div className="flex items-center gap-1.5">
            {STORY_CHAPTERS.map((c, idx) => (
              <button
                key={c.act}
                type="button"
                aria-label={`Jump to ${c.act}`}
                onClick={() => {
                  setShowCustomVideo(false);
                  setChapterIdx(idx);
                  setProgress(0);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === chapterIdx ? 'w-7 bg-amber-400' : 'w-2.5 bg-stone-600 hover:bg-stone-500'
                }`}
              />
            ))}
          </div>
        </div>

        <p className="text-sm md:text-base text-stone-200 leading-relaxed mb-4">
          {chapter.narration}
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-100"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          {chapterIdx < STORY_CHAPTERS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setChapterIdx((prev) => prev + 1);
                setProgress(0);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              Next Act
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinishIntro}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Enter Kingdom
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
