'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  disabled?: boolean
  placeholder?: string
  menuMode?: 'portal' | 'inline'
}

export default function CustomSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder = '请选择',
  menuMode = 'portal'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (containerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (menuMode !== 'portal') {
      setMenuStyle(null)
      return
    }

    if (!isOpen) {
      setMenuStyle(null)
      return
    }

    let animationFrameId: number

    const update = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const margin = 8
      
      const availableBelow = window.innerHeight - (rect.bottom + margin)
      const availableAbove = rect.top - margin
      const openUp = availableBelow < 140 && availableAbove > 160
      
      const maxHeight = Math.max(
        120,
        Math.min(600, openUp ? availableAbove - margin : availableBelow - margin)
      )
      
      const top = openUp ? rect.top - margin : rect.bottom + margin
      
      // Horizontal positioning logic
      const spaceRight = window.innerWidth - rect.left - margin
      const spaceLeft = rect.right - margin
      
      let left: number | undefined
      let right: number | undefined
      let maxWidth: number
      const maxMenuWidth = 320 // Reduced max width as requested
      
      // Prefer left alignment if there's enough space (at least button width or 200px)
      if (spaceRight >= Math.max(200, rect.width)) {
        left = rect.left
        maxWidth = Math.min(spaceRight, maxMenuWidth)
      } else if (spaceLeft >= Math.max(200, rect.width)) {
        // Align right edge of menu to right edge of button
        right = window.innerWidth - rect.right
        maxWidth = Math.min(spaceLeft, maxMenuWidth)
      } else {
        // Fallback: use maximum available width
        left = margin
        maxWidth = Math.min(window.innerWidth - margin * 2, maxMenuWidth)
      }

      const newStyle: CSSProperties = {
        position: 'fixed',
        top,
        left,
        right,
        minWidth: rect.width,
        width: 'auto',
        maxWidth,
        maxHeight,
        transform: openUp ? 'translateY(-100%)' : undefined,
        zIndex: 9999
      }

      setMenuStyle(prev => {
        if (prev &&
            prev.top === newStyle.top &&
            prev.left === newStyle.left &&
            prev.right === newStyle.right &&
            prev.width === newStyle.width &&
            prev.maxWidth === newStyle.maxWidth &&
            prev.maxHeight === newStyle.maxHeight &&
            prev.transform === newStyle.transform) {
          return prev
        }
        return newStyle
      })

      animationFrameId = requestAnimationFrame(update)
    }

    update()
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [isOpen, menuMode])

  useEffect(() => {
    const el = menuRef.current
    if (!isOpen || !el) return
    el.focus()
  }, [isOpen, menuStyle])

  const renderMenu = () => {
    if (!isOpen) return null

    const menuContent = (
      <div
        ref={menuRef}
        tabIndex={-1}
        style={menuMode === 'portal' ? menuStyle ?? undefined : undefined}
        className={`bg-[#1d2027] border border-[#5973ff]/20 rounded-lg shadow-xl overflow-hidden outline-none ${
          menuMode === 'inline' ? 'mt-2 w-full' : ''
        }`}
      >
        <div className="overflow-y-auto max-h-full">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm whitespace-nowrap transition-colors ${
                option.value === value
                  ? 'bg-[#5973ff]/20 text-[#5973ff]'
                  : 'text-[#909fc4] hover:bg-[#2c467e]/30 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )

    if (menuMode === 'inline') {
      return menuContent
    }

    if (!menuStyle) return null
    return createPortal(menuContent, document.body)
  }

  if (disabled) {
    return (
      <div className="flex-1 h-10 px-3 bg-[#1d2027]/40 border border-[#5973ff]/10 rounded-lg text-[#909fc4]/50 text-sm flex items-center cursor-not-allowed opacity-40">
        {placeholder}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 pr-8 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm text-left focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#5973ff]/50 flex items-center"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg 
          className={`absolute right-2 w-4 h-4 text-[#909fc4] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {renderMenu()}
    </div>
  )
}
