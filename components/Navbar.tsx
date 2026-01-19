'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isConsole = pathname.startsWith('/tools/console')
  const headerHeightClass = isConsole ? 'h-12' : 'h-16'
  const logoTextClass = isConsole ? 'text-lg' : 'text-xl'
  const containerClass = isConsole ? 'w-full px-2 sm:px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#161724]/90 backdrop-blur-md border-b border-[#5973ff]/15">
      <div className={containerClass}>
        <div className={`flex justify-between ${headerHeightClass}`}>
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-1 group">
              <span className={`text-[#909fc4] ${logoTextClass}`}>&lt;</span>
              <span className={`${logoTextClass} font-bold gradient-text-blue`}>Screeps</span>
              <span className={`text-[#909fc4] ${logoTextClass}`}>&gt;</span>
              <span className={`${logoTextClass} font-light text-[#909fc4] ml-1`}>Tools</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-[#909fc4] hover:text-white transition-colors text-sm font-medium"
            >
              首页
            </Link>
            <Link 
              href="/tools" 
              className="text-[#909fc4] hover:text-white transition-colors text-sm font-medium"
            >
              工具
            </Link>
            <a 
              href="https://docs.screeps.com/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#909fc4] hover:text-white transition-colors text-sm font-medium"
            >
              文档
            </a>
            <a 
              href="https://github.com/KurohaneKaoruko/screeps-tools-nextjs" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 btn-secondary rounded-lg text-sm font-medium text-[#909fc4] hover:text-white"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>GitHub</span>
            </a>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-[#909fc4] hover:text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#5973ff]/15">
            <nav className="flex flex-col space-y-4">
              <Link 
                href="/" 
                className="text-[#909fc4] hover:text-white transition-colors text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                首页
              </Link>
              <Link 
                href="/tools" 
                className="text-[#909fc4] hover:text-white transition-colors text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                工具
              </Link>
              <a 
                href="https://docs.screeps.com/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#909fc4] hover:text-white transition-colors text-sm font-medium"
              >
                文档
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
