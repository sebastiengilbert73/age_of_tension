from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
from prompts import get_game_master_prompt
from game_state import GameState

import datetime

app = FastAPI()
state_manager = GameState()

# Logging helper
def log(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlayerInput(BaseModel):
    input: str
    history: list = []
    model: str = "example:latest"  # Default model
    faction: str = "usa" # Default faction if not provided

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "example:latest"  # Changed to match installed model

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    log(f"VALIDATION ERROR: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
    )

@app.post("/api/turn")
async def process_turn(data: PlayerInput):
    """
    Process a player's turn by sending it to Ollama and returning the response
    """
    log(f"--> RECEIVED /api/turn REQUEST from {data.faction}")
    log(f"    Input: {data.input}")
    log(f"    History Length: {len(data.history)}")
    
    try:
        # Build conversation history for context
        messages = []
        
        # Get Intel Strength for this faction
        try:
            intel_strength = state_manager.get_intel_strength(data.faction)
        except Exception as e:
            print(f"ERROR getting intel strength: {e}")
            intel_strength = 50

        # Add system prompt
        try:
            military_str = state_manager.get_military_state_string()
            # Debug: Show which faction each country belongs to
            print(f"DEBUG: Military state groupings being sent to AI:")
            for line in military_str.split("\\n")[:20]:  # First 20 lines
                print(f"  {line}")
            prompt_content = get_game_master_prompt(
                data.faction, 
                state_manager.state, 
                military_str,
                intel_strength
            )
        except Exception as e:
            print("CRITICAL ERROR generating system prompt!")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Prompt generation failed: {str(e)}")

        messages.append({
            "role": "system",
            "content": prompt_content
        })
        
        # Add recent history (last 5 exchanges to manage context window)
        recent_history = data.history[-10:] if len(data.history) > 10 else data.history
        for msg in recent_history:
            role = "user" if msg.get("type") == "user" else "assistant"
            if msg.get("text"):
                messages.append({
                    "role": role,
                    "content": msg["text"]
                })
        
        # Add current player input
        messages.append({
            "role": "user",
            "content": data.input
        })
        
        # Call Ollama API
        log(f"Sending request to Ollama (Model: {data.model}, Context: 16384)...")
        try:
            ollama_response = requests.post(
                OLLAMA_URL,
                json={
                    "model": data.model,  # Use model from request
                    "messages": messages,
                    "stream": False,
                    "format": "json",  # Request JSON format
                    "options": {
                        "num_ctx": 16384
                    }
                },
                timeout=120
            )
            
            if ollama_response.status_code != 200:
                log(f"Ollama API Error: {ollama_response.status_code} - {ollama_response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Ollama API error: {ollama_response.text}"
                )
        except Exception as e:
            log(f"FAILED to connect to Ollama: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"LLM Connection Failed: {str(e)}")

        # Parse Ollama response
        log("Received response from Ollama. Parsing...")
        ollama_data = ollama_response.json()
        assistant_message = ollama_data.get("message", {}).get("content", "")
        
        # Check if response is empty
        if not assistant_message.strip():
            log("WARNING: Empty response from Ollama")
            raise HTTPException(
                status_code=500,
                detail="LLM returned empty response. Try again or check model."
            )
        
        # Parse the JSON response from the LLM
        try:
            game_response = json.loads(assistant_message)
            
            # Debug logging to see what the LLM returned
            log(f"DEBUG: LLM Response keys: {list(game_response.keys())}")
            
            if "reasoning" in game_response:
                log(f"🧠 AI REASONING: {game_response['reasoning']}")
                
            if "territory_updates" in game_response:
                log(f"DEBUG: territory_updates received: {game_response['territory_updates']}")
            else:
                log("WARNING: No territory_updates field in LLM response")
            
            # Process military updates
            if "military_updates" in game_response:
                state_manager.update_military(game_response["military_updates"])

            # Process territory updates
            if "territory_updates" in game_response:
                state_manager.update_territory(game_response["territory_updates"])

            # Process global stats updates (Resources, Turn Count, etc.)
            if "stats" in game_response:
                # Update individual keys to preserve existing ones not returned
                for key, value in game_response["stats"].items():
                    state_manager.state[key] = value
                
                # Use budget/resources mapping fallback for backend consistency if needed
                if "budget" in game_response["stats"]:
                    state_manager.state["resources"] = game_response["stats"]["budget"]
                
                state_manager.save_state()

            # Check for truncation and retry up to 2 times
            max_retries = 2
            retry_count = 0
            narrative = game_response.get("narrative", "")
            
            while narrative.strip().endswith("...") and retry_count < max_retries:
                retry_count += 1
                log(f"WARNING: Detected truncated response (attempt {retry_count}/{max_retries}), requesting continuation...")
                
                # Add the truncated response to messages and ask for continuation
                messages.append({
                    "role": "assistant",
                    "content": json.dumps(game_response)
                })
                messages.append({
                    "role": "user",
                    "content": "Your previous response was incomplete. Please continue and complete the narrative. Do not repeat what you already said, just continue from where you left off."
                })
                
                # Retry with continuation request
                retry_response = requests.post(
                    OLLAMA_URL,
                    json={
                        "model": data.model,
                        "messages": messages,
                        "stream": False,
                        "format": "json"
                    },
                    timeout=60
                )
                
                if retry_response.status_code == 200:
                    retry_data = retry_response.json()
                    retry_message = retry_data.get("message", {}).get("content", "")
                    
                    try:
                        # Parse the continuation
                        continuation = json.loads(retry_message)
                        # Combine narratives by removing ellipsis and adding continuation
                        if "narrative" in continuation:
                            continuation_text = continuation["narrative"].strip()
                            # Remove leading ellipsis from continuation if present
                            if continuation_text.startswith("..."):
                                continuation_text = continuation_text[3:].strip()
                            
                            game_response["narrative"] = narrative.rstrip(".").rstrip() + " " + continuation_text
                            narrative = game_response["narrative"]
                            log(f"Combined narrative, new length: {len(narrative)}")
                        else:
                            log("WARNING: Continuation missing narrative field")
                            break
                    except json.JSONDecodeError as e:
                        log(f"WARNING: Continuation failed to parse as JSON: {e}")
                        break
                else:
                    log(f"WARNING: Retry request failed with status {retry_response.status_code}")
                    break
            
            if retry_count > 0:
                if narrative.strip().endswith("..."):
                    log(f"WARNING: Response still truncated after {retry_count} retries")
                else:
                    log(f"SUCCESS: Completed truncated response after {retry_count} retries")
            
            # FIX: Handle common hallucinations where LLM wraps narrative in "response", "answer", etc.
            if "narrative" not in game_response:
                # Check for common hallucinated keys
                for bad_key in ["response", "answer", "content", "result", "output"]:
                    if bad_key in game_response:
                        log(f"WARNING: Found hallucinated key '{bad_key}', mapping to 'narrative'")
                        game_response["narrative"] = game_response[bad_key]
                        break
            
            # FIX: Handle structured data responses (e.g. "forces" list or dict) by converting to Markdown table
            # Normalize keys: check for forces, military_forces, and allied_territories
            forces_list = []
            should_convert = False
            
            # Helper to process a potential forces container (list or dict)
            def process_forces_container(container, context_label=""):
                items = []
                if isinstance(container, list):
                    items = container
                elif isinstance(container, dict):
                     for k, v in container.items():
                         if isinstance(v, dict):
                             v["country"] = v.get("country", k)
                             items.append(v)
                         # Handle single flat dict as one entry if it has troops
                         elif isinstance(v, (int, float)) and "troops" in container:
                             container["country"] = container.get("country", context_label)
                             items.append(container)
                             break
                return items

            # Check "forces"
            if "forces" in game_response:
                should_convert = True
                forces_list.extend(process_forces_container(game_response["forces"]))
            
            # Check "military_forces"
            if "military_forces" in game_response:
                should_convert = True
                forces_list.extend(process_forces_container(game_response["military_forces"], game_response.get("country", "Unknown")))

            # Check "allied_territories"
            if "allied_territories" in game_response:
                should_convert = True
                forces_list.extend(process_forces_container(game_response["allied_territories"]))

            if should_convert and forces_list:
                log("WARNING: Found structured military data. Converting to Markdown table.")
                
                # Create table header
                table_md = "\n\n| Country | Troops | Navy (Ships) | Air Force (Jets) |\n|---|---|---|---|\n"
                
                # Deduplicate by country name if needed, but for now just list them
                for force in forces_list:
                    # Handle different potential keys the LLM might use
                    country = force.get("country", force.get("name", "Unknown"))
                    troops = force.get("troops", force.get("army", 0))
                    navy = force.get("ships", force.get("navy", force.get("naval_vessels", force.get("naval_units", 0))))
                    air = force.get("aircraft", force.get("air_force", force.get("jets", 0)))
                    
                    # Format numbers with commas
                    table_md += f"| {country} | {troops:,} | {navy:,} | {air:,} |\n"
                
                # Append totals if available
                if "total_troops" in game_response:
                    table_md += f"\n**Total Strength**: {game_response.get('total_troops', 0):,} Troops, {game_response.get('total_ships', game_response.get('total_naval_units', 0)):,} Ships, {game_response.get('total_aircraft', 0):,} Aircraft"

                # Use provided message or default intro
                intro = game_response.get("message", "Here is the detailed breakdown of military forces:")
                game_response["narrative"] = f"{intro}\n{table_md}"
            
            # Ensure stats object exists and inject current true values where possible
            if "stats" not in game_response:
                game_response["stats"] = {}
                
            # Inject current Intel Strength so frontend can display it
            game_response["stats"]["intel"] = intel_strength
            
            # Validate required fields
            if "narrative" not in game_response:
                log("WARNING: Missing 'narrative' field in response")
                # Fallback: If it's a string, use it. If it's a dict, try to convert to string
                if isinstance(assistant_message, str):
                    game_response["narrative"] = assistant_message
                else:
                     game_response["narrative"] = str(assistant_message)
            
            if "relationships" not in game_response:
                game_response["relationships"] = {
                    "usa": {"sentiment": 0, "status": "neutral"},
                    "china": {"sentiment": 0, "status": "neutral"},
                    "russia": {"sentiment": 0, "status": "neutral"},
                    "eu": {"sentiment": 0, "status": "neutral"},
                    "india": {"sentiment": 0, "status": "neutral"}
                }
            
            # ------------------------------------------------------------------
            # STATE UPDATE LOGIC (DELTAS)
            # ------------------------------------------------------------------
            # 1. Handle Global Stats (Absolute)
            if "general_stats" in game_response:
                gen_stats = game_response["general_stats"]
                if "defcon" in gen_stats:
                    state_manager.state["defcon"] = gen_stats["defcon"]
                if "year" in gen_stats:
                    state_manager.state["year"] = gen_stats["year"]
            
            # 2. Handle Resource Updates (Deltas)
            if "resource_updates" in game_response:
                updates = game_response["resource_updates"]
                
                # Helper to apply delta with clamp
                def apply_delta(key, delta):
                    current = state_manager.state.get(key, 0)
                    new_val = max(0, current + delta)
                    state_manager.state[key] = new_val
                    return new_val

                apply_delta("resources", updates.get("budget", 0)) # Mapped to 'resources' internally
                apply_delta("oil", updates.get("oil", 0))
                apply_delta("tech", updates.get("tech", 0))
                apply_delta("influence", updates.get("influence", 0))

                # Increment turn count if not explicit
                state_manager.state["turn_count"] = state_manager.state.get("turn_count", 0) + 1
            
            # 3. Fallback for legacy 'stats' object (if LLM ignores instructions)
            elif "stats" in game_response:
                # If LLM returns absolute stats, we try to use them but warn
                log("WARNING: LLM returned absolute 'stats' instead of 'resource_updates'. Using as absolute values.")
                old_stats = game_response["stats"]
                for k, v in old_stats.items():
                    if k == 'budget': k = 'resources' # Map back
                    if k in state_manager.state:
                         state_manager.state[k] = v
            
            # Save the updated state
            state_manager.save_state()

            # ------------------------------------------------------------------
            # CONSTRUCT FRONTEND RESPONSE
            # ------------------------------------------------------------------
            # Frontend expects a single flattened 'stats' object with absolute values
            final_stats = {
                "defcon": state_manager.state.get("defcon", 5),
                "year": state_manager.state.get("year", 2027),
                "budget": state_manager.state.get("resources", 1000),
                "oil": state_manager.state.get("oil", 100),
                "tech": state_manager.state.get("tech", 50),
                "influence": state_manager.state.get("influence", 50),
                "turn_count": state_manager.state.get("turn_count", 0),
                "intel": intel_strength # Inject current intel
            }
            
            # Replace/Inject into game_response for frontend
            game_response["stats"] = final_stats
            
            if "event" not in game_response:
                game_response["event"] = {
                    "type": "player_response",
                    "triggered": False
                }
            else:
                # Validate event type - if it looks like a direct response to player input, 
                # it shouldn't be a random_event
                event = game_response.get("event", {})
                
                # Safety check: if narrative seems to be answering the player's question,
                # it should not be marked as random_event
                if event.get("type") == "random_event":
                    # Check if the recent player input is being directly addressed
                    player_input = data.input.lower()
                    narrative_lower = game_response.get("narrative", "").lower()
                    
                    # Common patterns that indicate a direct response
                    question_words = ["what", "how", "why", "when", "where", "who", "is", "are", "can", "will", "would"]
                    is_question = any(player_input.strip().startswith(word) for word in question_words)
                    
                    if is_question:
                        log(f"WARNING: Correcting event type - player asked a question: '{data.input[:50]}'")
                        game_response["event"] = {
                            "type": "player_response",
                            "triggered": False
                        }
            
            # Inject full territory state for frontend sync
            game_response["current_territories"] = state_manager.state.get("ownership", {})
            
            # Inject military data for hover info panel
            game_response["military_data"] = state_manager.state.get("military", {})
            game_response["intel_strength"] = state_manager.get_intel_strength(data.faction)

            return game_response
            
        except json.JSONDecodeError as e:
            # Fallback if LLM doesn't return valid JSON
            log(f"WARNING: Failed to parse JSON: {e}")
            log(f"Raw response: {assistant_message[:200]}...")
            return {
                "narrative": assistant_message if assistant_message else "Error: The AI system encountered an issue generating a response. Please try again.",
                "stats": {
                    "defcon": 5,
                    "year": 2027,
                    "resources": 1000,
                    "influence": 50,
                    "turn_count": 1
                },
                "event": {
                    "type": "player_response",
                    "triggered": False
                },
                "relationships": {
                    "usa": {"sentiment": 0, "status": "neutral"},
                    "china": {"sentiment": 0, "status": "neutral"},
                    "russia": {"sentiment": 0, "status": "neutral"},
                    "eu": {"sentiment": 0, "status": "neutral"},
                    "india": {"sentiment": 0, "status": "neutral"}
                }
            }
    
    except requests.exceptions.ConnectionError:
        log("ERROR: Cannot connect to Ollama")
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Make sure Ollama is running (ollama serve)"
        )
    except requests.exceptions.Timeout:
        log("ERROR: Ollama request timed out")
        raise HTTPException(
            status_code=504,
            detail="Ollama request timed out. The model might be processing."
        )
    except Exception as e:
        log(f"ERROR: Unexpected error occurred: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.post("/api/briefing")
async def generate_briefing(data: dict):
    """Generate initial world briefing based on selected faction"""
    from prompts import get_briefing_prompt
    
    try:
        faction_id = data.get("faction")
        faction_name = data.get("factionName")
        model = data.get("model", MODEL_NAME)
        
        log(f"Generating briefing for faction: {faction_name}")
        
        # Build the briefing request
        messages = [
            {
                "role": "system",
                "content": get_briefing_prompt(faction_id, faction_name)
            },
            {
                "role": "user",
                "content": "Generate the initial world briefing for my faction."
            }
        ]
        
        # Call Ollama
        ollama_response = requests.post(
            OLLAMA_URL,
            json={
                "model": model,
                "messages": messages,
                "stream": False,
                "format": "json"
            },
            timeout=60
        )
        
        if ollama_response.status_code != 200:
            log(f"ERROR: Ollama API error: {ollama_response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Ollama API error: {ollama_response.text}"
            )
        
        # Parse response
        ollama_data = ollama_response.json()
        assistant_message = ollama_data.get("message", {}).get("content", "")
        
        log(f"Ollama response received, length: {len(assistant_message)}")
        
        try:
            briefing_response = json.loads(assistant_message)
            
            # Check for truncation
            narrative = briefing_response.get("narrative", "")
            if narrative.strip().endswith("..."):
                log("WARNING: Detected truncated briefing, requesting continuation...")
                
                messages.append({
                    "role": "assistant",
                    "content": assistant_message
                })
                messages.append({
                    "role": "user",
                    "content": "Continue your briefing. Complete the narrative where you left off."
                })
                
                retry_response = requests.post(
                    OLLAMA_URL,
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False,
                        "format": "json"
                    },
                    timeout=60
                )
                
                if retry_response.status_code == 200:
                    retry_data = retry_response.json()
                    retry_message = retry_data.get("message", {}).get("content", "")
                    
                    try:
                        continuation = json.loads(retry_message)
                        if "narrative" in continuation:
                            briefing_response["narrative"] = narrative.rstrip("...") + " " + continuation["narrative"]
                        log("Successfully retrieved briefing continuation")
                    except json.JSONDecodeError:
                        log("WARNING: Briefing continuation failed to parse")
            
            if "relationships" not in briefing_response:
                briefing_response["relationships"] = {
                    "usa": {"sentiment": 0, "status": "neutral"},
                    "china": {"sentiment": 0, "status": "neutral"},
                    "russia": {"sentiment": 0, "status": "neutral"},
                    "eu": {"sentiment": 0, "status": "neutral"},
                    "india": {"sentiment": 0, "status": "neutral"}
                }
            
            # Inject full territory state for frontend sync
            briefing_response["current_territories"] = state_manager.state.get("ownership", {})
            
            # Inject military data for hover info panel
            briefing_response["military_data"] = state_manager.state.get("military", {})
            briefing_response["intel_strength"] = state_manager.get_intel_strength(data.get("faction", "usa"))

            return briefing_response
        except json.JSONDecodeError as e:
            log(f"WARNING: Failed to parse briefing JSON: {e}")
            return {
                "narrative": assistant_message if assistant_message else f"Welcome, Commander of {faction_name}. The world is in a state of heightened tension. Your decisions will shape the future of global affairs.",
                "stats": {
                    "defcon": 5,
                    "year": 2027,
                    "resources": 1000,
                    "influence": 50,
                    "turn_count": 0
                },
                "relationships": {
                    "usa": {"sentiment": 0, "status": "neutral"},
                    "china": {"sentiment": 0, "status": "neutral"},
                    "russia": {"sentiment": 0, "status": "neutral"},
                    "eu": {"sentiment": 0, "status": "neutral"},
                    "india": {"sentiment": 0, "status": "neutral"}
                }
            }
    
    except Exception as e:
        log(f"ERROR: Briefing generation failed: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate briefing: {str(e)}"
        )

@app.post("/api/reset")
async def reset_game():
    """Reset the game state to defaults"""
    import os
    import datetime
    
    log_file = "debug_server.log"
    timestamp = datetime.datetime.now().isoformat()
    
    log("--> RECEIVED /api/reset REQUEST")
    
    try:
        # Use robustness reset method
        state_manager.reset()
        log("Game state explicitly reset to defaults")
        return {"status": "success", "message": "Game reset successfully"}
    except Exception as e:
        log(f"Error resetting game: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset game: {e}")

@app.get("/api/models")
async def get_models():
    """Get list of available Ollama models"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = [model["name"] for model in data.get("models", [])]
            return {"models": models}
        else:
            raise HTTPException(status_code=500, detail="Failed to fetch models from Ollama")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Cannot connect to Ollama")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")

@app.get("/health")
async def health_check():
    """Check if the server and Ollama are running"""
    try:
        # Test Ollama connection
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        ollama_status = "connected" if response.status_code == 200 else "error"
    except:
        ollama_status = "disconnected"
    
    return {
        "server": "running",
        "ollama": ollama_status,
        "model": MODEL_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
