import { LLMProvider } from './utils/LLMProvider';

// Cloudflare Workers entry point
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
        return new Response(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // LLM test endpoint
      if (url.pathname === '/llm/test' && request.method === 'POST') {
        const body = await request.json() as { provider?: string; model?: string; message?: string };
        
        // Set environment variables from Cloudflare Workers env
        process.env.LLM_PROVIDER = body.provider || env.LLM_PROVIDER || 'openai';
        process.env.LLM_MODEL = body.model || env.LLM_MODEL || 'gpt-4o';
        process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
        process.env.AZURE_OPENAI_API_KEY = env.AZURE_OPENAI_API_KEY;
        process.env.AZURE_OPENAI_API_INSTANCE_NAME = env.AZURE_OPENAI_API_INSTANCE_NAME;
        process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME = env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
        process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY;
        process.env.GOOGLE_PROJECT_ID = env.GOOGLE_PROJECT_ID;
        process.env.PERPLEXITY_API_KEY = env.PERPLEXITY_API_KEY;

        const llm = LLMProvider.getLLM();
        const response = await llm.invoke(body.message || 'Hello, this is a test message.');

        return new Response(JSON.stringify({ 
          response: response.content,
          provider: process.env.LLM_PROVIDER,
          model: process.env.LLM_MODEL
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Default 404 response
      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
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
