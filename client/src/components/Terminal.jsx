import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function Terminal({ messages, input, setInput, onSubmit, isProcessing }) {
    const contentRef = useRef(null)
    const bottomRef = useRef(null)

    useEffect(() => {
        // Scroll to bottom when messages change
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isProcessing])

    return (
        <div className="terminal-panel">
            <div className="terminal-header">
                <div className="terminal-dot"></div>
                <div className="terminal-dot"></div>
                <div className="terminal-dot"></div>
            </div>

            <div className="terminal-content" ref={contentRef}>
                {messages.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`terminal-line ${msg.type}`}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                table: ({ node, ...props }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '10px 0', border: '1px solid rgba(0, 217, 255, 0.3)' }} {...props} />,
                                th: ({ node, ...props }) => <th style={{ border: '1px solid rgba(0, 217, 255, 0.3)', padding: '8px', textAlign: 'left', color: 'var(--accent-cyan)' }} {...props} />,
                                td: ({ node, ...props }) => <td style={{ border: '1px solid rgba(0, 217, 255, 0.1)', padding: '8px' }} {...props} />
                            }}
                        >
                            {msg.text}
                        </ReactMarkdown>
                    </motion.div>
                ))}
                {isProcessing && (
                    <div className="terminal-line system">
                        Processing<span className="loading">...</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={onSubmit} className="terminal-input">
                <span className="terminal-prompt">&gt;</span>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        // Submit on Enter, new line on Shift+Enter
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            onSubmit(e)
                        }
                    }}
                    placeholder="Enter command..."
                    disabled={isProcessing}
                    autoFocus
                    rows={1}
                    style={{
                        minHeight: '24px',
                        maxHeight: '120px',
                        resize: 'none',
                        overflow: 'auto'
                    }}
                />
                <button type="submit" disabled={isProcessing || !input.trim()}>
                    Execute
                </button>
            </form>
        </div>
    )
}

export default Terminal
