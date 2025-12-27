import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import Terminal from './components/Terminal'
import StatusPanel from './components/StatusPanel'
import WorldMap, { INITIAL_COUNTRY_TO_FACTION } from './components/WorldMap'
import FactionSelector from './components/FactionSelector'
import RandomEventModal from './components/RandomEventModal'
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [playerFaction, setPlayerFaction] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [gameState, setGameState] = useState({
    defcon: 5,
    year: 2027,
    year: 2027,
    budget: 1000,
    oil: 100,
    tech: 50,
    influence: 50,
    turn_count: 0
  })
  const [availableModels, setAvailableModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('example:latest')
  const [currentEvent, setCurrentEvent] = useState(null)
  const [relationships, setRelationships] = useState({})
  const [territories, setTerritories] = useState(INITIAL_COUNTRY_TO_FACTION)
  const [militaryData, setMilitaryData] = useState({})
  const [intelStrength, setIntelStrength] = useState(50)

  // Restore session state from sessionStorage on mount
  useEffect(() => {
    const savedSession = sessionStorage.getItem('gameSession')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        if (session.gameStarted) {
          setGameStarted(true)
          setPlayerFaction(session.playerFaction)
          setMessages(session.messages || [])
          setGameState(session.gameState)
          setRelationships(session.relationships || {})
          setTerritories(session.territories || INITIAL_COUNTRY_TO_FACTION)
          setSelectedModel(session.selectedModel || 'example:latest')
          setMilitaryData(session.militaryData || {})
          setIntelStrength(session.intelStrength || 50)
        }
      } catch (e) {
        console.error('Error restoring session:', e)
        sessionStorage.removeItem('gameSession')
      }
    }
  }, [])

  // Save session state to sessionStorage when it changes
  useEffect(() => {
    if (gameStarted) {
      const session = {
        gameStarted,
        playerFaction,
        messages,
        gameState,
        relationships,
        territories,
        selectedModel,
        militaryData,
        intelStrength
      }
      sessionStorage.setItem('gameSession', JSON.stringify(session))
    }
  }, [gameStarted, playerFaction, messages, gameState, relationships, territories, selectedModel, militaryData, intelStrength])

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get('/api/models')
        const models = response.data.models
        setAvailableModels(models)
        if (models.length > 0 && !models.includes(selectedModel)) {
          setSelectedModel(models[0])
        }
      } catch (error) {
        console.error('Error fetching models:', error)
      }
    }
    fetchModels()
  }, [])

  const handleFactionSelect = async (faction) => {
    setPlayerFaction(faction)
    setIsProcessing(true)

    try {
      // Request initial briefing from backend
      const response = await axios.post('/api/briefing', {
        faction: faction.id,
        factionName: faction.name,
        model: selectedModel
      })

      const { narrative, stats, relationships: initialRelationships } = response.data

      setMessages([
        { type: 'system', text: 'GLOBAL SECURITY NETWORK INITIALIZED...' },
        { type: 'system', text: `Welcome, Commander of ${faction.name}.` },
        { type: 'system', text: '' },
        { type: 'system', text: narrative },
        { type: 'system', text: '' },
        { type: 'system', text: 'Type your commands to manage global affairs.' }
      ])

      if (stats) {
        setGameState(prev => ({ ...prev, ...stats }))
      }

      if (initialRelationships) {
        setRelationships(initialRelationships)
      }

      // Sync map with persistent server state
      if (response.data.current_territories) {
        setTerritories(response.data.current_territories)
      }

      // Sync military data for hover info
      if (response.data.military_data) {
        setMilitaryData(response.data.military_data)
      }
      if (response.data.intel_strength) {
        setIntelStrength(response.data.intel_strength)
      }

      setGameStarted(true)
    } catch (error) {
      console.error('Error getting briefing:', error)
      setMessages([
        { type: 'system', text: 'ERROR: Failed to initialize briefing. Starting with default values.' },
        { type: 'system', text: `Welcome, Commander of ${faction.name}.` }
      ])
      setGameStarted(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userInput = input.trim()
    setInput('')
    setMessages(prev => [...prev, { type: 'user', text: userInput }])
    setIsProcessing(true)

    // Small delay to ensure "Processing..." indicator renders
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const response = await axios.post('/api/turn', {
        input: userInput,
        history: messages,
        model: selectedModel,
        faction: playerFaction?.id || 'usa' // Fallback to usa if not set
      })

      const { narrative, stats, event, relationships: updatedRelationships } = response.data

      // Store event for WorldMap
      if (event && event.triggered) {
        setCurrentEvent(event)
      }

      // Update relationships if provided
      if (updatedRelationships) {
        setRelationships(updatedRelationships)
      }

      // Update territories (Full sync prefers current_territories)
      if (response.data.current_territories) {
        setTerritories(response.data.current_territories)
      } else if (response.data.territory_updates) {
        setTerritories(prev => ({
          ...prev,
          ...response.data.territory_updates
        }))
      }

      // Update military data for hover info
      if (response.data.military_data) {
        setMilitaryData(response.data.military_data)
      }
      if (response.data.intel_strength) {
        setIntelStrength(response.data.intel_strength)
      }

      // Check if a random event was triggered
      // Only show crisis alert if BOTH type is "random_event" AND triggered is explicitly true
      const isRandomEvent = (
        event &&
        event.type === 'random_event' &&
        event.triggered === true
      )

      // Log event info for debugging
      console.log('Event data:', event, 'isRandomEvent:', isRandomEvent)

      if (isRandomEvent) {
        // Display random event with special formatting
        setMessages(prev => [...prev,
        { type: 'system', text: '' },
        { type: 'event', text: '⚠️ BREAKING: CRISIS ALERT ⚠️' },
        { type: 'event', text: narrative }
        ])
      } else {
        setMessages(prev => [...prev,
        { type: 'system', text: '' },
        { type: 'system', text: narrative }
        ])
      }

      if (stats) {
        // Map backend 'resources' to 'budget' if needed, or handle direct key match
        const newStats = { ...stats }
        if (newStats.resources !== undefined) {
          newStats.budget = newStats.resources
          delete newStats.resources
        }
        setGameState(prev => ({ ...prev, ...newStats }))
      }
    } catch (error) {
      console.error('Error processing turn:', error)
      setMessages(prev => [...prev,
      { type: 'system', text: 'ERROR: Communication with command center failed.' }
      ])
    } finally {
      setIsProcessing(false)
    }
  }


  const handleEventDismiss = () => {
    setCurrentEvent(null)
  }

  // Show faction selector if game hasn't started
  if (!gameStarted) {
    return (
      <FactionSelector
        onSelectFaction={handleFactionSelect}
        isProcessing={isProcessing}
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
      />
    )
  }

  return (
    <div className="app">
      <StatusPanel
        gameState={gameState}
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
      <button
        className="back-to-menu-btn"
        onClick={() => {
          // Update session to ensure we stay on menu if refreshed
          const savedSession = sessionStorage.getItem('gameSession')
          if (savedSession) {
            const session = JSON.parse(savedSession)
            session.gameStarted = false
            sessionStorage.setItem('gameSession', JSON.stringify(session))
          }
          setGameStarted(false)
        }}
      >
        ← MENU
      </button>

      <div className="main-content">
        <WorldMap
          gameState={gameState}
          currentEvent={currentEvent}
          playerFaction={playerFaction}
          relationships={relationships}
          territories={territories}
          militaryData={militaryData}
          intelStrength={intelStrength}
        />
        <Terminal
          messages={messages}
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
        />
      </div>

      <RandomEventModal
        event={currentEvent}
        onDismiss={handleEventDismiss}
      />
    </div>
  )
}

export default App
