import Link from 'next/link'
import { tools } from '@/lib/tools'

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link 
            key={tool.id} 
            href={tool.href === '#' ? '#' : tool.href}
            className={`bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden hover:shadow-md transition-shadow ${
              tool.href === '#' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            }`}
          >
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3">{tool.name}</h3>
              <p className="text-gray-300">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}