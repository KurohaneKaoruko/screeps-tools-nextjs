export default function Footer() {
  
  return (
    <footer className="bg-gray-900 border-t border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 mb-4 md:mb-0">
            Screeps Tools.
          </div>
          
          <div className="flex space-x-6">
            <a href="https://screeps.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
              Screeps 官网
            </a>
            <a href="https://github.com/KurohaneKaoruko/screeps-tools-nextjs" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}