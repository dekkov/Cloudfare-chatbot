import { Env, PortfolioContent, VectorSearchResult } from './types';

/**
 * Generate embeddings using Workers AI
 */
export async function generateEmbedding(text: string, env: Env): Promise<number[]> {
	const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
		text: [text],
	}) as { data: Array<number[]> };

	// Extract the embedding array from the response
	// Workers AI returns { data: [[...embedding...]] }
	return response.data[0];
}

/**
 * Search for relevant content in the vector database
 */
export async function searchSimilarContent(
	query: string,
	env: Env,
	topK: number = 5
): Promise<VectorSearchResult[]> {
	try {
		// Generate embedding for the query
		const queryEmbedding = await generateEmbedding(query, env);

		// Search in Vectorize
		const results = await env.VECTORIZE.query(queryEmbedding, {
			topK,
			returnMetadata: 'all',
		});

		return results.matches.map((match) => ({
			id: match.id,
			score: match.score,
			metadata: match.metadata,
		}));
	} catch (error) {
		console.error('Error searching vector database:', error);
		return [];
	}
}

/**
 * Insert portfolio content into the vector database
 */
export async function insertPortfolioContent(
	content: PortfolioContent,
	env: Env
): Promise<boolean> {
	try {
		const embedding = await generateEmbedding(content.text, env);

		await env.VECTORIZE.upsert([
			{
				id: content.id,
				values: embedding,
				metadata: {
					type: content.type,
					text: content.text,
					...content.metadata,
				},
			},
		]);

		return true;
	} catch (error) {
		console.error('Error inserting content:', error);
		return false;
	}
}

/**
 * Batch insert multiple portfolio contents
 */
export async function batchInsertPortfolioContent(
	contents: PortfolioContent[],
	env: Env
): Promise<{ success: number; failed: number }> {
	let success = 0;
	let failed = 0;

	// Process in batches of 10 to avoid rate limits
	const batchSize = 10;
	for (let i = 0; i < contents.length; i += batchSize) {
		const batch = contents.slice(i, i + batchSize);

		const results = await Promise.allSettled(
			batch.map((content) => insertPortfolioContent(content, env))
		);

		results.forEach((result) => {
			if (result.status === 'fulfilled' && result.value) {
				success++;
			} else {
				failed++;
			}
		});
	}

	return { success, failed };
}

/**
 * Format search results into context for the LLM
 */
export function formatSearchResultsAsContext(results: VectorSearchResult[]): string {
	if (results.length === 0) {
		return 'No relevant information found in the portfolio.';
	}

	let context = 'Relevant information from the portfolio:\n\n';

	results.forEach((result, index) => {
		const metadata = result.metadata;
		context += `[${index + 1}] ${metadata.text}\n`;
		if (metadata.title) {
			context += `   Title: ${metadata.title}\n`;
		}
		if (metadata.company) {
			context += `   Company: ${metadata.company}\n`;
		}
		if (metadata.period) {
			context += `   Period: ${metadata.period}\n`;
		}
		if (metadata.technologies && metadata.technologies.length > 0) {
			context += `   Technologies: ${metadata.technologies.join(', ')}\n`;
		}
		context += '\n';
	});

	return context;
}
