import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NostrKeyPair {
  secretKey: string;
  publicKey: string;
  nsec: string;
  npub: string;
}

interface ListingSuccessProps {
  keyPair?: NostrKeyPair;
  listingId: string;
}

export default function ListingSuccess({ keyPair, listingId }: ListingSuccessProps) {
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [showRedirectButton, setShowRedirectButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRedirectButton(true);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);

  const copyKeyToClipboard = () => {
    if (keyPair?.nsec) {
      navigator.clipboard.writeText(keyPair.nsec);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const confirmBackup = () => {
    setBackupConfirmed(true);
    setShowBackupDialog(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Listing Created Successfully!</h2>
        <p className="text-center text-neutral-600 mb-4">
          Your property has been listed on the NOSTR network.
        </p>
        <div className="text-center font-medium mb-2">
          Listing ID: <span className="font-mono text-sm bg-neutral-100 p-1 rounded">{listingId.substring(0, 8)}...{listingId.substring(listingId.length - 8)}</span>
        </div>
        {showRedirectButton && (
          <div className="flex justify-center mt-4">
            <Button asChild>
              <Link href="/">
                See Your Listings
              </Link>
            </Button>
          </div>
        )}
      </Card>

      {keyPair && (
        <Alert className="border-amber-300 bg-amber-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <AlertTitle className="ml-2">Important: Save Your NOSTR Key</AlertTitle>
          <AlertDescription className="ml-2">
            <p className="mb-3">
              We've generated a new NOSTR key for your listing. This key is needed to:
            </p>
            <ul className="list-disc list-inside mb-3 space-y-1">
              <li>Edit or delete your listing in the future</li>
              <li>Receive and respond to booking requests</li>
              <li>Receive payments from guests</li>
            </ul>
            <p className="mb-3">
              <strong>We don't store this key</strong> - if you lose it, you'll lose access to your listing.
            </p>
            <Button variant="outline" className="mt-2" onClick={() => setShowBackupDialog(true)}>
              View and Backup My Key
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" asChild>
          <Link href="/">
            View All Listings
          </Link>
        </Button>
        {!keyPair && (
          <Button>
            <Link href="/listing">
              Create Another Listing
            </Link>
          </Button>
        )}
      </div>

      {/* Backup Key Dialog */}
      {keyPair && (
        <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save Your NOSTR Key</DialogTitle>
              <DialogDescription>
                Copy and save this key in a secure password manager. This is your only chance to see it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nsec">Private Key (nsec)</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="nsec"
                    readOnly
                    value={keyPair.nsec}
                    className="font-mono text-sm"
                  />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={copyKeyToClipboard}
                    className={keyCopied ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {keyCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  This is your private key. Anyone with this key can control your listing.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="npub">Public Key (npub)</Label>
                <Input 
                  id="npub"
                  readOnly
                  value={keyPair.npub}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-neutral-500">
                  This is your public identifier on the NOSTR network.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-backup">Backup Method</Label>
                <Textarea
                  id="key-backup"
                  placeholder="Describe how you backed up your key (e.g., 'Saved in Password Manager', 'Wrote in secure notebook')"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
                Close
              </Button>
              <Button onClick={confirmBackup}>
                I've Backed Up My Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation for next steps after backup */}
      {keyPair && backupConfirmed && (
        <div className="mt-6 flex justify-end">
          <Button asChild>
            <Link href="/">
              Continue to Listings
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}