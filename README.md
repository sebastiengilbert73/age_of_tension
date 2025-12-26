# Age of Tension

A web-based strategy game powered by AI, set in a near-future world of global tension and AI superpowers.

## Prerequisites

- Python 3.8+ with pip
- Node.js 16+ with npm
- [Ollama](https://ollama.ai) installed and running locally
- An Ollama model installed (e.g., `llama3` or `mistral`)

## Setup

### 1. Install Ollama Model
```bash
ollama pull llama3
# OR
ollama pull mistral
```

### 2. Install Server Dependencies
```bash
cd server
pip install -r requirements.txt
```

### 3. Install Client Dependencies
```bash
cd client
npm install
```

## Running the Game

You need to run three components:

### 1. Start Ollama (if not already running)
```bash
ollama serve
```

### 2. Start the Backend Server
```bash
cd server
python main.py
```
Server will run on `http://localhost:8000`

### 3. Start the Frontend
```bash
cd client
npm run dev
```
Frontend will run on `http://localhost:5173`

### 4. Open in Browser
Navigate to `http://localhost:5173` and start playing!

## Configuration

To change the Ollama model, edit `server/main.py` and modify:
```python
MODEL_NAME = "llama3"  # Change to your preferred model
```

## Gameplay

Type natural language commands to interact with the game world:
- "Assess the current situation"
- "Deploy cyber warfare against rivals"
- "Negotiate a peace treaty"
- "Invest in AI research"
- "What are my options?"

The game tracks:
- **DEFCON**: Defense readiness level (5=peace, 1=imminent war)
- **Year**: Current game year
- **Resources**: Available computational resources
- **Influence**: Your global influence percentage

## Troubleshooting

- **"Cannot connect to Ollama"**: Make sure Ollama is running with `ollama serve`
- **Model not found**: Install the model with `ollama pull llama3`
- **Slow responses**: LLM processing can take 10-30 seconds depending on your hardware
