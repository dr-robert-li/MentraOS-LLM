// Import and export the SessionManager for Durable Objects
export { MentraOSSessionManager } from './SessionManager';

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
            webhook: 'POST /webhook',
            test: 'POST /api/test'
          }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // MentraOS webhook endpoint for receiving events
      if (url.pathname === '/webhook' && request.method === 'POST') {
        const body = await request.json() as any;
        
        // Log the webhook event for debugging
        console.log('MentraOS webhook received:', JSON.stringify(body, null, 2));
        
        // Process different types of MentraOS events
        const eventType = body.type || body.event_type || 'unknown';
        
        let processedResponse: any = {
          status: 'received',
          event_type: eventType,
          timestamp: new Date().toISOString(),
          processed: true
        };

        // Handle specific MentraOS event types
        switch (eventType) {
          case 'notification':
            processedResponse.message = 'Notification event processed';
            processedResponse.notifications_count = Array.isArray(body.notifications) ? body.notifications.length : 1;
            break;
            
          case 'location':
            processedResponse.message = 'Location event processed';
            processedResponse.location_data = body.location ? 'received' : 'missing';
            break;
            
          case 'user_context':
            processedResponse.message = 'User context event processed';
            processedResponse.context_keys = body.context ? Object.keys(body.context) : [];
            break;
            
          case 'health_check':
            processedResponse.message = 'Health check from MentraOS';
            processedResponse.api_status = 'healthy';
            processedResponse.features = ['perplexity', 'gpt-5', 'notifications', 'location'];
            break;
            
          default:
            processedResponse.message = `Unknown event type: ${eventType}`;
            processedResponse.raw_data_keys = Object.keys(body);
        }
        
        return new Response(JSON.stringify(processedResponse), {
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
          request: {
            provider: body.provider || 'not specified in request',
            model: body.model || 'not specified in request',
            message: body.message || 'Hello from MentraOS!'
          },
          configured: {
            provider: env.LLM_PROVIDER || 'not configured',
            model: env.LLM_MODEL || 'not configured'
          },
          environment: {
            timestamp: new Date().toISOString(),
            api_keys_available: {
              openai: !!env.OPENAI_API_KEY,
              perplexity: !!env.PERPLEXITY_API_KEY,
              anthropic: !!env.ANTHROPIC_API_KEY,
              google: !!env.GOOGLE_API_KEY,
              azure: !!env.AZURE_OPENAI_API_KEY
            }
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
        available_endpoints: ['/health', '/api/info', '/webhook', '/api/test']
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
