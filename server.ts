import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 400, message: raw };
  }
  if (/403|PERMISSION_DENIED|API_KEY_INVALID/i.test(raw)) {
    return {
      status: 403,
      message: 'API key missing or unauthorized. Please configure a valid GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (/429|RESOURCE_EXHAUSTED|quota|billing|paid/i.test(raw)) {
    return {
      status: 429,
      message: 'This model requires a paid-tier GEMINI_API_KEY or has reached quota. Select a billing-enabled key in Settings > Secrets.',
    };
  }
  return { status: 500, message: raw };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // 1. Animate uploaded photo or generate intro storyline video via gemini-omni-1.2-flash (Interactions API)
  app.post('/api/media/animate-image', async (req, res) => {
    try {
      const { imageBase64, mimeType, prompt, aspectRatio } = req.body ?? {};
      const validRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
      const motionPrompt =
        typeof prompt === 'string' && prompt.trim().length > 0
          ? prompt.trim()
          : 'Cinematic fantasy cutscene: glowing embers drift over an ancient stone campfire surrounded by dark pines as a guardian dragon spreads its wings under twilight skies.';

      const ai = getAiClient();
      const input =
        typeof imageBase64 === 'string' && imageBase64.length > 0
          ? [
              {
                type: 'image' as const,
                mime_type: typeof mimeType === 'string' ? mimeType : 'image/png',
                data: imageBase64,
              },
              {
                type: 'text' as const,
                text: motionPrompt,
              },
            ]
          : motionPrompt;

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: validRatio,
            duration: '6s',
          },
        },
        { timeout: 300000 },
      );

      const videoPart = interaction.output_video;
      if (!videoPart || (!videoPart.data && !videoPart.uri)) {
        return res.status(502).json({ error: 'Video model returned no video output.' });
      }

      return res.json({
        mimeType: videoPart.mime_type || 'video/mp4',
        videoBase64: videoPart.data || null,
        videoUri: videoPart.uri || null,
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      return res.status(status).json({ error: message });
    }
  });

  // 2. High-quality 1K / 2K / 4K image generation via gemini-3-pro-image-preview
  app.post('/api/media/generate-image', async (req, res) => {
    try {
      const { prompt, imageSize, aspectRatio } = req.body ?? {};
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Please provide an image prompt.' });
      }
      const validSize = imageSize === '2K' || imageSize === '4K' ? imageSize : '1K';
      const validAspect =
        aspectRatio === '9:16' || aspectRatio === '1:1' || aspectRatio === '4:3'
          ? aspectRatio
          : '16:9';

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt.trim() }],
        },
        config: {
          imageConfig: {
            aspectRatio: validAspect,
            imageSize: validSize,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return res.json({
            mimeType: part.inlineData.mimeType || 'image/png',
            imageBase64: part.inlineData.data,
            imageSize: validSize,
          });
        }
      }

      return res.status(502).json({ error: 'Image model did not return an image part.' });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      return res.status(status).json({ error: message });
    }
  });

  // 3. High-Thinking Kingdom Tactician & Story Chronicler via gemini-4-carbon (ThinkingLevel.HIGH)
  app.post('/api/strategy/analyze', async (req, res) => {
    try {
      const { question, snapshot } = req.body ?? {};
      if (typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: 'Please enter a tactical or storyline question.' });
      }

      const ai = getAiClient();
      const contextSummary = snapshot
        ? `Current Kingdom Snapshot: Wave ${snapshot.wave}/15 (${snapshot.isNight ? 'Night Defense' : 'Day Prep'}), Campfire HP ${snapshot.campfireHp}/${snapshot.campfireMaxHp}, Resources (Wood ${snapshot.wood}, Stone ${snapshot.stone}, Ember ${snapshot.ember}), Dragons ${snapshot.dragonsCount}, Alive Monster Caves ${snapshot.cavesAlive}/4, Squad Order: ${snapshot.squadCommand}.`
        : 'Context: Early kingdom establishment in Dragon Campfire: Kingdom of Embers.';

      const response = await ai.models.generateContent({
        model: 'gemini-4-carbon',
        contents: `${contextSummary}\n\nGuardian Query: ${question.trim()}`,
        config: {
          systemInstruction:
            'You are the Elder Ember Strategist of Elderglen. Give sharp, concrete tactical recommendations (under 180 words) grounded in Dragon Campfire: Kingdom of Embers mechanics: Wood/Stone/Ember economy, daily Day Prep -> Night Raid waves, Kingdom Two Crowns-style 4-sided auto perimeter walls (dragons are 50% weaker without a wall and +50% to +100% stronger with intact walls), 4 Dragon roles (Fire AoE, Ice freeze/slow, Earth frontline tank, Electric chain stun), Training Grounds & leveling dragons to meet Cave Level requirements (Lv 2, 3, 4, 5), and 4 Monster Caves.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      return res.json({
        advice: response.text || 'Hold the hearth and rally your drakes before dusk.',
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      return res.status(status).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Dragon Campfire server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
