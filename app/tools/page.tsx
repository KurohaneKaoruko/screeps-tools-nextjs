import Link from 'next/link'
import { tools } from '@/lib/tools'

export default function ToolsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">工具列表</h1>

      <div className="space-y-4">
        {tools.map((tool) => (
          <Link 
            key={tool.id} 
            href={tool.href === '#' ? '#' : tool.href}
            className={`bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 hover:shadow-md transition-shadow block ${
              tool.href === '#' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            }`}
          >
            <div>
              <h3 className="text-xl font-semibold mb-2">{tool.name}</h3>
              <p className="text-gray-300">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}