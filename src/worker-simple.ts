// Simplified Cloudflare Workers entry point with minimal dependencies
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);
    
    try {
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'OK', 
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          features: ['perplexity', 'gpt-5', 'notifications', 'location'],
          providers: ['openai', 'anthropic', 'google', 'azure', 'perplexity']
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // API info endpoint
      if (url.pathname === '/api/info') {
        return new Response(JSON.stringify({
          name: 'MentraOS LLM API',
          description: 'AI-powered smart glasses platform with multi-LLM support',
          features: {
            providers: ['OpenAI (GPT-5, GPT-4o)', 'Perplexity (Sonar)', 'Anthropic (Claude 4)', 'Google (Gemini 2.0)', 'Azure OpenAI'],
            capabilities: ['Notification filtering', 'Location awareness', 'Search enhancement', 'Context integration']
          },
          endpoints: {
            health: 'GET /health',
            info: 'GET /api/info',
            test: 'POST /api/test'
          }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Simple test endpoint without LLM dependencies
      if (url.pathname === '/api/test' && request.method === 'POST') {
        const body = await request.json() as { provider?: string; model?: string; message?: string };
        
        return new Response(JSON.stringify({ 
          status: 'success',
          message: 'MentraOS LLM API is ready',
          echo: {
            provider: body.provider || 'not specified',
            model: body.model || 'not specified',
            message: body.message || 'Hello from MentraOS!'
          },
          environment: {
            timestamp: new Date().toISOString(),
            provider_configured: !!env.OPENAI_API_KEY || !!env.PERPLEXITY_API_KEY || !!env.ANTHROPIC_API_KEY,
          }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Default 404 response
      return new Response(JSON.stringify({
        error: 'Not Found',
        available_endpoints: ['/health', '/api/info', '/api/test']
      }), { 
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
