import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function assemblyAiTokenPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.ASSEMBLYAI_API_KEY || env.VITE_ASSEMBLYAI_API_KEY;

  return {
    name: 'assemblyai-token-endpoint',
    configureServer(server) {
      server.middlewares.use('/token', async (_request, response) => {
        if (!apiKey || apiKey === 'your_assemblyai_api_key_here') {
          response.statusCode = 500;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({
            error: 'Missing ASSEMBLYAI_API_KEY in .env.local',
          }));
          return;
        }

        try {
          const tokenResponse = await fetch(
            'https://agents.assemblyai.com/v1/token?product=voice_agent&expires_in_seconds=60',
            { headers: { Authorization: `Bearer ${apiKey}` } },
          );
          const body = await tokenResponse.text();

          response.statusCode = tokenResponse.status;
          response.setHeader('content-type', 'application/json');
          response.end(body);
        } catch (error) {
          response.statusCode = 502;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({
            error: `Unable to reach AssemblyAI: ${error.message}`,
          }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), assemblyAiTokenPlugin(mode)],
  server: {
    port: 3000,
    open: true,
  },
}));
