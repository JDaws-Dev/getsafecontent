import React from 'react';
import ImprovedHero from '../components/landing/ImprovedHero';
import ComparisonTable from '../components/landing/ComparisonTable';
import InteractiveFeaturePreview from '../components/landing/InteractiveFeaturePreview';
import InstallationGuide from '../components/landing/InstallationGuide';
import StickyCTA from '../components/landing/StickyCTA';

function ComponentPreview() {
  return (
    <div className="bg-white">
      {/* Navigation for quick jumping */}
      <div className="sticky top-0 bg-gray-900 text-white py-4 px-6 z-50 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold mb-2">New Landing Page Components Preview</h1>
          <div className="flex gap-4 text-sm">
            <a href="#hero" className="hover:text-purple-300">Hero</a>
            <a href="#how-it-works" className="hover:text-purple-300">How It Works</a>
            <a href="#comparison" className="hover:text-purple-300">Comparison</a>
            <a href="#installation" className="hover:text-purple-300">Installation</a>
            <a href="#sticky" className="hover:text-purple-300">Sticky CTA</a>
          </div>
        </div>
      </div>

      {/* Component 1: Improved Hero */}
      <div id="hero" className="border-b-8 border-red-500">
        <div className="bg-yellow-100 p-4 text-center">
          <h2 className="text-2xl font-bold">1. Improved Hero Section</h2>
          <p className="text-gray-600">New punchier headline + explicit Apple Music callout</p>
        </div>
        <ImprovedHero />
      </div>

      {/* Component 2: Interactive Feature Preview */}
      <div id="how-it-works" className="border-b-8 border-red-500">
        <div className="bg-yellow-100 p-4 text-center">
          <h2 className="text-2xl font-bold">2. Interactive Feature Preview</h2>
          <p className="text-gray-600">Click the tabs to see content change!</p>
        </div>
        <InteractiveFeaturePreview />
      </div>

      {/* Component 3: Comparison Table */}
      <div id="comparison" className="border-b-8 border-red-500">
        <div className="bg-yellow-100 p-4 text-center">
          <h2 className="text-2xl font-bold">3. Competitor Comparison Table</h2>
          <p className="text-gray-600">Visual side-by-side vs Spotify Kids & Apple Music</p>
        </div>
        <ComparisonTable />
      </div>

      {/* Component 4: Installation Guide */}
      <div id="installation" className="border-b-8 border-red-500">
        <div className="bg-yellow-100 p-4 text-center">
          <h2 className="text-2xl font-bold">4. Installation Guide</h2>
          <p className="text-gray-600">Addresses "web app" objection + Guided Access tutorial</p>
        </div>
        <InstallationGuide />
      </div>

      {/* Component 5: Sticky CTA */}
      <div id="sticky" className="border-b-8 border-red-500">
        <div className="bg-yellow-100 p-4 text-center mb-96">
          <h2 className="text-2xl font-bold">5. Mobile Sticky CTA</h2>
          <p className="text-gray-600">Scroll down 300px on mobile to see it appear at the bottom!</p>
          <p className="text-sm text-gray-500 mt-2">(Desktop: Won't show - it's mobile only)</p>
          <div className="mt-8 text-left max-w-2xl mx-auto">
            <p className="font-semibold mb-2">How to test:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open Chrome DevTools (F12)</li>
              <li>Click the device toggle icon (mobile view)</li>
              <li>Choose "iPhone 12 Pro" from the dropdown</li>
              <li>Scroll down this page</li>
              <li>After scrolling past this yellow box, the sticky CTA will appear at the bottom</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Sticky CTA Component */}
      <StickyCTA />

      {/* Extra scrolling space to test sticky CTA */}
      <div className="h-screen bg-gradient-to-b from-gray-100 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-400">Keep scrolling...</p>
          <p className="text-gray-500">Testing sticky CTA on mobile</p>
        </div>
      </div>
    </div>
  );
}

export default ComponentPreview;
