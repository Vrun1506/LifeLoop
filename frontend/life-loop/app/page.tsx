import React from 'react';

export default function Home() {
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
          <a href="#" className="text-[#FCF7F8] hover:text-black">Contact Us</a>
        </div>
        <div className="flex-1 flex justify-end gap-3">
          <a
              href="/login"
              className="inline-block rounded-md border border-black bg-white px-6 py-3 text-base font-medium text-black transition-colors hover:text-blue-500"
            >
              Login   
            </a>
          
          <a
              href="/signup"
              className="inline-block rounded-md border border-black bg-black px-6 py-3 text-base font-medium text-white transition-colors hover:text-blue-500"
            >
              Sign Up  
            </a>
        </div> 
      </nav>

      <section className="flex flex-col items-center justify-center px-5 py-24">
        <div className="text-center max-w-4xl">
          <h1 className="text-7xl font-bold tracking-tight text-[#FCF7F8]">
            LifeLoop 
          </h1>
          <p className="mt-6 text-xl text-[#FCF7F8]">
            A web application that does something.    
          </p>
          <div className="mt-8">
            <a
              href="#"
              className="inline-block rounded-md border border-black bg-black px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white hover:text-black"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-16 px-8 bg-[#4A7A8F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center text-[#FCF7F8] mb-12">What is LifeLoop?</h2>
          <div className="bg-[#4A7A8F] p-12 rounded-lg">
            <h3 className="text-3xl font-bold mb-6 text-[#FCF7F8] text-center">Provides real-time updates on the online digital footprint of its users.</h3>
            <p className="text-xl text-[#FCF7F8] mb-4 text-center">Scraps data from various online sources to gather information.</p>
            <p className="text-xl text-[#FCF7F8] mb-4 text-center"></p>
            <p className="text-xl text-[#FCF7F8] text-center">Bad</p>
          </div>
        </div>
    </section>

      {/* Features Section */}
      <section className="py-24 px-8 bg-[#5C91A9]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center text-[#FCF7F8] mb-16">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-[#FCF7F8]">Real-time Tracking</h3>
              <p className="text-[#FCF7F8]">Monitor your children's location and activities in real-time with our advanced tracking system.</p>
            </div>
            <div className="bg-white/10 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-[#FCF7F8]">Safe & Secure</h3>
              <p className="text-[#FCF7F8]">Your family's privacy is our priority. All data is encrypted and securely stored.</p>
            </div>
            <div className="bg-white/10 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-[#FCF7F8]">Easy to Use</h3>
              <p className="text-[#FCF7F8]">Simple interface designed for parents. No technical knowledge required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8 bg-[#4A7A8F]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-[#FCF7F8]">Ready to get started?</h2>
          <p className="text-xl text-[#FCF7F8] mb-8">Join thousands of families using LifeLoop today.</p>

          <a
            href="#"
            className="inline-block rounded-md bg-black px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-white hover:text-black"
          >
            Sign Up Now
          </a>
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
