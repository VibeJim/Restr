import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AboutSection() {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <h2 className="text-3xl font-bold mb-8 text-center">How restr Works</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h3 className="text-2xl font-semibold mb-4">NOSTR Protocol</h3>
          <p className="mb-4 text-neutral-700">
            restr is built on the NOSTR protocol (Notes and Other Stuff Transmitted by Relays), 
            a decentralized protocol that enables censorship-resistant and permissionless 
            communication. Your identity and listings are secured by cryptographic keys, not by 
            centralized databases.
          </p>
          
          <Alert className="mb-6">
            <AlertTitle className="font-semibold">Privacy & Security</AlertTitle>
            <AlertDescription>
              Your data is stored across a network of independent relays, not on our servers.
              You control your data with your NOSTR keys.
            </AlertDescription>
          </Alert>
          
          <h3 className="text-2xl font-semibold mb-4">Web of Trust</h3>
          <p className="mb-4 text-neutral-700">
            The NOSTR ecosystem uses a "web of trust" to establish authenticity and reliability:
          </p>
          
          <div className="ml-4 space-y-4 mb-6">
            <div>
              <h4 className="font-semibold">Verified Identities</h4>
              <p className="text-neutral-700">
                Host identities are verified through NOSTR NIP-05 verification, similar to 
                how Twitter verifies accounts. This connects a NOSTR public key to a domain 
                name, establishing that the person exists and has made connections with real 
                people online.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold">Public Reputation</h4>
              <p className="text-neutral-700">
                Every interaction on NOSTR (reviews, messages, transactions) builds a public
                reputation that cannot be forged or manipulated. This creates a verifiable 
                history for each user.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold">Attestations</h4>
              <p className="text-neutral-700">
                Users can publicly attest to the authenticity of others, creating a network
                of trust relationships that helps identify reliable hosts and guests.
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-2xl font-semibold mb-4">Property Verification</h3>
          <p className="mb-4 text-neutral-700">
            To ensure listings are legitimate and currently available:
          </p>
          
          <div className="ml-4 space-y-4 mb-6">
            <div>
              <h4 className="font-semibold">Regular Verification</h4>
              <p className="text-neutral-700">
                Hosts must verify their property's location using our verification tool at regular
                intervals. This ensures they are still tied to the listing, so you don't encounter
                surprises when you arrive.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold">Trusted Network</h4>
              <p className="text-neutral-700">
                For edge cases, we maintain a wide network of trusted partners who physically 
                verify properties for us, allowing us to show more reliable content to our users.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold">Active Listings</h4>
              <p className="text-neutral-700">
                Unverified properties are automatically removed from active listings until the 
                host completes the verification process again.
              </p>
            </div>
          </div>
          
          <h3 className="text-2xl font-semibold mb-4">Booking Process</h3>
          <p className="mb-4 text-neutral-700">
            Our booking process is designed to be transparent and secure:
          </p>
          
          <div className="ml-4 space-y-4">
            <div>
              <h4 className="font-semibold">Direct Communication</h4>
              <p className="text-neutral-700">
                Guests can contact hosts directly through encrypted NOSTR messages to verify any
                concerns before booking. All communication is end-to-end encrypted.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold">Agreement & Payment</h4>
              <p className="text-neutral-700">
                Once both parties agree on terms, a subscription rate is established for the stay
                period. Payments are made on a daily basis for the agreed period using Bitcoin 
                or satoshis through the Lightning Network.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold">Trustless Escrow</h4>
              <p className="text-neutral-700">
                Funds are held in a trustless escrow system using Bitcoin multisig or Lightning
                Network holds, releasing payment each day of your stay automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <h3 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>How is restr different from traditional rental platforms?</AccordionTrigger>
            <AccordionContent>
              restr operates on the decentralized NOSTR protocol, meaning your data and identity are not 
              controlled by a corporation. We don't take large commissions, and all communications are 
              encrypted and private. Payments are made using Bitcoin or Lightning Network, reducing fees
              and enabling global access without currency conversion concerns.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-2">
            <AccordionTrigger>What if I have an issue with my booking?</AccordionTrigger>
            <AccordionContent>
              Since payments are made daily through our subscription system, you can halt payments 
              if there are any issues with your stay. Additionally, our decentralized review system 
              ensures that honest feedback about hosts and properties cannot be removed or altered,
              creating stronger incentives for hosts to maintain quality.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger>Do I need a NOSTR identity to use restr?</AccordionTrigger>
            <AccordionContent>
              Yes, you'll need a NOSTR identity to interact with hosts and make bookings. You can 
              create one directly through our platform or use an existing NOSTR extension like nos2x, 
              Alby, or Flamingo. Your NOSTR identity can be used across the entire NOSTR ecosystem,
              not just on restr.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-4">
            <AccordionTrigger>How can I ensure my privacy during the booking process?</AccordionTrigger>
            <AccordionContent>
              All messages between hosts and guests are end-to-end encrypted using the NOSTR NIP-04 
              encryption standard. Your personal data is never stored on our servers. Payment information
              uses Bitcoin's pseudonymous structure. You control what personal information to share
              with hosts during your communication.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      
      <div className="mt-10 text-center">
        <h3 className="text-lg font-semibold">Supported by the NOSTR protocol</h3>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Badge variant="outline">NIP-01 Basic Protocol</Badge>
          <Badge variant="outline">NIP-04 Encrypted Messages</Badge>
          <Badge variant="outline">NIP-05 Identity Verification</Badge>
          <Badge variant="outline">NIP-07 Browser Extension</Badge>
          <Badge variant="outline">NIP-57 Lightning Zaps</Badge>
        </div>
      </div>
    </div>
  );
}