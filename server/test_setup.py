"""
Simple test script to verify the backend setup
"""
import sys

print("Testing Age of Tension Backend Setup...")
print("-" * 50)

# Test imports
print("\n1. Testing imports...")
try:
    from fastapi import FastAPI
    print("   ✓ FastAPI imported")
except ImportError as e:
    print(f"   ✗ FastAPI import failed: {e}")
    print("   Run: pip install fastapi")
    sys.exit(1)

try:
    import uvicorn
    print("   ✓ Uvicorn imported")
except ImportError as e:
    print(f"   ✗ Uvicorn import failed: {e}")
    print("   Run: pip install uvicorn")
    sys.exit(1)

try:
    import requests
    print("   ✓ Requests imported")
except ImportError as e:
    print(f"   ✗ Requests import failed: {e}")
    print("   Run: pip install requests")
    sys.exit(1)

try:
    from prompts import get_game_master_prompt
    print("   ✓ Prompts module imported")
except ImportError as e:
    print(f"   ✗ Prompts import failed: {e}")
    sys.exit(1)

# Test Ollama connection
print("\n2. Testing Ollama connection...")
try:
    response = requests.get("http://localhost:11434/api/tags", timeout=5)
    if response.status_code == 200:
        print(f"   ✓ Ollama is running")
        models = response.json().get("models", [])
        if models:
            print(f"   Available models: {', '.join([m['name'] for m in models])}")
        else:
            print("   ⚠ No models found. Run: ollama pull llama3")
    else:
        print(f"   ✗ Ollama returned status {response.status_code}")
except requests.exceptions.ConnectionError:
    print("   ✗ Cannot connect to Ollama")
    print("   Make sure Ollama is running: ollama serve")
except Exception as e:
    print(f"   ✗ Error: {e}")

print("\n" + "-" * 50)
print("If all checks passed, you can start the server with:")
print("  python main.py")
print("\nThen open http://localhost:5173 in your browser")
