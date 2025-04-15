import React from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import AboutSection from '@/components/about-section';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pb-20">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3">About restr</h1>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              The first decentralized property rental platform built on the NOSTR protocol,
              enabling secure, private, and censorship-resistant bookings worldwide.
            </p>
          </div>
          
          <AboutSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}