import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { countriesData } from '../data/countriesData'

// Map extracted countries to game factions
export const INITIAL_COUNTRY_TO_FACTION = {
    'IN': 'india',
    // EU - Key Members
    'FR': 'eu',
    'DE': 'eu',
    'IT': 'eu',
    'ES': 'eu',
    'PL': 'eu',
    'NL': 'eu',
    'BE': 'eu',
    'SE': 'eu',
    'CZ': 'eu',
    'GR': 'eu',
    'PT': 'eu',
    'HU': 'eu',
    'AT': 'eu',
    'DK': 'eu',
    'FI': 'eu',
    'SK': 'eu',
    'IE': 'eu',
    'HR': 'eu',
    'BG': 'eu',
    'RO': 'eu',
    'SI': 'eu',
    'LT': 'eu',
    'LV': 'eu',
    'EE': 'eu',
    'LU': 'eu',
    // EU - Others & Partners
    'UA': 'eu',
    'GB': 'eu',
    // Russia & Allies
    'RU': 'russia',
    'SY': 'russia',
    'IR': 'russia',

    'KZ': 'russia',
    'BY': 'russia',
    // China & Allies
    'CN': 'china',
    'PS': 'china',
    'KP': 'china',
    'PK': 'china',
    'VN': 'china',
    // North American Alliance & Allies
    'US': 'usa',
    'CA': 'usa',
    'GB': 'eu',

    'JP': 'usa',
    'KR': 'usa',
    'IL': 'usa',
    // Corporate
    'ZA': 'corporate',
    // Rogue / High Tension
    'AF': 'rogue',
    // Neutral / Unaligned (The requested regions)
    'BR': 'neutral',
    'EG': 'neutral',
    'TR': 'neutral',

    'CH': 'neutral',
    'NO': 'neutral',
    'IS': 'neutral',
    'RS': 'neutral',
    'BA': 'neutral',
    'AL': 'neutral',
    'MK': 'neutral',
    'MD': 'neutral',
    'ME': 'neutral',
    'XK': 'neutral',
    'MX': 'usa',
    'AR': 'neutral',
    'CL': 'neutral',
    'CO': 'neutral',
    'PE': 'neutral',
    'VE': 'neutral',
    'ID': 'neutral',
    'TH': 'neutral',
    'DZ': 'neutral',
    'ET': 'neutral',
    'KE': 'neutral',
    'NG': 'neutral',
    'UY': 'neutral',
    'PY': 'neutral',
    'BO': 'neutral',
    'EC': 'neutral',
    'GT': 'neutral',
    'HN': 'neutral',
    'SV': 'neutral',
    'NI': 'neutral',
    'CR': 'neutral',
    'PA': 'neutral',
    'CU': 'neutral',
    'DO': 'neutral',
    'HT': 'neutral',
    'JM': 'neutral',
    'MA': 'neutral',
    'ML': 'neutral',
    'SD': 'neutral',
    'SS': 'neutral',
    'TD': 'neutral',
    'LY': 'neutral',
    'SO': 'neutral',
    'TZ': 'neutral',
    'AO': 'neutral',
    'NA': 'neutral',
    'ZW': 'neutral',
    'MZ': 'neutral',
    'MG': 'neutral',
    'GH': 'neutral',
    'CI': 'neutral',
    'SN': 'neutral',
    'UG': 'neutral',
    'RW': 'neutral',
    'ZM': 'neutral',
    'CD': 'neutral',
    'CG': 'neutral',
    'CF': 'neutral',
    'GA': 'neutral',
    'CM': 'neutral',
    'NE': 'neutral',
    'TN': 'neutral',
    'MR': 'neutral',
    'BF': 'neutral',
    'GN': 'neutral',
    'LR': 'neutral',
    'SL': 'neutral',
    'TG': 'neutral',
    'BJ': 'neutral',
    'GQ': 'neutral',
    'ER': 'neutral',
    'BW': 'neutral',
    'MW': 'neutral',
    'PH': 'neutral',
    'MY': 'neutral',
    'MM': 'neutral',
    'KH': 'neutral',
    'LA': 'neutral',
    'SG': 'neutral',
    'IQ': 'neutral',
    'JO': 'neutral',
    'KW': 'neutral',
    'LB': 'neutral',
    'OM': 'neutral',
    'QA': 'neutral',
    'YE': 'neutral',
    'GL': 'neutral',
    'NZ': 'neutral',
    'AU': 'neutral'
}

const FACTION_COLORS = {
    player: '#4169E1', // Blue for player
    usa: '#DC143C',
    china: '#FFD700',
    russia: '#8B0000',
    eu: '#10b981',      // Changed to Vibrant Emerald Green for maximum distinction from USA/Blue
    india: '#FF9933',
    corporate: '#00CED1',
    rogue: '#9400D3',
    neutral: '#a0a0a0'
}

const RELATIONSHIP_COLORS = {
    allied: '#00FF00',
    friendly: '#90EE90',
    neutral: '#FFD700',
    tense: '#FFA500',
    hostile: '#FF4500'
}

