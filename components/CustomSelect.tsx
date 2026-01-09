'use client'

import { useState, useRef, useEffect } from 'react'

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

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 打开时给父级卡片添加高 z-index
  useEffect(() => {
    if (!containerRef.current) return
    const card = containerRef.current.closest('.card-hover')
    if (card) {
      if (isOpen) {
        (card as HTMLElement).style.zIndex = '100'
      } else {
        (card as HTMLElement).style.zIndex = ''
      }
    }
    return () => {
      if (card) {
        (card as HTMLElement).style.zIndex = ''
      }
    }
  }, [isOpen])

  if (disabled) {
    return (
      <div className="flex-1 h-10 px-3 bg-gray-700/40 border border-gray-600/50 rounded-lg text-gray-500 text-sm flex items-center cursor-not-allowed opacity-40">
        {placeholder}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 pr-8 bg-gray-700/80 border border-gray-600/50 rounded-lg text-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg 
          className={`absolute right-2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
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
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
