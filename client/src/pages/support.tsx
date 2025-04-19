import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('help-center');
  const [location] = useLocation();
  
  useEffect(() => {
    // Get tab from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    
    // Set active tab if valid
    if (tabParam && ['help-center', 'safety', 'cancellation'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-4">restr Support</h1>
          <p className="text-lg text-neutral-600 mb-6">Find answers to your questions and get the help you need.</p>
          
          <div className="max-w-2xl relative">
            <Input
              type="text"
              placeholder="Search for help..."
              className="pr-10 py-6 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-900">
              <i className="ri-search-line text-xl"></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-neutral-200 mb-8">
            <TabsList className="flex h-auto p-0 bg-transparent space-x-8">
              <TabsTrigger 
                value="help-center" 
                className="px-1 py-3 font-medium data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 rounded-none text-neutral-500 hover:text-neutral-900 transition"
              >
                Help Center
              </TabsTrigger>
              <TabsTrigger 
                value="safety" 
                className="px-1 py-3 font-medium data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 rounded-none text-neutral-500 hover:text-neutral-900 transition"
              >
                Safety Information
              </TabsTrigger>
              <TabsTrigger 
                value="cancellation" 
                className="px-1 py-3 font-medium data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 rounded-none text-neutral-500 hover:text-neutral-900 transition"
              >
                Cancellation Options
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Help Center Tab */}
          <TabsContent value="help-center" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-base font-medium py-4">
                      How do I create a NOSTR identity for restr?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 pb-6">
                      <p className="mb-4">Creating a NOSTR identity is simple:</p>
                      <ol className="list-decimal pl-5 space-y-2 mb-4">
                        <li>Install a NOSTR extension like Alby, nos2x, or Amber</li>
                        <li>Generate a new keypair within the extension</li>
                        <li>Click the "Connect" button on our site and grant permission</li>
                      </ol>
                      <p>Your NOSTR identity will be used for secure communication, payments, and verification on restr.</p>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-base font-medium py-4">
                      How do payments work on restr?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 pb-6">
                      <p className="mb-4">restr uses Bitcoin and sats (satoshis) for all payments:</p>
                      <ul className="list-disc pl-5 space-y-2 mb-4">
                        <li>Connect your NOSTR wallet that supports NIP-57 (zaps)</li>
                        <li>Payments are made directly between guests and hosts - we never hold your funds</li>
                        <li>Payment confirmations appear in your NOSTR clients</li>
                        <li>Hosts set their own cancellation and refund policies</li>
                      </ul>
                      <p>We recommend using Lightning Network for fast, low-fee transactions.</p>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-base font-medium py-4">
                      How do I contact a host?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 pb-6">
                      <p className="mb-4">Communication with hosts happens through encrypted NOSTR messages:</p>
                      <ul className="list-disc pl-5 space-y-2 mb-4">
                        <li>Connect your NOSTR identity to restr first</li>
                        <li>Click on a listing and then the "Message Host" button</li>
                        <li>Enter your message, which will be encrypted end-to-end</li>
                        <li>Hosts will receive your message in their NOSTR client</li>
                        <li>Replies will come directly to your NOSTR client</li>
                      </ul>
                      <p>Make sure your NOSTR client supports NIP-04 for encrypted messages.</p>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-base font-medium py-4">
                      How do I verify my identity as a host?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 pb-6">
                      <p className="mb-4">Identity verification on restr uses the NOSTR web of trust:</p>
                      <ol className="list-decimal pl-5 space-y-2 mb-4">
                        <li>Connect your NOSTR identity</li>
                        <li>Link your social profiles using NIP-05</li>
                        <li>Get attestations from other trusted NOSTR users</li>
                        <li>Engage with the community to build trust</li>
                      </ol>
                      <p>The more connected your NOSTR identity is, the more trustworthy you'll appear to potential guests.</p>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-5">
                    <AccordionTrigger className="text-base font-medium py-4">
                      What devices and browsers are supported?
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-600 pb-6">
                      <p className="mb-4">restr works on most modern devices and browsers:</p>
                      <ul className="list-disc pl-5 space-y-2 mb-4">
                        <li><strong>Desktop:</strong> Chrome, Firefox, Safari, Edge (latest 2 versions)</li>
                        <li><strong>Mobile:</strong> iOS Safari, Android Chrome</li>
                        <li><strong>NOSTR Extensions:</strong> Alby, nos2x, or other NIP-07 compliant extensions</li>
                        <li><strong>Mobile NOSTR:</strong> Amber app with NIP-46 remote signing</li>
                      </ul>
                      <p>For the best experience, use a browser that supports WebCrypto for secure NOSTR operations.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-4">Contact Support</h3>
                <p className="text-neutral-600 mb-6">Need more help? Our support team is available through various channels.</p>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <i className="ri-discord-fill text-xl text-neutral-700 mt-1 mr-3"></i>
                    <div>
                      <h4 className="font-medium">Discord Community</h4>
                      <p className="text-sm text-neutral-500">Join our Discord for real-time support</p>
                      <a href="https://discord.com/invite/nostr" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-800 hover:underline mt-1 inline-block">
                        Join Discord <i className="ri-external-link-line ml-1"></i>
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <i className="ri-github-fill text-xl text-neutral-700 mt-1 mr-3"></i>
                    <div>
                      <h4 className="font-medium">GitHub Issues</h4>
                      <p className="text-sm text-neutral-500">Report bugs or suggest features on GitHub</p>
                      <a href="https://github.com/nostrbnb/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-800 hover:underline mt-1 inline-block">
                        Open Issue <i className="ri-external-link-line ml-1"></i>
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <i className="ri-mail-line text-xl text-neutral-700 mt-1 mr-3"></i>
                    <div>
                      <h4 className="font-medium">Email Support</h4>
                      <p className="text-sm text-neutral-500">Send us an email for direct assistance</p>
                      <a href="mailto:support@restr.xyz" className="text-sm text-neutral-800 hover:underline mt-1 inline-block">
                        support@restr.xyz
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Safety Information Tab */}
          <TabsContent value="safety" className="mt-0">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold mb-6">Safety Information</h2>
              
              <div className="space-y-8">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded">
                  <h3 className="text-lg font-bold text-blue-700 mb-2">Safety is our top priority</h3>
                  <p className="text-neutral-700">
                    At restr, we believe in fostering a safe environment for both hosts and guests. Our platform 
                    leverages the NOSTR protocol's built-in verification features to enhance trust and safety.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold mb-4">For Guests</h3>
                  
                  <ul className="space-y-4">
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">Verify Host Identities</h4>
                        <p className="text-neutral-600">Check host verification status by looking at their NOSTR NIP-05 identifiers and community attestations. Hosts with more connections in the web of trust are generally more trustworthy.</p>
                      </div>
                    </li>
                    
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">Secure Communication</h4>
                        <p className="text-neutral-600">All messages on restr are encrypted end-to-end using the NOSTR protocol. Never share sensitive information through other channels that claim to be restr.</p>
                      </div>
                    </li>
                    
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">Safe Payments</h4>
                        <p className="text-neutral-600">Always use the in-platform payment system, which leverages Bitcoin. Never send payments through other methods if requested by a host.</p>
                      </div>
                    </li>
                    
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">Emergency Resources</h4>
                        <p className="text-neutral-600">Save local emergency numbers before your trip. In case of emergency at a property, always contact local authorities first.</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold mb-4">For Hosts</h3>
                  
                  <ul className="space-y-4">
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">Establish Your Identity</h4>
                        <p className="text-neutral-600">Set up your NOSTR identity with NIP-05 verification. Connect your existing social profiles to build credibility through the NOSTR web of trust.</p>
                      </div>
                    </li>
                    
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">Property Security</h4>
                        <p className="text-neutral-600">Install basic security measures like smoke detectors, carbon monoxide detectors, and secure locks. Provide emergency contact information to guests.</p>
                      </div>
                    </li>
                    
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">Guest Verification</h4>
                        <p className="text-neutral-600">Review guest profiles and their NOSTR verification before accepting bookings. Look for guests with established connections in the NOSTR web of trust.</p>
                      </div>
                    </li>
                    
                    <li className="flex">
                      <i className="ri-check-line text-xl text-green-600 mr-3 mt-0.5"></i>
                      <div>
                        <h4 className="font-bold">House Rules</h4>
                        <p className="text-neutral-600">Clearly communicate your house rules and safety information to guests before they arrive. Include information about maximum occupancy, prohibited activities, and emergency procedures.</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div className="border-t border-neutral-200 pt-6">
                  <h3 className="text-xl font-bold mb-4">Web of Trust Verification</h3>
                  <p className="text-neutral-600 mb-4">The NOSTR protocol's web of trust helps establish credibility on restr:</p>
                  
                  <div className="bg-neutral-50 p-5 rounded-lg mb-6">
                    <h4 className="font-bold mb-2">How it works</h4>
                    <ol className="list-decimal pl-5 space-y-2 text-neutral-600">
                      <li>Users verify their identity through NIP-05 identifiers</li>
                      <li>Community members provide attestations for one another</li>
                      <li>Connections form a web of trust that enhances reputation</li>
                      <li>More attestations and connections = higher trustworthiness</li>
                    </ol>
                  </div>
                  
                  <p className="text-neutral-600">
                    The decentralized nature of NOSTR means that identity verification isn't controlled by any single entity, 
                    making it more resistant to fraud while preserving privacy.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Cancellation Options Tab */}
          <TabsContent value="cancellation" className="mt-0">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold mb-6">Cancellation Options</h2>
              
              <p className="text-neutral-600 mb-8">
                At restr, hosts set their own cancellation policies. When booking, always review the specific 
                cancellation policy for your chosen property. Here are the standard policies available to hosts:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="border border-neutral-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <i className="ri-calendar-check-line text-xl text-green-600"></i>
                    </div>
                    <h3 className="text-lg font-bold">Flexible</h3>
                  </div>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start">
                      <i className="ri-check-line text-green-600 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">Full refund if cancelled 24 hours before check-in</span>
                    </li>
                    <li className="flex items-start">
                      <i className="ri-check-line text-green-600 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">Partial refund (50%) if cancelled less than 24 hours before</span>
                    </li>
                    <li className="flex items-start">
                      <i className="ri-close-line text-red-500 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">No refund after check-in has begun</span>
                    </li>
                  </ul>
                  <div className="text-xs text-neutral-500 border-t border-neutral-200 pt-3">
                    Best for last-minute changes to travel plans
                  </div>
                </div>
                
                <div className="border border-neutral-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                      <i className="ri-calendar-line text-xl text-yellow-600"></i>
                    </div>
                    <h3 className="text-lg font-bold">Moderate</h3>
                  </div>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start">
                      <i className="ri-check-line text-green-600 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">Full refund if cancelled 5 days before check-in</span>
                    </li>
                    <li className="flex items-start">
                      <i className="ri-check-line text-green-600 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">Partial refund (50%) if cancelled less than 5 days before</span>
                    </li>
                    <li className="flex items-start">
                      <i className="ri-close-line text-red-500 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">No refund after check-in has begun</span>
                    </li>
                  </ul>
                  <div className="text-xs text-neutral-500 border-t border-neutral-200 pt-3">
                    Balance between flexibility and host security
                  </div>
                </div>
                
                <div className="border border-neutral-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                      <i className="ri-calendar-close-line text-xl text-red-600"></i>
                    </div>
                    <h3 className="text-lg font-bold">Strict</h3>
                  </div>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start">
                      <i className="ri-check-line text-green-600 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">Full refund if cancelled 14 days before check-in</span>
                    </li>
                    <li className="flex items-start">
                      <i className="ri-check-line text-green-600 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">Partial refund (50%) if cancelled 7-14 days before</span>
                    </li>
                    <li className="flex items-start">
                      <i className="ri-close-line text-red-500 mr-2 mt-1"></i>
                      <span className="text-sm text-neutral-600">No refund if cancelled less than 7 days before</span>
                    </li>
                  </ul>
                  <div className="text-xs text-neutral-500 border-t border-neutral-200 pt-3">
                    Best for hosts with high demand properties
                  </div>
                </div>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-lg mb-10">
                <h3 className="text-lg font-bold mb-3">Special Circumstances</h3>
                <p className="text-neutral-600 mb-4">
                  Certain situations may qualify for refunds outside of the standard cancellation policies:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <i className="ri-error-warning-line text-yellow-600 mr-3 mt-0.5"></i>
                    <div>
                      <h4 className="font-bold">Host Cancellations</h4>
                      <p className="text-sm text-neutral-600">If a host cancels your booking, you'll receive a full refund regardless of the cancellation policy.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="ri-error-warning-line text-yellow-600 mr-3 mt-0.5"></i>
                    <div>
                      <h4 className="font-bold">Property Not as Described</h4>
                      <p className="text-sm text-neutral-600">If the property significantly differs from the listing description, you may be eligible for a full or partial refund.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="ri-error-warning-line text-yellow-600 mr-3 mt-0.5"></i>
                    <div>
                      <h4 className="font-bold">Extenuating Circumstances</h4>
                      <p className="text-sm text-neutral-600">Events like natural disasters, epidemics, or government travel restrictions may qualify for special consideration.</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-lg font-bold mb-4">Requesting a Cancellation</h3>
                <ol className="list-decimal pl-5 space-y-3 mb-6 text-neutral-600">
                  <li>Go to your Trips page and find the reservation you want to cancel</li>
                  <li>Click on "Cancel reservation" and select your reason for cancellation</li>
                  <li>Review the refund amount based on the host's cancellation policy</li>
                  <li>Confirm your cancellation</li>
                </ol>
                <p className="text-neutral-600">
                  Refunds are typically processed back to your Bitcoin wallet within 7 days of cancellation, depending on the network confirmations.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}