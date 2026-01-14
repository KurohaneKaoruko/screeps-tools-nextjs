import Link from 'next/link'
import { tools } from '@/lib/tools'

export default function ToolsPage() {
  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />

      <div className="relative pt-28 pb-12 border-b border-[#5973ff]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#5973ff] text-sm font-medium mb-2">工具集</p>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">Tools</h1>
          <p className="text-[#909fc4]/70">共 {tools.length} 个工具可用</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-4">
          {tools.map((tool) => (
            <Link 
              key={tool.id} 
              href={tool.href === '#' ? '#' : tool.href}
              className={`group relative bg-[#1d2027]/60 backdrop-blur-sm rounded-md overflow-hidden ${
                tool.href === '#' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer card-hover'
              }`}
            >
              <div className="flex items-center p-6">
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                  tool.statusColor === 'green' 
                    ? 'bg-linear-to-b from-green-500 to-emerald-400' 
                    : tool.statusColor === 'blue'
                    ? 'bg-linear-to-b from-[#5973ff] to-[#a459ff]'
                    : 'bg-linear-to-b from-[#909fc4]/50 to-[#909fc4]/30'
                }`} />
                
                <div className="flex-1 ml-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-[#e5e7eb] group-hover:text-white transition-colors">
                      {tool.name}
                    </h3>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      tool.statusColor === 'green' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : tool.statusColor === 'blue'
                        ? 'bg-[#5973ff]/10 text-[#5973ff] border border-[#5973ff]/20'
                        : 'bg-[#909fc4]/10 text-[#909fc4] border border-[#909fc4]/20'
                    }`}>
                      {tool.status}
                    </span>
                  </div>
                  <p className="text-[#909fc4]/70 text-sm">{tool.description}</p>
                </div>

                {tool.href !== '#' && (
                  <div className="ml-4 text-[#909fc4]/50 group-hover:text-[#5973ff] transition-colors">
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
