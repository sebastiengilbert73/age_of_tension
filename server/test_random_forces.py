from game_state import GameState
import json

def test_random_forces():
    print("Testing Randomized Military Forces...")
    gs = GameState()
    
    # Generate a fresh state (simulating a new game)
    fresh_state = gs.initialize_default_state()
    military = fresh_state['military']
    
    countries_to_check = ['US', 'CN', 'RU', 'KP', 'KR', 'JP', 'GB', 'IR', 'AF']
    
    print(f"{'Country':<10} {'Troops':<15} {'Navy':<10} {'Airforce':<10}")
    print("-" * 50)
    
    for code in countries_to_check:
        if code in military:
            data = military[code]
            print(f"{code:<10} {data['troops']:<15} {data['navy']:<10} {data['airforce']:<10}")
            
    # Verify randomness by generating again
    print("\nVerifying Randomness (Run 2)...")
    fresh_state_2 = gs.initialize_default_state()
    military_2 = fresh_state_2['military']
    
    us_1 = military['US']['troops']
    us_2 = military_2['US']['troops']
    
    print(f"US Troops Run 1: {us_1}")
    print(f"US Troops Run 2: {us_2}")
    
    if us_1 != us_2:
        print("SUCCESS: Values are random.")
    else:
        print("WARNING: Values are identical (could be chance, but unlikely for large range).")

if __name__ == "__main__":
    test_random_forces()
