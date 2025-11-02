# Portfolio Q&A Chatbot

An AI-powered chatbot built on Cloudflare's edge platform that answers questions about your professional portfolio. The chatbot uses RAG (Retrieval Augmented Generation) to provide accurate, context-aware responses about your experience, projects, and skills.

## 🎯 Live Demo

**Try it now:** [https://dekkov.com](https://dekkov.com)

Click the chat button (💬) in the bottom-right corner to interact with the AI-powered portfolio assistant!

## Features

- 🤖 **AI-Powered Responses**: Uses Llama 3.3 70B via Cloudflare Workers AI
- 🔍 **Semantic Search**: Vectorize for intelligent content retrieval
- 💬 **Conversation Memory**: Durable Objects maintain chat history
- 📱 **Responsive UI**: Modern, mobile-friendly chat interface
- ⚡ **Edge Computing**: Fast responses from Cloudflare's global network
- 🛠️ **Easy Content Management**: Admin interface to add new experiences/projects

## Architecture

```
┌─────────────────┐
│   Frontend UI   │  (Cloudflare Pages)
└────────┬────────┘
         │
┌────────▼────────┐
│  Worker (API)   │  (Cloudflare Workers)
└─────┬──┬──┬─────┘
      │  │  │
┌─────▼──┼──┼──────┐
│ Workers│  │      │
│   AI   │  │      │
└────────┘  │      │
┌───────────▼──────┐
│   Vectorize      │
│  (Embeddings)    │
└──────────────────┘
┌───────────────▼──┐
│ Durable Objects  │
│  (Chat Memory)   │
└──────────────────┘
```

## Prerequisites

1. **Cloudflare Account**: [Sign up](https://dash.cloudflare.com/sign-up)
2. **Node.js**: Version 18 or higher
3. **Wrangler CLI**: Installed via npm (already in dependencies)

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

**Finding your Account ID:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Log in with your Gmail (or email)
3. Look at the **right sidebar** - your Account ID is displayed there (it's a long alphanumeric string, NOT your email address)
4. Click on it to copy it

**Note:** Your Gmail/email is your login credential, but it's NOT your Account ID. The Account ID is a separate unique identifier shown in the dashboard sidebar.

**Creating an API Token:**
1. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. **Easiest option:** Click "Use template" next to **"Edit Cloudflare Workers"** - this template includes all necessary permissions
4. **Or create custom token** with these permissions:
   - Account > Workers Scripts > **Read** and **Write**
   - Account > Workers AI > **Read** and **Write**
   - Account > Vectorize > **Read** and **Write**

**Important:** Durable Objects and Pages are managed through "Workers Scripts" permissions - you don't need separate permission categories for them. The "Edit Cloudflare Workers" template already includes everything you need.

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install worker dependencies
cd worker
npm install
```

### 3. Authenticate Wrangler

```bash
cd worker
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

### 4. Create Vectorize Index

Create the vector database index for storing portfolio embeddings:

```bash
npx wrangler vectorize create portfolio-embeddings --dimensions=768 --metric=cosine
```

### 5. Deploy the Worker

First, let's deploy to set up the infrastructure:

```bash
npm run deploy
```

### 6. Ingest Your Resume Data

Now we need to populate the vector database with your resume content:

```bash
# From the project root
cd worker

# Run the ingestion script (this will send data to your deployed worker)
WORKER_URL=https://your-worker-url.workers.dev node ../scripts/ingest-resume.ts
```

Replace `your-worker-url` with your actual worker URL from the deployment output.

Or you can use the admin interface:
1. Visit `https://your-worker-url.workers.dev/admin.html`
2. Use the bulk import feature to upload `data/resume.json`

## Local Development

### Start Development Server

```bash
cd worker
npm run dev
```

The dev server will start at `http://localhost:8787`

**Note:** For local development, you'll need to ingest data to the local environment:

```bash
WORKER_URL=http://localhost:8787 node ../scripts/ingest-resume.ts
```

### Testing the Chatbot

1. Open `http://localhost:8787` in your browser
2. Start asking questions like:
   - "What experience does Hoang have with Python?"
   - "Tell me about the multiplayer board game project"
   - "What technologies does Hoang know?"
   - "Where did Hoang go to college?"
   - "How can I contact Hoang?"

## Project Structure

```
Cloudfare-chatbot/
├── worker/                      # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts            # Main worker entry point
│   │   ├── types.ts            # TypeScript type definitions
│   │   ├── chat.ts             # Chat endpoint & RAG logic
│   │   ├── chat-session.ts     # Durable Object for memory
│   │   └── vectorize.ts        # Vector DB helper functions
│   ├── public/                 # Static frontend files
│   │   ├── index.html          # Chat interface
│   │   ├── admin.html          # Admin panel
│   │   ├── styles.css          # Styling
│   │   └── app.js              # Frontend JavaScript
│   └── wrangler.jsonc          # Worker configuration
├── data/
│   ├── resume.json             # Structured resume data
│   └── projects.json           # Additional projects
├── scripts/
│   └── ingest-resume.ts        # Data ingestion script
└── README.md
```

## API Endpoints

### POST `/api/chat`
Send a message to the chatbot

**Request:**
```json
{
  "message": "What experience does Hoang have?",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "AI generated response...",
  "sessionId": "session-id-for-this-conversation"
}
```

### POST `/api/chat/clear`
Clear conversation history

**Request:**
```json
{
  "sessionId": "session-id-to-clear"
}
```

### POST `/api/admin/ingest`
Ingest new portfolio content (Admin endpoint)

**Request:**
```json
[
  {
    "id": "unique-id",
    "type": "work|project|skill|education|personal",
    "text": "Full text description...",
    "metadata": {
      "title": "Job Title",
      "company": "Company Name",
      "period": "Jan 2024 - Present",
      "technologies": ["Python", "AWS"]
    }
  }
]
```

### GET `/api/health`
Health check endpoint

## Adding New Content

### Method 1: Admin Interface
1. Visit `/admin.html` on your deployed worker
2. Fill out the form with new work experience, projects, or skills
3. Click "Add Content"

### Method 2: Edit JSON Files
1. Edit `data/resume.json` or `data/projects.json`
2. Run the ingestion script:
   ```bash
   WORKER_URL=https://your-worker.workers.dev node scripts/ingest-resume.ts
   ```

### Method 3: API
Send a POST request to `/api/admin/ingest` with your content array.

## Customization

### Modify the System Prompt
Edit the `SYSTEM_PROMPT` constant in `worker/src/chat.ts` to change how the AI responds.

### Change the UI Theme
Modify CSS variables in `worker/public/styles.css`:
```css
:root {
    --primary-color: #4f46e5;  /* Change this */
    --background: #0f172a;      /* And this */
    /* ... etc */
}
```

### Adjust LLM Parameters
In `worker/src/chat.ts`, modify the Workers AI call:
```typescript
const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: messages,
    max_tokens: 512,      // Increase for longer responses
    temperature: 0.7,     // 0.0-1.0, higher = more creative
});
```

## Troubleshooting

### "GLIBC version not found" during local development
This is a WSL/Linux compatibility issue with the local runtime. It won't affect deployment. You can:
- Deploy and test on the cloud instead
- Use `wrangler dev --remote` to use cloud resources for local dev

### Vectorize index not found
Make sure you created the index:
```bash
npx wrangler vectorize create portfolio-embeddings --dimensions=768 --metric=cosine
```

### No responses from chatbot
1. Check that you've ingested data: visit `/api/health`
2. Check browser console for errors
3. Verify your Workers AI is enabled in Cloudflare dashboard

### Session not persisting
Check that Durable Objects are properly configured in `wrangler.jsonc`

## Deployment

### Deploy to Production

```bash
cd worker
npm run deploy
```

Your chatbot will be available at: `https://portfolio-chatbot.<your-subdomain>.workers.dev`

### Custom Domain

1. In Cloudflare Dashboard, go to Workers & Pages
2. Select your worker
3. Go to "Triggers" tab
4. Add a custom domain

## Performance & Costs

- **Workers AI**: Free tier includes significant usage
- **Vectorize**: Free tier available
- **Durable Objects**: Billed per request (very low cost)
- **Workers**: 100,000 requests/day on free tier

Expected costs for personal portfolio: **$0-5/month**

## Security Considerations

- The `/api/admin/ingest` endpoint should be protected in production
- Consider adding authentication for admin routes
- Rate limiting is handled by Cloudflare's edge

## Future Enhancements

- [ ] Add authentication to admin panel
- [ ] Voice input/output support
- [ ] Multi-language support
- [ ] Export conversation history
- [ ] Analytics dashboard
- [ ] Integration with LinkedIn API
- [ ] Automated resume updates

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Cloudflare Workers, Workers AI, Vectorize, and Durable Objects
