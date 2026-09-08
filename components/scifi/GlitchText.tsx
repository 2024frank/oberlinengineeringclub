'use client'

import React, { useEffect, useState } from 'react'

const GLYPHS = '010101_#<>[]*+=~!?/\\{}%&$ABCDEFXYZ'

export function GlitchText({
  text,
  className = '',
  as: Component = 'span',
  speed = 30,
  autoStart = true
}: {
  text: string
  className?: string
  as?: React.ElementType
  speed?: number
  autoStart?: boolean
}) {
  const [displayText, setDisplayText] = useState(text)
  const [isDecrypted, setIsDecrypted] = useState(false)

  const decrypt = () => {
    let iteration = 0
    setIsDecrypted(false)
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < iteration) {
              return text[index]
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          })
          .join('')
      )

      if (iteration >= text.length) {
        setIsDecrypted(true)
        clearInterval(interval)
      }
      iteration += 1 / 2
    }, speed)

    return interval
  }

  useEffect(() => {
    if (autoStart) {
      const interval = decrypt()
      return () => clearInterval(interval)
    }
  }, [text])

  return (
    <Component
      className={`glitch-text ${isDecrypted ? 'glitch-text--settled' : 'glitch-text--animating'} ${className}`}
      onMouseEnter={decrypt}
      data-text={text}
    >
      {displayText}
    </Component>
  )
}
