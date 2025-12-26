"""
Simple test to verify Ollama is generating events correctly
"""
import requests
import json

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "example:latest"

# Simplified system prompt with event instruction
system_prompt = """You are a Game Master. Generate random events occasionally.
Respond with JSON:
{
    "narrative": "...",
    "stats": {"defcon": 5, "year": 2027, "resources": 1000, "influence": 50, "turn_count": 1},
    "event": {"type": "random_event", "triggered": true}
}

On every 3rd turn, generate a random crisis event and set event.triggered to true."""

messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": "Assess the situation"}
]

print("Testing Ollama event generation...")
print(f"URL: {OLLAMA_URL}")
print(f"Model: {MODEL_NAME}\n")

try:
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "messages": messages,
            "stream": False,
            "format": "json"
        },
        timeout=60
    )
    
    if response.status_code == 200:
        data = response.json()
        content = data.get("message", {}).get("content", "")
        
        print("Raw response:")
        print(content)
        print("\n" + "="*50 + "\n")
        
        try:
            parsed = json.loads(content)
            print("Parsed JSON:")
            print(json.dumps(parsed, indent=2))
            
            if "event" in parsed:
                print("\n✅ Event object found!")
                print(f"Type: {parsed['event'].get('type')}")
                print(f"Triggered: {parsed['event'].get('triggered')}")
            else:
                print("\n⚠️ No event object in response")
                
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
    else:
        print(f"❌ Ollama returned status {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Error: {e}")
