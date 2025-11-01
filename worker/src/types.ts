export interface Env {
	AI: Ai;
	VECTORIZE: VectorizeIndex;
	CHAT_SESSIONS: DurableObjectNamespace;
	ASSETS: Fetcher;
	ADMIN_API_KEY?: string;
}

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: number;
}

export interface ChatRequest {
	message: string;
	sessionId?: string;
}

export interface ChatResponse {
	response: string;
	sessionId: string;
	sources?: string[];
}

export interface PortfolioContent {
	id: string;
	type: 'personal' | 'education' | 'work' | 'project' | 'skill';
	text: string;
	metadata: {
		title?: string;
		company?: string;
		period?: string;
		technologies?: string[];
		[key: string]: any;
	};
}

export interface VectorSearchResult {
	id: string;
	score: number;
	metadata: any;
	values?: number[];
}
