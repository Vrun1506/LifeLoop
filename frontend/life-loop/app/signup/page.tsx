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
            <a href="" className="text-[#FCF7F8] hover:text-black">Home</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">About</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">Demo 1</a>
          <a href="#" className="text-[#FCF7F8] hover:text-black">Demo 2</a>
        </div>
        <div className="flex-1 flex justify-end"></div>
      </nav>

      <section className="min-h-[50vh] flex justify-center px-8 py-36">
        <div className="w-full max-w-lg mx-auto bg-[#4A7A8F] p-6 rounded-lg">
          <h1 className="text-3xl font-bold tracking-tight text-[#FCF7F8] text-center mb-6">
            Sign up for an Account   
          </h1>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                placeholder="Enter your Instagram username"
              />
            </div>
            
            <div>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-md text-white bg-transparent border-2 border-white text-center text-lg placeholder-white/70"
                placeholder="Enter a password"
              />
            </div>  

            <div className="space-y-3 mt-6">
              <button
                className="w-full rounded-md bg-black px-6 py-2.5 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
                Sign Up  
              </button>
               <button
                className="w-full rounded-md bg-white px-6 py-2.5 flex items-center justify-center gap-3 text-lg font-medium text-black transition-colors hover:bg-white hover:text-black cursor-pointer"
              >

                Sign Up using Google 
                <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="Google logo" className="w-4 h-4"/>

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