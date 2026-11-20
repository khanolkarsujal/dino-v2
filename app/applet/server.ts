import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use(express.json());

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // API endpoint for Gemini AI Dino Coach with High Thinking Mode
  app.post('/api/ai-coach', async (req, res) => {
    try {
      const { score, speed, obstaclesDodged, gameMode, question } = req.body;
      
      const prompt = `You are the expert Dino AI Coach for the Chrome T-Rex Runner game (AI Studio Edition).
Current Game Stats:
- Score: ${score}
- Game Speed: ${speed}
- Obstacles Dodged: ${obstaclesDodged}
- Game Mode: ${gameMode}
Player Question / Request: "${question || 'Give me tactical advice to beat my high score!'}"

Provide a witty, encouraging, and highly tactical response to help the player master timing, jumping over pterodactyls, ducking under cacti, and achieving a legendary high score. Use dinosaur puns and gaming wisdom.`;

      let responseText = "Keep running and jump with precise timing!";
      
      if (process.env.GEMINI_API_KEY) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: 'models/gemini-4-carbon',
            contents: prompt,
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.HIGH
              },
              temperature: 0.7
            }
          });
          if (aiResponse.text) {
            responseText = aiResponse.text;
          }
        } catch (aiErr) {
          console.warn("Gemini AI API call failed, falling back to heuristic advice:", aiErr);
          // Fallback to flash if carbon fails or rate limits
          try {
            const fallbackResponse = await ai.models.generateContent({
              model: 'models/gemini-2.5-flash',
              contents: prompt,
              config: {
                temperature: 0.7
              }
            });
            if (fallbackResponse.text) {
              responseText = fallbackResponse.text;
            }
          } catch (e) {
            responseText = `🦖 Coach Tip: When speed exceeds 12, start your jump slightly earlier before the cactus! You've dodged ${obstaclesDodged} obstacles so far—keep that momentum going!`;
          }
        }
      } else {
        responseText = `🦖 Coach Tip: At score ${score}, obstacle frequency increases! Time your jumps carefully and duck early for low-flying pterodactyls.`;
      }

      res.json({ advice: responseText });
    } catch (error: any) {
      console.error('Error in /api/ai-coach:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API endpoint for generating AI Daily Challenges
  app.post('/api/generate-challenge', async (req, res) => {
    try {
      const prompt = `Generate a fun, creative daily challenge for the Chrome T-Rex Dino Runner game. 
Return a JSON object with:
- "title": string (catchy challenge name)
- "description": string (rules or goal, e.g. "Survive 500 points in Night mode without collecting shields")
- "targetScore": number (e.g. 350)
- "rewardTitle": string (e.g. "Cyber T-Rex Badge")`;

      let challenge = {
        title: "Pterodactyl Peak",
        description: "Reach score 400 while dodging high-flying pterodactyls in Hardcore mode!",
        targetScore: 400,
        rewardTitle: "Sky Master Badge"
      };

      if (process.env.GEMINI_API_KEY) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });
          if (aiResponse.text) {
            challenge = JSON.parse(aiResponse.text);
          }
        } catch (e) {
          console.warn("AI Challenge generation failed, using default:", e);
        }
      }

      res.json({ challenge });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
