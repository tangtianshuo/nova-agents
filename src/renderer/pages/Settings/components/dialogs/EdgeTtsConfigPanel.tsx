/**
 * EdgeTtsConfigPanel - Edge TTS voice synthesis configuration panel
 *
 * Configuration panel for Edge TTS voice synthesis settings.
 * Includes voice selection, rate, pitch, and volume controls.
 */
import { Loader2, Play, Square, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';

/**
 * EdgeTtsConfigPanel Props
 */
export interface EdgeTtsConfigPanelProps {
  open: boolean;
  serverId: string;
  initialConfig?: EdgeTtsConfig;
  onSave: (config: EdgeTtsConfig) => Promise<void>;
  onCancel: () => void;
}

export interface EdgeTtsConfig {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  outputFormat: string;
}

const DEFAULT_CONFIG: EdgeTtsConfig = {
  voice: 'zh-CN-XiaoxiaoNeural',
  rate: 0,
  pitch: 0,
  volume: 0,
  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
};

const VOICE_PRESETS = [
  { id: 'zh-CN-XiaoxiaoNeural', label: '晓晓 · 甜美女声' },
  { id: 'zh-CN-YunxiNeural', label: '云希 · 叙事男声' },
  { id: 'zh-CN-XiaomoNeural', label: '晓墨 · 温柔女声' },
  { id: 'zh-CN-YunjianNeural', label: '云健 · 新闻男声' },
  { id: 'en-US-JennyNeural', label: 'Jenny · English' },
  { id: 'en-US-GuyNeural', label: 'Guy · English' },
];

const OUTPUT_FORMATS = [
  { id: 'audio-24khz-48kbitrate-mono-mp3', label: 'MP3（推荐）' },
  { id: 'webm-24khz-16bit-mono-opus', label: 'WebM' },
  { id: 'ogg-24khz-16bit-mono-opus', label: 'OGG' },
];

// Custom range input styling with accent-colored thumb
const SLIDER_CLASS =
  'w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--line)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110';

export default function EdgeTtsConfigPanel({
  open,
  serverId: _serverId,
  initialConfig,
  onSave,
  onCancel,
}: EdgeTtsConfigPanelProps) {
  const toast = useToast();

  // Form state
  const [config, setConfig] = useState<EdgeTtsConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  // Preview state
  const [previewText, setPreviewText] = useState('你好，这是一段语音合成测试。Hello, this is a text-to-speech test.');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Click-outside-to-close pattern
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Reset form when panel opens
  useEffect(() => {
    if (open) {
      setConfig(initialConfig ?? DEFAULT_CONFIG);
      setIsSaving(false);
      setPreviewText('你好，这是一段语音合成测试。Hello, this is a text-to-speech test.');
      setPreviewLoading(false);
      setPreviewPlaying(false);
      setPreviewAudioUrl(null);
    }
  }, [open, initialConfig]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  // Field update helper
  const updateConfig = useCallback(<K extends keyof EdgeTtsConfig>(key: K, value: EdgeTtsConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset slider to default
  const handleResetSlider = useCallback((key: 'rate' | 'pitch' | 'volume') => {
    updateConfig(key, 0);
  }, [updateConfig]);

  // Preview TTS
  const handlePreview = useCallback(async () => {
    if (previewPlaying) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPreviewPlaying(false);
      return;
    }

    if (!previewText.trim()) {
      toast.error('请输入试听文本');
      return;
    }

    setPreviewLoading(true);
    try {
      // In a real implementation, this would call the TTS API
      // For now, we'll simulate the preview
      toast.info('试听功能开发中');
    } catch (err) {
      const message = err instanceof Error ? err.message : '试听失败';
      toast.error(message);
    } finally {
      setPreviewLoading(false);
    }
  }, [previewPlaying, previewText, toast]);

  // Save handler
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(config);
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [config, onSave, toast]);

  const formatSliderValue = (value: number, suffix: string) => {
    return `${value >= 0 ? '+' : ''}${value}${suffix}`;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        className="mx-4 w-full max-w-lg flex flex-col max-h-[85vh] rounded-2xl bg-[var(--paper-elevated)] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--ink)]">Edge TTS 语音合成 设置</h2>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              配置微软 Edge 语音合成参数
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--paper-inset)] hover:text-[var(--ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Free service notice */}
          <div className="rounded-lg bg-[var(--success-bg)] border border-[var(--success)]/20 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--success)]">
              <Play className="h-3.5 w-3.5" />
              免费服务，无需 API Key，开箱即用
            </div>
          </div>

          {/* Default Voice */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">默认语音</label>
            <input
              type="text"
              value={config.voice}
              onChange={e => updateConfig('voice', e.target.value)}
              placeholder="zh-CN-XiaoxiaoNeural"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 outline-none focus:border-[var(--accent)] font-mono"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VOICE_PRESETS.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => updateConfig('voice', v.id)}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    config.voice === v.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--paper-inset)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Output Format */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ink)]">输出格式</label>
            <div className="flex gap-2">
              {OUTPUT_FORMATS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => updateConfig('outputFormat', f.id)}
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    config.outputFormat === f.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--paper-inset)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Parameters Divider */}
          <div className="border-t border-[var(--line)] pt-4">
            <span className="text-sm font-medium text-[var(--ink-muted)]">语音参数</span>
          </div>

          {/* Rate Slider */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--ink-muted)]">语速</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--ink)]">
                  {formatSliderValue(config.rate, '%')}
                </span>
                {config.rate !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetSlider('rate')}
                    className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)]"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={-100}
              max={200}
              step={10}
              value={config.rate}
              onChange={e => updateConfig('rate', parseInt(e.target.value, 10))}
              className={SLIDER_CLASS}
            />
            <div className="flex justify-between text-[10px] text-[var(--ink-muted)] opacity-50">
              <span>-100%</span>
              <span>+200%</span>
            </div>
          </div>

          {/* Volume Slider */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--ink-muted)]">音量</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--ink)]">
                  {formatSliderValue(config.volume, '%')}
                </span>
                {config.volume !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetSlider('volume')}
                    className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)]"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={10}
              value={config.volume}
              onChange={e => updateConfig('volume', parseInt(e.target.value, 10))}
              className={SLIDER_CLASS}
            />
            <div className="flex justify-between text-[10px] text-[var(--ink-muted)] opacity-50">
              <span>-100%</span>
              <span>+100%</span>
            </div>
          </div>

          {/* Pitch Slider */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--ink-muted)]">音调</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--ink)]">
                  {formatSliderValue(config.pitch, 'Hz')}
                </span>
                {config.pitch !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetSlider('pitch')}
                    className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)]"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={10}
              value={config.pitch}
              onChange={e => updateConfig('pitch', parseInt(e.target.value, 10))}
              className={SLIDER_CLASS}
            />
            <div className="flex justify-between text-[10px] text-[var(--ink-muted)] opacity-50">
              <span>-100Hz</span>
              <span>+100Hz</span>
            </div>
          </div>

          {/* Preview Section Divider */}
          <div className="border-t border-[var(--line)] pt-4">
            <span className="text-sm font-medium text-[var(--ink-muted)]">试听</span>
          </div>

          {/* Preview */}
          <div>
            <div className="flex gap-2">
              <textarea
                value={previewText}
                onChange={e => setPreviewText(e.target.value)}
                rows={2}
                placeholder="输入试听文本..."
                className="resize-none flex-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewLoading || !previewText.trim()}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50"
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : previewPlaying ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--ink)] bg-[var(--button-secondary-bg)] hover:bg-[var(--button-secondary-bg-hover)] transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--button-primary-text)] bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
