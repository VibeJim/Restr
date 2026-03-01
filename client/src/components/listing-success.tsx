import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { publishProfileWithKey } from '@/lib/nostr';
import { useIsMobile } from '@/hooks/use-mobile';

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

type Step = 'profile' | 'qr' | 'done';

export default function ListingSuccess({ keyPair, listingId }: ListingSuccessProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>(keyPair ? 'profile' : 'done');
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isPublishingProfile, setIsPublishingProfile] = useState(false);
  const [nsecCopied, setNsecCopied] = useState(false);
  const [npubCopied, setNpubCopied] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Reset image error when URL changes
  useEffect(() => {
    setImagePreviewError(false);
  }, [profileImage]);

  // Publishes the profile (kind 0) to relays using the generated key pair.
  const handlePublishProfile = async () => {
    if (!keyPair) return;

    setIsPublishingProfile(true);
    try {
      const profileData: { name?: string; about?: string; picture?: string } = {};
      if (profileName.trim()) profileData.name = profileName.trim();
      if (profileBio.trim()) profileData.about = profileBio.trim();
      if (profileImage.trim()) profileData.picture = profileImage.trim();

      const success = await publishProfileWithKey(
        profileData,
        keyPair.secretKey,
        keyPair.publicKey
      );

      if (success) {
        toast({
          title: 'Profile Published',
          description: 'Your profile has been set up on the NOSTR network.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Profile Saved Locally',
          description: 'Profile will sync when relays are available.',
          variant: 'default'
        });
      }

      setStep('qr');
    } catch (error) {
      console.error('Error publishing profile:', error);
      toast({
        title: 'Error',
        description: 'Could not publish profile. You can try again later from a NOSTR client.',
        variant: 'destructive'
      });
      setStep('qr');
    } finally {
      setIsPublishingProfile(false);
    }
  };

  // Skips profile setup and goes straight to QR code step.
  const handleSkipProfile = () => {
    setStep('qr');
  };

  const copyToClipboard = (text: string, type: 'nsec' | 'npub') => {
    navigator.clipboard.writeText(text);
    if (type === 'nsec') {
      setNsecCopied(true);
      setTimeout(() => setNsecCopied(false), 2000);
    } else {
      setNpubCopied(true);
      setTimeout(() => setNpubCopied(false), 2000);
    }
  };

  // --- Step 1: Profile Setup ---
  if (step === 'profile' && keyPair) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Listing Created!</h2>
          <p className="text-center text-neutral-600">
            Your property is live on the NOSTR network.
          </p>
        </Card>

        <Card className="p-6 border-neutral-200">
          <div className="flex items-center mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF8900] text-white text-sm font-bold mr-3">1</div>
            <h3 className="text-lg font-semibold">Set Up Your Profile</h3>
          </div>
          <p className="text-neutral-500 text-sm mb-6">
            Add a name and bio so guests know who they're renting from. This is optional but highly recommended.
          </p>

          <div className="space-y-4">
            {/* Profile Image Preview */}
            <div className="flex flex-col items-center mb-2">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-neutral-200 mb-2 bg-neutral-100 flex items-center justify-center">
                {profileImage.trim() && !imagePreviewError ? (
                  <img
                    src={profileImage.trim()}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreviewError(true)}
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="profile-name">Display Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Alex, Mountain Lodge Host"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                placeholder="Tell guests a bit about yourself..."
                className="mt-1 h-20"
              />
            </div>

            <div>
              <Label htmlFor="profile-image">Profile Image URL</Label>
              <Input
                id="profile-image"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="mt-1"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Upload your image to <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="text-[#FF8900] underline">PostImages</a> and paste the direct link here.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleSkipProfile}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handlePublishProfile}
              disabled={isPublishingProfile}
              className="flex-1 bg-[#FF8900] hover:bg-[#E67A00] text-white"
            >
              {isPublishingProfile ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Publishing...
                </>
              ) : (
                <>
                  Save Profile
                  <i className="ri-arrow-right-line ml-2"></i>
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // --- Step 2: QR Code with Login Details ---
  if (step === 'qr' && keyPair) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-neutral-200">
          <div className="flex items-center mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF8900] text-white text-sm font-bold mr-3">2</div>
            <h3 className="text-lg font-semibold">Save Your Login</h3>
          </div>

          <Alert className="border-amber-300 bg-amber-50 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <AlertTitle className="ml-2">Import this key into a NOSTR app</AlertTitle>
            <AlertDescription className="ml-2 text-sm">
              To receive messages from guests about your listing, import your private key into a NOSTR messaging app.
              We don't store your key — if you lose it, you lose access to your listing.
            </AlertDescription>
          </Alert>

          {/* QR Code */}
          <div className="flex flex-col items-center mb-6">
            <p className="text-sm text-neutral-600 mb-3 text-center font-medium">
              Scan with a NOSTR app to import your identity
            </p>
            <div className="bg-white p-4 rounded-xl border-2 border-[#FF8900] shadow-sm">
              <QRCodeSVG value={keyPair.nsec} size={isMobile ? 180 : 220} />
            </div>
            <p className="text-xs text-neutral-400 mt-2 text-center">
              This QR code contains your private key (nsec)
            </p>
          </div>

          {/* Key Display */}
          <div className="space-y-3 mb-6">
            <div>
              <Label className="text-xs text-neutral-500">Private Key (nsec)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  readOnly
                  value={keyPair.nsec}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(keyPair.nsec, 'nsec')}
                  className={nsecCopied ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                >
                  {nsecCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-neutral-500">Public Key (npub)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  readOnly
                  value={keyPair.npub}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(keyPair.npub, 'npub')}
                  className={npubCopied ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                >
                  {npubCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>

          {/* Recommended Apps */}
          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <p className="font-medium text-sm mb-3">Recommended NOSTR Apps:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://github.com/nicksenger/amber"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-neutral-200 hover:border-[#FF8900] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-key-2-line text-amber-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium">Amber</p>
                  <p className="text-xs text-neutral-500">Key signer (Android)</p>
                </div>
              </a>
              <a
                href="https://damus.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-neutral-200 hover:border-[#FF8900] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-chat-3-line text-purple-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium">Damus</p>
                  <p className="text-xs text-neutral-500">Messaging (iOS)</p>
                </div>
              </a>
              <a
                href="https://0xchat.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-neutral-200 hover:border-[#FF8900] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-message-3-line text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium">0xchat</p>
                  <p className="text-xs text-neutral-500">Messaging (iOS/Android)</p>
                </div>
              </a>
              <a
                href="https://primal.net"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-neutral-200 hover:border-[#FF8900] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-global-line text-orange-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium">Primal</p>
                  <p className="text-xs text-neutral-500">Web/Mobile client</p>
                </div>
              </a>
            </div>
          </div>

          {/* How to import */}
          <div className="bg-amber-50 rounded-lg p-4 mb-6 text-sm">
            <p className="font-medium text-amber-800 mb-2">How to receive guest messages:</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-700 text-xs">
              <li>Download one of the apps above</li>
              <li>Choose "Login with key" or "Import nsec"</li>
              <li>Scan the QR code above or paste your nsec</li>
              <li>You'll receive booking inquiries as direct messages</li>
            </ol>
          </div>

          <Button
            onClick={() => setStep('done')}
            className="w-full bg-[#FF8900] hover:bg-[#E67A00] text-white"
          >
            I've Saved My Key
            <i className="ri-arrow-right-line ml-2"></i>
          </Button>
        </Card>
      </div>
    );
  }

  // --- Step 3: Done ---
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">You're All Set!</h2>
        <p className="text-center text-neutral-600 mb-4">
          Your listing is live on the NOSTR network.
        </p>
        <div className="text-center font-medium mb-2">
          Listing ID: <span className="font-mono text-sm bg-neutral-100 p-1 rounded">{listingId.substring(0, 8)}...{listingId.substring(listingId.length - 8)}</span>
        </div>
      </Card>

      {keyPair && (
        <Alert className="border-blue-200 bg-blue-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <AlertTitle className="ml-2">Remember</AlertTitle>
          <AlertDescription className="ml-2 text-sm">
            Import your private key into a NOSTR messaging app to receive guest inquiries about your listing.
            <Button
              variant="link"
              className="p-0 h-auto text-blue-700 underline ml-1"
              onClick={() => setStep('qr')}
            >
              View my key again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/">
            <i className="ri-home-line mr-2"></i>
            View All Listings
          </Link>
        </Button>
        <Button className="flex-1 bg-[#FF8900] hover:bg-[#E67A00] text-white" asChild>
          <Link href="/">
            See Your Listing
          </Link>
        </Button>
      </div>
    </div>
  );
}
