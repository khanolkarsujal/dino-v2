import React, { useState } from 'react';
import { Brain, Film, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import type { GameState } from '../game/engine';

interface MediaStudioModalProps {
  gameState: GameState;
  onVideoCreated: (url: string) => void;
  onClose: () => void;
}

type StudioTab = 'video' | 'image' | 'strategy';

export const MediaStudioModal: React.FC<MediaStudioModalProps> = ({
  gameState,
  onVideoCreated,
  onClose,
}) => {
  const [tab, setTab] = useState<StudioTab>('video');

  // Video Animator state (gemini-omni-1.2-flash)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [uploadMime, setUploadMime] = useState<string>('image/png');
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoPrompt, setVideoPrompt] = useState(
    'Dramatic fantasy intro: embers swirl upward from the stone campfire while four dragon eggs glow and storm clouds gather over obsidian caves.',
  );
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // High-Quality Image Generator state (gemini-3-pro-image-preview)
  const [imgPrompt, setImgPrompt] = useState(
    'Painterly fantasy key art of an armored knight guarding a glowing stone campfire at dusk beside an ember drake, deep pine forest and four purple obsidian caves in the distance.',
  );
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imgAspect, setImgAspect] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);

  // High-Thinking Strategist state (gemini-4-carbon, ThinkingLevel.HIGH)
  const [strategyQuery, setStrategyQuery] = useState(
    'Given my current resources, caves remaining, and dragon squad, what is the strongest build order and tactical plan for the upcoming night wave?',
  );
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategyAnswer, setStrategyAnswer] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setUploadPreview(result);
      const comma = result.indexOf(',');
      setUploadBase64(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async () => {
    setVideoLoading(true);
    setVideoError(null);
    try {
      const res = await fetch('/api/media/animate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadBase64,
          mimeType: uploadMime,
          prompt: videoPrompt,
          aspectRatio: videoRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video generation failed.');
      const url = data.videoBase64
        ? `data:${data.mimeType || 'video/mp4'};base64,${data.videoBase64}`
        : data.videoUri;
      if (!url) throw new Error('No video returned from model.');
      setGeneratedVideoUrl(url);
      onVideoCreated(url);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Failed to generate video.');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    setImgLoading(true);
    setImgError(null);
    try {
      const res = await fetch('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imgPrompt,
          imageSize: imgSize,
          aspectRatio: imgAspect,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed.');
      const dataUrl = `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`;
      setGeneratedImgUrl(dataUrl);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : 'Failed to generate image.');
    } finally {
      setImgLoading(false);
    }
  };

  const handleAnalyzeStrategy = async () => {
    setStrategyLoading(true);
    setStrategyError(null);
    try {
      const res = await fetch('/api/strategy/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: strategyQuery,
          snapshot: {
            wave: gameState.wave,
            isNight: gameState.isNight,
            campfireHp: Math.round(gameState.campfireHp),
            campfireMaxHp: gameState.campfireMaxHp,
            wood: Math.round(gameState.resources.wood),
            stone: Math.round(gameState.resources.stone),
            ember: Math.round(gameState.resources.ember),
            dragonsCount: gameState.dragons.length,
            cavesAlive: gameState.caves.filter((c) => c.alive).length,
            squadCommand: gameState.squadCommand,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Strategy request failed.');
      setStrategyAnswer(data.advice);
    } catch (err) {
      setStrategyError(err instanceof Error ? err.message : 'Strategy analysis failed.');
    } finally {
      setStrategyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-6" style={{ backgroundColor: 'rgba(8, 11, 16, 0.88)' }}>
      <div
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg border border-amber-500/35 p-6 shadow-2xl"
        style={{ backgroundColor: 'rgba(16, 20, 27, 0.98)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-amber-100">
              Kingdom Storyline, Media & Tactical Studio
            </h2>
            <p className="text-xs text-stone-400">
              Create custom intro videos, 1K-4K kingdom artwork, or consult the Elder Strategist.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Studio"
            onClick={onClose}
            className="w-8 h-8 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Controls */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-md bg-stone-900 border border-stone-800 mb-5">
          <button
            type="button"
            onClick={() => setTab('video')}
            className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-medium cursor-pointer ${
              tab === 'video' ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" /> Photo to Intro Video
          </button>
          <button
            type="button"
            onClick={() => setTab('image')}
            className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-medium cursor-pointer ${
              tab === 'image' ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> 1K-4K Key Art
          </button>
          <button
            type="button"
            onClick={() => setTab('strategy')}
            className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-medium cursor-pointer ${
              tab === 'strategy' ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-300 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> Elder Strategist
          </button>
        </div>

        {tab === 'video' && (
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Upload Reference Photo (optional — leave empty to generate from story prompt)
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded border border-dashed border-stone-600 hover:border-amber-400 bg-stone-900/70 cursor-pointer text-xs text-stone-300">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{uploadPreview ? 'Change Uploaded Photo' : 'Choose Photo (PNG / JPG)'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              </label>
              {uploadPreview && (
                <img
                  src={uploadPreview}
                  alt="Uploaded reference"
                  className="mt-2 max-h-40 rounded border border-stone-700 object-contain"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Animation / Storyline Direction
                </label>
                <textarea
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['16:9', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setVideoRatio(ratio)}
                      className={`py-2 rounded border text-xs font-mono-num cursor-pointer ${
                        videoRatio === ratio
                          ? 'border-amber-400 bg-amber-600 text-stone-950 font-semibold'
                          : 'border-stone-700 bg-stone-900 text-stone-300'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={videoLoading}
              onClick={handleGenerateVideo}
              className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-stone-950 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {videoLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {videoLoading ? 'Animating Video with Omni Flash...' : 'Generate Intro Video'}
            </button>

            {videoError && (
              <div className="p-3 rounded border border-red-500/40 bg-red-950/50 text-xs text-red-200">
                {videoError}
              </div>
            )}

            {generatedVideoUrl && (
              <div className="rounded border border-stone-700 overflow-hidden bg-black">
                <video src={generatedVideoUrl} controls autoPlay loop className="w-full max-h-64" />
                <div className="px-3 py-2 bg-stone-900 text-xs text-emerald-300">
                  Saved as active Game Intro Cutscene!
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'image' && (
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Kingdom Artwork Prompt
              </label>
              <textarea
                rows={3}
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Resolution Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setImgSize(sz)}
                      className={`py-2 rounded border text-xs font-mono-num cursor-pointer ${
                        imgSize === sz
                          ? 'border-amber-400 bg-amber-600 text-stone-950 font-semibold'
                          : 'border-stone-700 bg-stone-900 text-stone-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['16:9', '1:1', '9:16'] as const).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setImgAspect(ar)}
                      className={`py-2 rounded border text-xs font-mono-num cursor-pointer ${
                        imgAspect === ar
                          ? 'border-amber-400 bg-amber-600 text-stone-950 font-semibold'
                          : 'border-stone-700 bg-stone-900 text-stone-300'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={imgLoading}
              onClick={handleGenerateImage}
              className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-stone-950 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {imgLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {imgLoading ? `Rendering ${imgSize} Image...` : `Generate ${imgSize} Kingdom Artwork`}
            </button>

            {imgError && (
              <div className="p-3 rounded border border-red-500/40 bg-red-950/50 text-xs text-red-200">
                {imgError}
              </div>
            )}

            {generatedImgUrl && (
              <div className="space-y-2">
                <img
                  src={generatedImgUrl}
                  alt="Generated Kingdom Artwork"
                  className="w-full max-h-72 object-contain rounded border border-stone-700 bg-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    const comma = generatedImgUrl.indexOf(',');
                    setUploadPreview(generatedImgUrl);
                    setUploadBase64(comma >= 0 ? generatedImgUrl.slice(comma + 1) : generatedImgUrl);
                    setUploadMime('image/png');
                    setTab('video');
                  }}
                  className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs text-amber-300 cursor-pointer"
                >
                  Animate This Artwork into Video
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'strategy' && (
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded bg-stone-900 border border-stone-800 text-xs text-stone-300 font-mono-num">
              Live Snapshot: Wave {gameState.wave}/15 · Wood {Math.round(gameState.resources.wood)} · Stone{' '}
              {Math.round(gameState.resources.stone)} · Ember {Math.round(gameState.resources.ember)} · Dragons{' '}
              {gameState.dragons.length} · Caves {gameState.caves.filter((c) => c.alive).length}/4
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Ask the Elder Strategist (High Thinking)
              </label>
              <textarea
                rows={3}
                value={strategyQuery}
                onChange={(e) => setStrategyQuery(e.target.value)}
                className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="button"
              disabled={strategyLoading}
              onClick={handleAnalyzeStrategy}
              className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-stone-950 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {strategyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {strategyLoading ? 'Deep Reasoning in Progress...' : 'Consult Elder Strategist'}
            </button>

            {strategyError && (
              <div className="p-3 rounded border border-red-500/40 bg-red-950/50 text-xs text-red-200">
                {strategyError}
              </div>
            )}

            {strategyAnswer && (
              <div className="p-4 rounded border border-amber-500/30 bg-stone-900 text-xs md:text-sm text-stone-200 leading-relaxed whitespace-pre-wrap">
                {strategyAnswer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
