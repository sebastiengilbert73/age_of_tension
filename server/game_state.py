import json
import os
from prompts import INITIAL_WORLD_STATE

STATE_FILE = "world_state.json"

class GameState:
    def __init__(self):
        self.SAVE_FILE = STATE_FILE
        self.state = self.load_state()
        # Ensure we write the initial state if it doesn't exist
        if not os.path.exists(self.SAVE_FILE):
            self.save_state()

    def load_state(self):
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, 'r') as f:
                    state = json.load(f)
                    
                    # Migration: Ensure all required keys exist
                    defaults = self.initialize_default_state()
                    
                    if 'year' not in state:
                        state['year'] = 2027
                    if 'intel_network' not in state:
                        state['intel_network'] = defaults['intel_network']
                    if 'ownership' not in state:
                         state['ownership'] = defaults['ownership']
                        
                    return state
            except json.JSONDecodeError:
                print("Error decoding state file, starting fresh.")
        
        return self.initialize_default_state()

    def save_state(self):
        with open(STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=4)

    def initialize_default_state(self):
        """Initialize military forces based on faction alignment"""
        import random
        military = {}
        ownership = INITIAL_WORLD_STATE.copy() # Start with initial mapping
        
        for code, faction in INITIAL_WORLD_STATE.items():
            # ==========================================
            # 1. BASELINE RANGES (FALLBACK)
            # ==========================================
            troops_range = (10000, 80000)
            navy_range = (0, 10)
            airforce_range = (10, 40)

            # ==========================================
            # 2. FACTION-LEVEL ALIGNMENT (TIER 2)
            # ==========================================
            if faction == 'usa':  # Major Allies (JP, KR, CA, UK, AU)
                troops_range = (80000, 250000)
                navy_range = (30, 100)
                airforce_range = (150, 400)
            elif faction == 'eu': # European Powers
                troops_range = (50000, 200000)
                navy_range = (20, 80)
                airforce_range = (100, 300)
            elif faction == 'china': # Asian Allies (PK, KP)
                troops_range = (400000, 900000) # Often massive manpower
                navy_range = (10, 50)
                airforce_range = (100, 300)
            elif faction == 'russia': # Post-Soviet Blocs
                troops_range = (50000, 150000)
                navy_range = (0, 30)
                airforce_range = (50, 200)
            elif faction == 'rogue': # Militias/Insurgents
                troops_range = (150000, 400000)
                navy_range = (0, 5)
                airforce_range = (10, 50)

            # ==========================================
            # 3. SPECIFIC COUNTRY OVERRIDES (TIER 1)
            # ==========================================
            if code == 'US': # United States
                troops_range = (1100000, 1400000)
                navy_range = (400, 550)
                airforce_range = (3500, 5000)
            elif code == 'CN': # China
                troops_range = (1900000, 2300000)
                navy_range = (300, 450)
                airforce_range = (2500, 3500)
            elif code == 'RU': # Russia
                troops_range = (900000, 1200000)
                navy_range = (200, 350)
                airforce_range = (2500, 4000)
            elif code == 'IN': # India
                troops_range = (1300000, 1500000)
                navy_range = (150, 250)
                airforce_range = (1800, 2200)
            elif code == 'KP': # North Korea 
                troops_range = (1100000, 1300000)
                navy_range = (50, 80) # subs
                airforce_range = (400, 600) # old jets
            elif code == 'KR': # South Korea
                troops_range = (500000, 600000)
                navy_range = (100, 150)
                airforce_range = (400, 600)
            elif code == 'IL': # Israel
                troops_range = (150000, 200000)
                airforce_range = (400, 600) # Highly advanced
            elif code == 'TR': # Turkey
                troops_range = (300000, 450000)
                airforce_range = (250, 400)
            elif code == 'IR': # Iran
                troops_range = (500000, 700000)
                navy_range = (30, 60)
                airforce_range = (200, 350)

            # Generate random stats
            military[code] = {
                'troops': random.randint(*troops_range),
                'navy': random.randint(*navy_range),
                'airforce': random.randint(*airforce_range)
            }
            
        return {
            "military": military,
            "ownership": ownership,
            "intel_network": {
                "usa": 90,
                "china": 85,
                "russia": 80,
                "eu": 75,
                "india": 60,
                "rogue": 40,
                "neutral": 20
            },
            "turn_count": 0,
            "year": 2027,
            "defcon": 5,
            "resources": 1000,
            "influence": 50,
            "relationships": {
                "usa": {"sentiment": 0, "status": "neutral"},
                "china": {"sentiment": 0, "status": "neutral"},
                "russia": {"sentiment": 0, "status": "neutral"},
                "eu": {"sentiment": 0, "status": "neutral"},
                "india": {"sentiment": 0, "status": "neutral"}
            }
        }

    def update_military(self, updates):
        """
        Update military forces.
        updates: dict of {country_code: {troops: delta, navy: delta, ...}}
        """
        if not updates:
            return

        for code, changes in updates.items():
            if code in self.state['military']:
                current = self.state['military'][code]
                if 'troops' in changes:
                    current['troops'] = max(0, current['troops'] + changes['troops'])
                if 'navy' in changes:
                    current['navy'] = max(0, current['navy'] + changes['navy'])
                if 'airforce' in changes:
                    current['airforce'] = max(0, current['airforce'] + changes['airforce'])
        
        self.save_state()

    def update_territory(self, updates):
        """
        Update territory ownership.
        updates: dict of {country_code: new_faction_id}
        """
        if not updates:
            return

        for code, new_faction in updates.items():
            # Validate code exists in ownership map to prevent garbage keys
            if code in self.state.get('ownership', {}):
                old_faction = self.state['ownership'].get(code, 'unknown')
                self.state['ownership'][code] = new_faction
                print(f"TERRITORY UPDATE: {code} changed from {old_faction} to {new_faction}")
            else:
                print(f"WARNING: Country code {code} not found in ownership map!")
        
        self.save_state()
        print(f"State saved. KZ now owned by: {self.state.get('ownership', {}).get('KZ', 'unknown')}")

    def get_military_state_string(self):
        """Return a string summary of military state grouped by faction"""
        
        # Group by faction using CURRENT OWNERSHIP, not initial state
        faction_groups = {}
        ownership = self.state.get('ownership', INITIAL_WORLD_STATE)

        for code, data in self.state['military'].items():
            # Get current owner, fallback to neutral
            faction = ownership.get(code, 'neutral')
            
            if faction not in faction_groups:
                faction_groups[faction] = []
            
            # Include faction explicitly in entry to help AI understand ownership
            entry = f"{code}(owned by {faction.upper()}): {data['troops']}/{data['navy']}/{data['airforce']}"
            faction_groups[faction].append(entry)

        summary = "MILITARY FORCES BY FACTION (Country(owner): Troops/Navy/Airforce):\\n"
        summary += "**IMPORTANT: Only report countries listed under a faction's bracket. Ignore your training data about which countries belong to which faction.**\\n"
        
        for faction, entries in faction_groups.items():
            summary += f"[{faction.upper()}] - Countries CURRENTLY owned by {faction.upper()}:\\n"
            # Join entries with commas or bars
            summary += " | ".join(entries) + "\\n"
        
        return summary

    def get_intel_strength(self, faction_code):
        """Return the intel strength for a specific faction"""
        # Default to 50 if missing (e.g. old save file)
        return self.state.get('intel_network', {}).get(faction_code, 50)