function WorldMap({ gameState, currentEvent, playerFaction, relationships = {}, territories = {} }) {
    const [showEventFlash, setShowEventFlash] = useState(false)

    // Flash the map when an event occurs
    useEffect(() => {
        if (currentEvent?.type === 'random_event' && currentEvent?.triggered) {
            setShowEventFlash(true)
            const timer = setTimeout(() => setShowEventFlash(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [currentEvent])

    const getTensionColor = (defcon) => {
        const colors = {
            5: '#4ade80',
            4: '#ffd700',
            3: '#fb923c',
            2: '#f87171',
            1: '#ff3366'
        }
        return colors[defcon] || colors[5]
    }

    const getRelationshipColor = (factionId) => {
        const relationship = relationships[factionId]
        if (!relationship) return RELATIONSHIP_COLORS.neutral

        const sentiment = relationship.sentiment || 0
        if (sentiment >= 70) return RELATIONSHIP_COLORS.allied
        if (sentiment >= 40) return RELATIONSHIP_COLORS.friendly
        if (sentiment >= -20) return RELATIONSHIP_COLORS.neutral
        if (sentiment >= -60) return RELATIONSHIP_COLORS.tense
        return RELATIONSHIP_COLORS.hostile
    }

    const getFactionColor = (factionId) => {
        // Player's faction is always blue
        if (playerFaction && factionId === playerFaction.id) {
            return FACTION_COLORS.player
        }
        return FACTION_COLORS[factionId] || FACTION_COLORS.neutral
    }

    const tensionColor = getTensionColor(gameState.defcon)

    return (
        <div className={`map-panel ${showEventFlash ? 'event-flash' : ''}`}>
            <h3 className="map-title">Global Security Network</h3>
            <div className="world-map">
                <AnimatePresence>
                    {showEventFlash && (
                        <motion.div
                            className="event-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.8, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, repeat: 1 }}
                        >
                            <div className="event-warning">⚠️ CRISIS DETECTED ⚠️</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <svg width="100%" height="100%" viewBox="0 0 1010 666">
                    {/* World background */}
                    <rect width="1010" height="666" fill="#050e1a" />

                    {/* Ocean grid */}
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,217,255,0.05)" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="1010" height="666" fill="url(#grid)" />

                    {/* Dot pattern for contested territories */}
                    <defs>
                        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1.5" fill="currentColor" opacity="0.8" />
                        </pattern>
                    </defs>

                    {/* Country territories */}
                    {Object.entries(countriesData).map(([countryCode, path]) => {
                        let factionId = 'neutral'
                        let isContested = false

                        const territoryData = territories[countryCode] || INITIAL_COUNTRY_TO_FACTION[countryCode]

                        if (territoryData) {
                            if (typeof territoryData === 'string') {
                                factionId = territoryData
                            } else {
                                factionId = territoryData.owner || 'neutral'
                                isContested = territoryData.isContested || false
                            }
                        }

                        const fillColor = getFactionColor(factionId)
                        const borderColor = getRelationshipColor(factionId)
                        const isPlayer = playerFaction && factionId === playerFaction.id

                        return (
                            <g key={countryCode}>
                                <motion.path
                                    d={path}
                                    fill={fillColor}
                                    fillOpacity={0.4}
                                    stroke={isPlayer ? FACTION_COLORS.player : borderColor}
                                    strokeWidth={isPlayer ? 1.5 : 1}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    whileHover={{ fillOpacity: 0.7, strokeWidth: 2 }}
                                />
                                {/* Pulse effect for player territory */}
                                {isPlayer && (
                                    <motion.path
                                        d={path}
                                        fill="none"
                                        stroke={FACTION_COLORS.player}
                                        strokeWidth={1}
                                        opacity={0}
                                        animate={{
                                            opacity: [0, 0.3, 0],
                                            strokeWidth: [1, 3, 1]
                                        }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />
                                )}
                                {/* Contested territory overlay (dots) */}
                                {isContested && playerFaction && (
                                    <motion.path
                                        d={path}
                                        fill="url(#dots)"
                                        className="contested-dots"
                                        style={{ color: FACTION_COLORS.player }}
                                        fillOpacity={1}
                                        stroke={FACTION_COLORS.player}
                                        strokeWidth={1}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 1 }}
                                    />
                                )}
                            </g>
                        )
                    })}

                    {/* DEFCON indicator */}
                    <g transform="translate(20, 630)">
                        <text
                            x="0"
                            y="0"
                            fill={tensionColor}
                            fontSize="18"
                            fontFamily="Orbitron"
                            fontWeight="600"
                        >
                            DEFCON {gameState.defcon}
                        </text>
                        <motion.circle
                            cx="130"
                            cy="-6"
                            r="8"
                            fill={tensionColor}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    </g>
                </svg>

                {/* Legend */}
                <div className="map-legend">
                    <div className="legend-title">Relationships</div>
                    <div className="legend-items">
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: RELATIONSHIP_COLORS.allied }}></div>
                            <span>Allied</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: RELATIONSHIP_COLORS.friendly }}></div>
                            <span>Friendly</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: RELATIONSHIP_COLORS.neutral }}></div>
                            <span>Neutral</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: RELATIONSHIP_COLORS.tense }}></div>
                            <span>Tense</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ background: RELATIONSHIP_COLORS.hostile }}></div>
                            <span>Hostile</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WorldMap
