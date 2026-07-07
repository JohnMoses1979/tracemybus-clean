# TraceMyBus GroqCloud Chatbot Setup

The chatbot backend now uses GroqCloud OpenAI-compatible Chat Completions. Keep the Groq API key only in the backend/server environment. Do not put it in the Expo frontend `.env`.

## Important security note

If you shared your API key in chat, screenshots, GitHub, or anywhere public, delete/revoke that key in GroqCloud and create a new one. Never commit the real key to the project.

## 1. Set GroqCloud key in PowerShell

Open PowerShell in the backend folder:

```powershell
cd C:\Users\bliss\OneDrive\Desktop\tracemybus\backend
$env:GROQ_API_KEY="paste_your_new_groq_api_key_here"
$env:GROQ_MODEL="llama-3.1-8b-instant"
$env:GROQ_CHAT_URL="https://api.groq.com/openai/v1/chat/completions"
.\mvnw.cmd spring-boot:run
```

For better quality, you can use:

```powershell
$env:GROQ_MODEL="llama-3.3-70b-versatile"
```

## 2. Test status

```powershell
Invoke-RestMethod http://localhost:8080/api/chat/status
```

Expected:

```json
{"ok":true,"provider":"GroqCloud","configured":true,"model":"llama-3.1-8b-instant"}
```

## 3. Test chat

```powershell
Invoke-RestMethod -Method Post http://localhost:8080/api/chat `
  -ContentType "application/json" `
  -Body '{"message":"Where is my bus?","systemPrompt":"You are TraceMyBus assistant."}'
```

## 4. Production deploy

Set these environment variables on your server/Render/AWS, then restart the backend:

```text
GROQ_API_KEY=your_new_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_CHAT_URL=https://api.groq.com/openai/v1/chat/completions
```
