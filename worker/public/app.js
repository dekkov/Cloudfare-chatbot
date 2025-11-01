// Chat application state
let sessionId = localStorage.getItem('chatSessionId') || null;
let isWaitingForResponse = false;

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const statusElement = document.getElementById('status');

// API endpoint (change for production)
const API_BASE = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Send message on Enter (Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Button event listeners
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearConversation);

    // Focus input
    userInput.focus();
});

async function sendMessage() {
    const message = userInput.value.trim();

    if (!message || isWaitingForResponse) {
        return;
    }

    // Add user message to chat
    addMessage(message, 'user');

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Disable input while waiting
    setWaitingState(true);

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sessionId,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Save session ID
        if (data.sessionId) {
            sessionId = data.sessionId;
            localStorage.setItem('chatSessionId', sessionId);
        }

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Add assistant response
        addMessage(data.response, 'assistant');

        updateStatus('');
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator(typingId);
        addMessage(
            'Sorry, I encountered an error. Please try again or refresh the page.',
            'assistant',
            true
        );
        updateStatus('Error sending message', true);
    } finally {
        setWaitingState(false);
        userInput.focus();
    }
}

function addMessage(content, role, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (isError) {
        contentDiv.classList.add('error');
    }

    // Convert markdown-like formatting to HTML
    const formattedContent = formatContent(content);
    contentDiv.innerHTML = formattedContent;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    scrollToBottom();
}

function formatContent(text) {
    // Simple formatting for better readability
    let formatted = text
        // Code blocks
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');

    return formatted;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'message assistant-message';

    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'typing-indicator';
    indicatorDiv.innerHTML = '<span></span><span></span><span></span>';

    typingDiv.appendChild(indicatorDiv);
    chatMessages.appendChild(typingDiv);

    scrollToBottom();

    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function setWaitingState(waiting) {
    isWaitingForResponse = waiting;
    sendButton.disabled = waiting;
    userInput.disabled = waiting;

    if (waiting) {
        updateStatus('Thinking...');
    }
}

function updateStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.style.color = isError ? 'var(--error)' : 'var(--text-secondary)';
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function clearConversation() {
    if (!confirm('Are you sure you want to clear the conversation?')) {
        return;
    }

    try {
        if (sessionId) {
            await fetch(`${API_BASE}/api/chat/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId }),
            });
        }

        // Clear session
        sessionId = null;
        localStorage.removeItem('chatSessionId');

        // Clear messages (keep welcome message)
        const welcomeMessage = chatMessages.querySelector('.assistant-message');
        chatMessages.innerHTML = '';
        if (welcomeMessage) {
            chatMessages.appendChild(welcomeMessage.cloneNode(true));
        }

        updateStatus('Conversation cleared');
        setTimeout(() => updateStatus(''), 2000);
    } catch (error) {
        console.error('Error clearing conversation:', error);
        updateStatus('Error clearing conversation', true);
    }
}
