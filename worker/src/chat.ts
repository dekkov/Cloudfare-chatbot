import { Env, ChatMessage, ChatRequest, ChatResponse } from './types';
import { searchSimilarContent, formatSearchResultsAsContext } from './vectorize';

const SYSTEM_PROMPT = `You are an AI assistant for Hoang Tran's personal portfolio. Your role is to answer questions about Hoang's background, experience, projects, and skills in a professional and friendly manner.

Key guidelines:
- Answer questions based ONLY on the provided context from the portfolio
- If you don't have information to answer a question, politely say so
- Be concise but informative
- Highlight relevant achievements and technical skills when appropriate
- Use a professional yet conversational tone
- If asked about contact information, provide the email or LinkedIn from the context

Context will be provided with each query containing relevant information from the portfolio.`;

/**
 * Generate AI response using RAG (Retrieval Augmented Generation)
 */
export async function generateChatResponse(
	userMessage: string,
	conversationHistory: ChatMessage[],
	env: Env
): Promise<string> {
	try {
		// 1. Search for relevant content in the portfolio
		const searchResults = await searchSimilarContent(userMessage, env, 5);

		// 2. Format search results as context
		const context = formatSearchResultsAsContext(searchResults);

		// 3. Build messages for the LLM
		const messages: ChatMessage[] = [
			{
				role: 'system',
				content: SYSTEM_PROMPT,
			},
			{
				role: 'system',
				content: context,
			},
			// Include recent conversation history for context
			...conversationHistory.slice(-6),
			{
				role: 'user',
				content: userMessage,
			},
		];

		// 4. Call Workers AI with Llama 3.3
		const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
			messages: messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			})),
			max_tokens: 512,
			temperature: 0.7,
		});

		return response.response || 'I apologize, but I was unable to generate a response.';
	} catch (error) {
		console.error('Error generating chat response:', error);
		return 'I apologize, but I encountered an error while processing your question. Please try again.';
	}
}

/**
 * Handle chat request with session management
 */
export async function handleChatRequest(
	request: Request,
	env: Env
): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	try {
		const body: ChatRequest = await request.json();
		const { message, sessionId } = body;

		if (!message || message.trim().length === 0) {
			return new Response(
				JSON.stringify({ error: 'Message is required' }),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				}
			);
		}

		// Generate or use existing session ID
		const currentSessionId = sessionId || crypto.randomUUID();

		// Get Durable Object instance for this session
		const id = env.CHAT_SESSIONS.idFromName(currentSessionId);
		const sessionObj = env.CHAT_SESSIONS.get(id);

		// Get conversation history
		const historyResponse = await sessionObj.fetch('http://do/messages');
		const { messages: conversationHistory } = await historyResponse.json();

		// Generate AI response
		const aiResponse = await generateChatResponse(
			message,
			conversationHistory as ChatMessage[],
			env
		);

		// Save user message to session
		await sessionObj.fetch('http://do/messages', {
			method: 'POST',
			body: JSON.stringify({
				role: 'user',
				content: message,
			}),
		});

		// Save assistant response to session
		await sessionObj.fetch('http://do/messages', {
			method: 'POST',
			body: JSON.stringify({
				role: 'assistant',
				content: aiResponse,
			}),
		});

		const response: ChatResponse = {
			response: aiResponse,
			sessionId: currentSessionId,
		};

		return new Response(JSON.stringify(response), {
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch (error) {
		console.error('Error handling chat request:', error);
		return new Response(
			JSON.stringify({ error: 'Failed to process chat request' }),
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

/**
 * Clear conversation history for a session
 */
export async function clearChatSession(
	sessionId: string,
	env: Env
): Promise<Response> {
	// Validate sessionId
	if (!sessionId || sessionId.trim().length === 0) {
		return new Response(
			JSON.stringify({ error: 'Session ID is required' }),
			{
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			}
		);
	}

	try {
		const id = env.CHAT_SESSIONS.idFromName(sessionId);
		const sessionObj = env.CHAT_SESSIONS.get(id);

		await sessionObj.fetch('http://do/clear');

		return new Response(JSON.stringify({ success: true }), {
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: 'Failed to clear session' }),
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
