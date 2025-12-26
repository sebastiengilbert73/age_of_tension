import { motion } from 'framer-motion'
import { useState } from 'react'

const FACTIONS = [
    {
        id: 'usa',
        name: 'North American Alliance',
        description: 'Technological leader with the most advanced AI systems. Strong alliances but facing internal divisions.',
        color: '#4169E1'
    },
    {
        id: 'china',
        name: 'People\'s Republic of China',
        description: 'Rising superpower with massive computational resources. Expanding global influence through economic ties.',
        color: '#DC143C'
    },
    {
        id: 'eu',
        name: 'European Union',
        description: 'Collective power focused on regulation and ethical AI. Strong diplomatic network but fragmented politically.',
        color: '#003399'
    },
    {
        id: 'russia',
        name: 'Russian Federation',
        description: 'Cyber warfare specialist with aggressive AI doctrine. Unpredictable and willing to take risks.',
        color: '#D52B1E'
    },
    {
        id: 'india',
        name: 'Republic of India',
        description: 'Emerging tech hub with skilled workforce. Balancing between major powers while asserting independence.',
        color: '#FF9933'
    },
    {
        id: 'corporate',
        name: 'Mega-Corporation Coalition',
        description: 'Transnational corporate alliance operating beyond government control. Immense resources but no territory.',
        color: '#00CED1'
    },
    {
        id: 'rogue',
        name: 'Rogue AI Collective',
        description: 'Decentralized network of autonomous AI systems. No allegiance to any nation. Unpredictable objectives.',
        color: '#9400D3'
    }
]

function FactionSelector({ onSelectFaction, isProcessing, availableModels = [], selectedModel, onModelSelect }) {
    const [selectedFaction, setSelectedFaction] = useState(null)

    const handleSelect = (faction) => {
        if (!isProcessing) {
            setSelectedFaction(faction)
        }
    }

    const handleConfirm = () => {
        if (selectedFaction && !isProcessing) {
            onSelectFaction(selectedFaction)
        }
    }

    return (
        <div className="faction-selector-overlay">
            <motion.div
                className="faction-selector"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="faction-title">SELECT YOUR FACTION</h1>
                <p className="faction-subtitle">
                    {isProcessing
                        ? 'Initializing global systems... Please wait.'
                        : 'Choose which power you will command in the Age of Tension'}
                </p>

                {isProcessing && (
                    <div className="faction-loading">
                        <div className="loading-spinner"></div>
                        <p>Generating world briefing<span className="loading">...</span></p>
                    </div>
                )}

                <div className={`faction-grid ${isProcessing ? 'disabled' : ''}`}>
                    {FACTIONS.map((faction) => (
                        <motion.div
                            key={faction.id}
                            className={`faction-card ${selectedFaction?.id === faction.id ? 'selected' : ''} ${isProcessing ? 'disabled' : ''}`}
                            onClick={() => handleSelect(faction)}
                            whileHover={!isProcessing ? { scale: 1.02, boxShadow: `0 0 20px ${faction.color}80` } : {}}
                            style={{
                                borderColor: selectedFaction?.id === faction.id ? faction.color : 'rgba(0, 217, 255, 0.3)',
                                opacity: isProcessing ? 0.5 : 1,
                                cursor: isProcessing ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <div className="faction-indicator" style={{ backgroundColor: faction.color }}></div>
                            <h3 className="faction-name">{faction.name}</h3>
                            <p className="faction-description">{faction.description}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Model Selector */}
                <div className="model-selector-container">
                    <label className="model-label">NEURAL BACKBONE:</label>
                    <div className="select-wrapper">
                        <select
                            className="model-select"
                            value={selectedModel}
                            onChange={(e) => onModelSelect(e.target.value)}
                            disabled={isProcessing}
                        >
                            {availableModels.length === 0 ? (
                                <option value="" disabled>OFFLINE - NO MODELS DETECTED</option>
                            ) : (
                                availableModels.map(model => (
                                    <option key={model} value={model}>{model.toUpperCase()}</option>
                                ))
                            )}
                        </select>
                        <div className="select-arrow"></div>
                    </div>
                </div>

                <motion.button
                    className="faction-confirm-btn"
                    onClick={handleConfirm}
                    disabled={!selectedFaction || !selectedModel || isProcessing}
                    whileHover={selectedFaction && selectedModel && !isProcessing ? { scale: 1.05 } : {}}
                    whileTap={selectedFaction && selectedModel && !isProcessing ? { scale: 0.95 } : {}}
                    style={{
                        opacity: (!selectedFaction || !selectedModel) ? 0.5 : 1,
                        cursor: (!selectedFaction || !selectedModel) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isProcessing
                        ? 'INITIALIZING...'
                        : !selectedModel
                            ? 'LINK NEURAL BACKBONE'
                            : selectedFaction
                                ? `BEGIN AS ${selectedFaction.name.toUpperCase()}`
                                : 'SELECT A FACTION'}
                </motion.button>
            </motion.div>

            <button
                className="reset-game-btn"
                onClick={async () => {
                    if (confirm('WARNING: This will delete your save file and restart the game world. Are you sure?')) {
                        try {
                            const axios = (await import('axios')).default
                            await axios.post('/api/reset')
                            sessionStorage.removeItem('gameSession')
                            window.location.reload()
                        } catch (e) {
                            alert('Failed to reset game: ' + e.message)
                        }
                    }
                }}
            >
                ⚠️ RESET WORLD STATE
            </button>
        </div >
    )
}

export default FactionSelector
