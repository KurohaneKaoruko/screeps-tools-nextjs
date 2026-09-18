import Link from 'next/link'
import { tools } from '@/lib/tools'

export default function Home() {
  return (
    <div className="min-h-screen screeps-bg">
      {/* Grid Background */}
      <div className="grid-bg" />

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Glowing orbs - Screeps 蓝紫色 */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#5048ff]/12 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#a459ff]/08 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
          
          {/* Floating particles */}
          <div className="absolute top-32 left-[15%] w-2 h-2 bg-[#5973ff]/60 rounded-full animate-float" />
          <div className="absolute top-48 right-[20%] w-1.5 h-1.5 bg-[#a459ff]/50 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-64 left-[10%] w-1 h-1 bg-[#6c82ff]/40 rounded-full animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-32 right-[15%] w-2 h-2 bg-[#5973ff]/50 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-48 left-[25%] w-1.5 h-1.5 bg-[#a459ff]/40 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
          
          {/* Geometric shapes */}
          <div className="absolute top-40 right-[10%] w-20 h-20 border border-[#5973ff]/20 rounded-lg rotate-45 animate-spin-slow" />
          <div className="absolute bottom-40 left-[8%] w-16 h-16 border border-[#a459ff]/15 rounded-full animate-pulse-glow" />
          
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5973ff" stopOpacity="0" />
                <stop offset="50%" stopColor="#5973ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#5973ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="10%" y1="30%" x2="30%" y2="50%" stroke="url(#line-gradient)" strokeWidth="1" />
            <line x1="70%" y1="20%" x2="90%" y2="40%" stroke="url(#line-gradient)" strokeWidth="1" />
            <line x1="80%" y1="60%" x2="95%" y2="80%" stroke="url(#line-gradient)" strokeWidth="1" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            {/* Logo Style Title */}
            <div className="flex items-center justify-center space-x-2 mb-8">
              <span className="text-[#909fc4]/60 text-5xl sm:text-6xl lg:text-7xl font-light">&lt;</span>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold gradient-text-blue glow-text">
                Screeps
              </h1>
              <span className="text-[#909fc4]/60 text-5xl sm:text-6xl lg:text-7xl font-light">&gt;</span>
              <span className="text-5xl sm:text-6xl lg:text-7xl font-light text-[#909fc4] ml-2">Tools</span>
            </div>
            
            <p className="text-xl text-[#909fc4] max-w-2xl mx-auto mb-10">
              为 Screeps 玩家打造的实用工具集合
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                href="/tools" 
                className="group px-8 py-3.5 btn-primary rounded-md font-medium text-white flex items-center space-x-2"
              >
                <span>浏览工具</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a 
                href="https://screeps.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 btn-secondary rounded-md font-medium text-[#909fc4] hover:text-white"
              >
                了解 Screeps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tools Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <Link 
                key={tool.id} 
                href={tool.href === '#' ? '#' : tool.href}
                className={`group relative bg-[#1d2027]/60 backdrop-blur-sm rounded-lg overflow-hidden ${
                  tool.href === '#' 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'cursor-pointer card-hover'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Top Accent Line */}
                <div className={`h-1 ${
                  tool.statusColor === 'green' 
                    ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-500' 
                    : tool.statusColor === 'blue'
                    ? 'bg-gradient-to-r from-[#5973ff] via-[#a459ff] to-[#5973ff]'
                    : 'bg-gradient-to-r from-[#909fc4]/40 via-[#909fc4]/60 to-[#909fc4]/40'
                }`} />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-[#e5e7eb] group-hover:text-white transition-colors">
                      <span className="mr-2" aria-hidden>{tool.icon}</span>{tool.name}
                    </h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      tool.statusColor === 'green' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : tool.statusColor === 'blue'
                        ? 'bg-[#5973ff]/10 text-[#5973ff] border border-[#5973ff]/20'
                        : 'bg-[#909fc4]/10 text-[#909fc4] border border-[#909fc4]/20'
                    }`}>
                      {tool.status}
                    </span>
                  </div>
                  <p className="text-[#909fc4]/80 text-sm leading-relaxed mb-6">
                    {tool.description}
                  </p>
                  
                  {/* Hover Arrow */}
                  {tool.href !== '#' && (
                    <div className="flex items-center text-[#5973ff] text-sm font-medium opacity-0 group-hover:opacity-100 transition-all">
                      <span>开始使用</span>
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#5973ff]/5 to-[#a459ff]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Link>
            ))}

            {/* Coming Soon Card */}
            <div className="relative bg-[#1d2027]/30 backdrop-blur-sm rounded-lg border border-dashed border-[#909fc4]/20 p-6 flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-14 h-14 rounded-full bg-[#1d2027]/50 flex items-center justify-center mb-4 border border-[#909fc4]/20">
                <svg className="w-7 h-7 text-[#909fc4]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-[#909fc4]/50 text-sm">更多工具开发中...</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-[#5048ff]/08 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#a459ff]/05 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <p className="text-[#5973ff] text-sm font-medium mb-3 tracking-wider uppercase">开源项目</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text-blue">Open</span>
              <span className="text-[#909fc4] ml-3">Source</span>
            </h2>
          </div>

          {/* Feature Cards */}
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-lg p-6 border border-[#5973ff]/10 card-hover text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-[#5973ff]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5973ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-[#e5e7eb] font-medium mb-2">完全开源</h3>
              <p className="text-[#909fc4]/70 text-sm">代码托管在 GitHub，欢迎贡献</p>
            </div>

            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-lg p-6 border border-[#a459ff]/10 card-hover text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-[#a459ff]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#a459ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-[#e5e7eb] font-medium mb-2">现代技术栈</h3>
              <p className="text-[#909fc4]/70 text-sm">Next.js + TypeScript 构建</p>
            </div>

            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-lg p-6 border border-[#6c82ff]/10 card-hover text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-[#6c82ff]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#6c82ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-[#e5e7eb] font-medium mb-2">持续更新</h3>
              <p className="text-[#909fc4]/70 text-sm">根据社区反馈添加新功能</p>
            </div>
          </div>

          <div className="text-center">
            <a 
              href="https://github.com/KurohaneKaoruko/screeps-tools-nextjs" 
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center space-x-2 px-6 py-3 btn-secondary rounded-md font-medium text-[#909fc4] hover:text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>查看源码</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
