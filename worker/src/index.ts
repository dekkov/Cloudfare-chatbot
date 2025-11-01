import { Env, PortfolioContent } from './types';
import { handleChatRequest, clearChatSession } from './chat';
import { batchInsertPortfolioContent } from './vectorize';

export { ChatSession } from './chat-session';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}

		// Route handling
		switch (url.pathname) {
			case '/api/chat':
				return handleChatRequest(request, env);

			case '/api/chat/clear':
				if (request.method === 'POST') {
					const { sessionId } = await request.json();
					return clearChatSession(sessionId, env);
				}
				return new Response('Method not allowed', {
					status: 405,
					headers: {
						'Access-Control-Allow-Origin': '*',
					},
				});

			case '/api/admin/ingest':
				// Admin endpoint to ingest portfolio data
				if (request.method === 'POST') {
					// Optional API key authentication
					if (env.ADMIN_API_KEY) {
						const authHeader = request.headers.get('Authorization');
						const providedKey = authHeader?.replace('Bearer ', '');

						if (providedKey !== env.ADMIN_API_KEY) {
							return new Response(
								JSON.stringify({ error: 'Unauthorized' }),
								{
									status: 401,
									headers: {
										'Content-Type': 'application/json',
										'Access-Control-Allow-Origin': '*',
									},
								}
							);
						}
					}

					try {
						const contents: PortfolioContent[] = await request.json();
						const result = await batchInsertPortfolioContent(contents, env);

						return new Response(JSON.stringify(result), {
							headers: {
								'Content-Type': 'application/json',
								'Access-Control-Allow-Origin': '*',
							},
						});
					} catch (error) {
						return new Response(
							JSON.stringify({ error: 'Failed to ingest data' }),
							{
								status: 500,
								headers: {
									'Content-Type': 'application/json',
									'Access-Control-Allow-Origin': '*',
								},
							}
						);
					}
				}
				return new Response('Method not allowed', {
					status: 405,
					headers: {
						'Access-Control-Allow-Origin': '*',
					},
				});

			case '/api/health':
				return new Response(
					JSON.stringify({
						status: 'ok',
						timestamp: new Date().toISOString(),
					}),
					{
						headers: { 'Content-Type': 'application/json' },
					}
				);

			default:
				// Serve static assets from /public
				return env.ASSETS.fetch(request);
		}
	},
} satisfies ExportedHandler<Env>;
