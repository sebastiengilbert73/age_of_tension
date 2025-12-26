function StatusPanel({ gameState, availableModels = [], selectedModel, onModelChange }) {
    const getDefconClass = (defcon) => {
        return `status-value defcon-${defcon}`
    }

    return (
        <div className="status-bar">
            <h1>Age of Tension</h1>

            <div className="status-items">
                <div className="status-item">
                    <span className="status-label">Model</span>
                    <select
                        className="model-select"
                        value={selectedModel}
                        onChange={(e) => onModelChange(e.target.value)}
                    >
                        {availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                </div>

                <div className="status-item">
                    <span className="status-label">DEFCON</span>
                    <span className={getDefconClass(gameState.defcon)}>
                        {gameState.defcon}
                    </span>
                </div>

                <div className="status-item">
                    <span className="status-label">Year</span>
                    <span className="status-value">{gameState.year}</span>
                </div>

                <div className="status-item">
                    <span className="status-label">Resources</span>
                    <span className="status-value">{gameState.resources}</span>
                </div>

                <div className="status-item">
                    <span className="status-label">Influence</span>
                    <span className="status-value">{gameState.influence}%</span>
                </div>

                <div className="status-item">
                    <span className="status-label">Intel Net</span>
                    <span className="status-value">{gameState.intel || 50}%</span>
                </div>
            </div>
        </div>
    )
}

export default StatusPanel
