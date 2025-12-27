import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

function RandomEventModal({ event, onDismiss }) {
    if (!event) return null

    // Determine color scheme based on event type
    const getColor = (type) => {
        switch (type?.toUpperCase()) {
            case 'CRISIS': return '#ff0033' // Red
            case 'BREAKTHROUGH': return '#00ff99' // Green/Cyan
            case 'DIPLOMATIC': return '#ffcc00' // Yellow
            case 'RESOURCE_SHOCK': return '#ff6600' // Orange
            default: return '#00d9ff' // Default Blue
        }
    }

    const color = getColor(event.type)

    return createPortal(
        <AnimatePresence>
            <motion.div
                className="event-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="event-modal"
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    style={{
                        border: `2px solid ${color}`,
                        boxShadow: `0 0 30px ${color}40`
                    }}
                >
                    <div className="event-header" style={{ borderBottom: `1px solid ${color}40` }}>
                        <span className="event-type" style={{ color: color }}>
                            ⚠️ {event.type?.replace('_', ' ')}
                        </span>
                        <span className="event-id">ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                    </div>

                    <div className="event-content">
                        <h2 className="event-title">{event.title || "Unknown Event"}</h2>
                        <div className="event-body">
                            {event.description}
                        </div>

                        {event.impact && (
                            <div className="event-impact">
                                <h3>IMPACT ASSESSMENT:</h3>
                                <ul>
                                    {Object.entries(event.impact).map(([key, value]) => (
                                        <li key={key} style={{ color: value > 0 ? '#00ff99' : '#ff0033' }}>
                                            {key.toUpperCase()}: {value > 0 ? '+' : ''}{value}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="event-footer">
                        <button
                            className="event-dismiss-btn"
                            onClick={onDismiss}
                            style={{
                                borderColor: color,
                                color: color,
                                boxShadow: `0 0 10px ${color}20`
                            }}
                        >
                            ACKNOWLEDGE
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    )
}

export default RandomEventModal
