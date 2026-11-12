import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function vercelDevApiPlugin(): Plugin {
  return {
    name: 'vercel-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] === '/api/chat') {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                // Vite SSR 로더를 통해 로컬에서도 api/chat.ts를 원활하게 실행
                const mod = await server.ssrLoadModule('/api/chat.ts');
                const handler = mod.default;

                (req as any).body = body ? JSON.parse(body) : {};

                const vercelRes: any = {
                  statusCode: 200,
                  status(code: number) {
                    this.statusCode = code;
                    res.statusCode = code;
                    return this;
                  },
                  setHeader(name: string, value: string) {
                    res.setHeader(name, value);
                    return this;
                  },
                  json(data: any) {
                    res.statusCode = this.statusCode || 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return this;
                  },
                  end(data?: any) {
                    res.end(data);
                    return this;
                  },
                };

                await handler(req as any, vercelRes);
              } catch (err: any) {
                console.error('[vercel-dev-api error]', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Internal dev server error' }));
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelDevApiPlugin()],
})
