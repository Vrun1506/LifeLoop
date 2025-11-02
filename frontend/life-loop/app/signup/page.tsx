import Image from "next/image";

export default function Signup() {
  return (
    <div className="font-sans text-white bg-[#5C91A9]">
      <nav className="sticky top-0 z-50 flex items-center border-b bg-white/25 px-4 py-5">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-[#FCF7F8]">
            LifeLoop
          </h1>
        </div>
        <div className="flex justify-center space-x-4">
            <a href="\" className="text-[#FCF7F8] hover:text-black">Home</a>
          <a href="\" className="text-[#FCF7F8] hover:text-black">About</a>
          <a href="\" className="text-[#FCF7F8] hover:text-black">Demo 1</a>
          <a href="\" className="text-[#FCF7F8] hover:text-black">Demo 2</a>
        </div>
        <div className="flex-1 flex justify-end"></div>
      </nav>

      <section className="min-h-[50vh] flex justify-center px-8 py-16">
        <div className="w-full max-w-lg mx-auto bg-[#4A7A8F] p-6 rounded-lg">
          <h1 className="text-2xl font-bold tracking-tight text-[#FCF7F8] text-center mb-6">
            Sign up for an Account   
          </h1>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-full text-white bg-transparent border-2 border-white text-center text-base placeholder-white/70"
                placeholder="Enter your Instagram username"
              />
            </div>
            
            <div>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-full text-white bg-transparent border-2 border-white text-center text-base placeholder-white/70"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-full text-white bg-transparent border-2 border-white text-center text-base placeholder-white/70"
                placeholder="Enter a password"
              />
            </div>  

            <div className="space-y-3 mt-6">
              <button
                className="w-full rounded-full bg-black px-6 py-2.5 text-base font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
                Sign up  
              </button>
               <button
                className="w-full rounded-full bg-white px-6 py-2.5 flex items-center justify-center gap-3 text-base font-medium text-black transition-colors hover:bg-white hover:text-black cursor-pointer"
              >

                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up using Google 

              </button>
            </div>

            <div className="space-y-2 mt-6 justify-center text-center">
             <p className="mt-6 text-base  text-[#FCF7F8]">
                Already have an account? <a href="/login" className="underline hover:text-black">Log in</a>        
            </p>
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