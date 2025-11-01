import { DurableObject } from 'cloudflare:workers';
import { ChatMessage } from './types';

export class ChatSession extends DurableObject {
	private messages: ChatMessage[] = [];
	private readonly MAX_MESSAGES = 50;

	constructor(ctx: DurableObjectState, env: any) {
		super(ctx, env);
		this.ctx.blockConcurrencyWhile(async () => {
			const stored = await this.ctx.storage.get<ChatMessage[]>('messages');
			if (stored) {
				this.messages = stored;
			}
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		switch (path) {
			case '/messages':
				if (request.method === 'GET') {
					return this.getMessages();
				} else if (request.method === 'POST') {
					return this.addMessage(request);
				}
				break;
			case '/clear':
				return this.clearHistory();
			default:
				return new Response('Not Found', { status: 404 });
		}

		return new Response('Method not allowed', { status: 405 });
	}

	private async getMessages(): Promise<Response> {
		return new Response(JSON.stringify({ messages: this.messages }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	private async addMessage(request: Request): Promise<Response> {
		try {
			const message: ChatMessage = await request.json();
			message.timestamp = Date.now();

			this.messages.push(message);

			// Keep only the last MAX_MESSAGES
			if (this.messages.length > this.MAX_MESSAGES) {
				this.messages = this.messages.slice(-this.MAX_MESSAGES);
			}

			await this.ctx.storage.put('messages', this.messages);

			return new Response(JSON.stringify({ success: true }), {
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			return new Response(JSON.stringify({ error: 'Invalid message format' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}

	private async clearHistory(): Promise<Response> {
		this.messages = [];
		await this.ctx.storage.put('messages', this.messages);

		return new Response(JSON.stringify({ success: true }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	/**
	 * Get conversation history formatted for LLM context
	 */
	async getConversationContext(): Promise<ChatMessage[]> {
		// Return last 10 messages for context
		return this.messages.slice(-10);
	}
}
