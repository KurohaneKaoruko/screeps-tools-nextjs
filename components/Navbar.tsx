import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-400">Screeps</span>
              <span className="text-2xl font-bold">Tools</span>
            </Link>
          </div>
          
          <nav className="flex items-center space-x-6">
            <Link href="/" className="text-gray-300 hover:text-blue-400 font-medium">
              首页
            </Link>
            <Link href="/tools" className="text-gray-300 hover:text-blue-400 font-medium">
              工具
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}