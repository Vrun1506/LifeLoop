export default function Login() {
  return (
    <div className="font-sans text-white bg-[#5C91A9]">
      <nav className="sticky top-0 z-50 flex items-center border-b bg-white/25 px-4 py-5">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-[#FCF7F8]">
            LifeLoop
          </h1>
        </div>
        <div className="flex justify-center space-x-4">
          <a href="#" className="text-[#FCF7F8] hover:text-black">Home</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">About</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">Contact Us</a>
        </div>
        <div className="flex-1 flex justify-end"></div>
      </nav>

      <section className="min-h-[75vh] flex justify-center px-8 py-12">
        <div className="w-full max-w-lg mx-auto bg-[#4A7A8F] p-6 rounded-lg">
          <h1 className="text-3xl font-bold tracking-tight text-[#FCF7F8] text-center mb-6">
            Login to your Account  
          </h1>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                placeholder="Enter your username or email address"
              />
            </div>
            
            <div>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                placeholder="Enter your password"
              />
            </div>  

            <div className="space-y-2 mt-6">
              <button
                className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-blac"
              >
                Login 
              </button>
               <button
                className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
                Login with Google  
              </button>
            </div>

            <div className="space-y-2 mt-6">
              <button
                className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
                Sign up  
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 bg-[#3D5E6D] border-t border-white/20">
        <div className="max-w-6xl mx-auto text-center text-[#FCF7F8]">
          <p>&copy; 2024 LifeLoop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}