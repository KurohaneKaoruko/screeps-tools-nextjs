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
}

export default function CustomSelect({ value, onChange, options, disabled, placeholder = '请选择' }: CustomSelectProps) {
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
    if (!isOpen) {
      setMenuStyle(null)
      return
    }

    const update = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const margin = 8
      const desiredWidth = rect.width
      const availableBelow = window.innerHeight - (rect.bottom + margin)
      const availableAbove = rect.top - margin
      const openUp = availableBelow < 140 && availableAbove > 160
      const maxHeight = Math.max(
        120,
        Math.min(192, openUp ? availableAbove - margin : availableBelow - margin)
      )
      const top = openUp ? rect.top - margin : rect.bottom + margin
      const left = Math.min(Math.max(rect.left, margin), window.innerWidth - desiredWidth - margin)
      setMenuStyle({
        position: 'fixed',
        top,
        left,
        width: desiredWidth,
        maxHeight,
        transform: openUp ? 'translateY(-100%)' : undefined,
        zIndex: 9999
      })
    }

    update()
    const onScrollOrResize = () => update()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [isOpen])

  useEffect(() => {
    const el = menuRef.current
    if (!isOpen || !el) return
    el.focus()
  }, [isOpen, menuStyle])

  const renderMenu = () => {
    if (!isOpen || !menuStyle) return null
    return createPortal(
      <div
        ref={menuRef}
        tabIndex={-1}
        style={menuStyle}
        className="bg-[#1d2027] border border-[#5973ff]/20 rounded-lg shadow-xl overflow-hidden outline-none"
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
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                option.value === value
                  ? 'bg-[#5973ff]/20 text-[#5973ff]'
                  : 'text-[#909fc4] hover:bg-[#2c467e]/30 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>,
      document.body
    )
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
