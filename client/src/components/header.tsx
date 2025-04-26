import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useNostr } from '@/context/nostr-provider';
import { DEFAULT_PROFILE_IMAGE } from '@/lib/constants';
import NostrConnectModal from './nostr-connect-modal';
import { Button } from './ui/button';
import { RestrLogoFull } from './restr-logo';

export interface HeaderProps {
  onLocationChange?: (location: string) => void;
}

export default function Header({ onLocationChange }: HeaderProps) {
  const { user, isConnected } = useNostr();
  const [, setLocation] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNostrModal, setShowNostrModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const openNostrModal = () => {
    setShowNostrModal(true);
    setShowUserMenu(false);
  };

  const closeNostrModal = () => {
    setShowNostrModal(false);
  };
  
  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const location = e.target.value;
    setSelectedLocation(location);
    
    // If we have the callback, use it
    if (onLocationChange) {
      onLocationChange(location);
    }
    
    // Update URL with the search param
    if (location) {
      setLocation(`/?location=${location}`);
    } else {
      setLocation('/');
    }
  };

  return (
    <header className="sticky top-0 bg-white border-b border-neutral-200 z-50 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <RestrLogoFull />
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <div className="flex items-center justify-between w-full px-4 py-2 text-sm text-left border border-neutral-300 rounded-full shadow-sm bg-white hover:shadow-md transition-shadow">
                <select 
                  className="w-full bg-transparent border-none focus:outline-none appearance-none cursor-pointer"
                  aria-label="Select a city"
                  value={selectedLocation}
                  onChange={handleLocationChange}
                >
                  <option value="" disabled>Select a location...</option>
                  <option value="new-york">New York</option>
                  <option value="paris">Paris</option>
                  <option value="london">London</option>
                  <option value="tokyo">Tokyo</option>
                  <option value="sydney">Sydney</option>
                  <option value="berlin">Berlin</option>
                  <option value="rome">Rome</option>
                  <option value="dubai">Dubai</option>
                  <option value="amsterdam">Amsterdam</option>
                  <option value="bangkok">Bangkok</option>
                  <option value="singapore">Singapore</option>
                  <option value="madrid">Madrid</option>
                  <option value="barcelona">Barcelona</option>
                  <option value="hong-kong">Hong Kong</option>
                  <option value="san-francisco">San Francisco</option>
                </select>
                <div className="bg-primary text-white p-2 rounded-full flex-shrink-0 ml-2">
                  <i className="ri-search-line text-sm"></i>
                </div>
              </div>
            </div>
          </div>

          {/* User Navigation */}
          <div className="flex items-center space-x-4">
            <Link href="/create-listing">
              <Button 
                variant="ghost" 
                className="hidden md:block text-sm font-medium hover:bg-neutral-100 px-4 py-2 rounded-full transition"
              >
                List your property
              </Button>
            </Link>
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 border border-neutral-300 p-2 rounded-full shadow-sm hover:shadow-md transition-shadow"
              >
                {isConnected && user ? (
                  <>
                    <i className="ri-menu-line text-neutral-600"></i>
                    <div className="hidden sm:flex items-center space-x-2 pr-1">
                      <span className="text-sm font-medium truncate max-w-[100px]">
                        {user.profile?.name || 'NOSTR User'}
                      </span>
                    </div>
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <img 
                        src={user.profile?.picture || DEFAULT_PROFILE_IMAGE} 
                        alt="User profile" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <i className="ri-menu-line text-neutral-600"></i>
                    <div className="bg-neutral-700 text-white rounded-full h-8 w-8 flex items-center justify-center">
                      <i className="ri-user-3-line"></i>
                    </div>
                  </>
                )}
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-neutral-200 overflow-hidden z-50">
                  <div className="py-2">
                    {/* NOSTR Login Section - only show if not connected */}
                    {!isConnected && (
                      <div className="px-4 py-3 border-b border-neutral-200">
                        <div className="font-semibold mb-1">Connect with NOSTR</div>
                        <p className="text-sm text-neutral-500 mb-3">Use your NOSTR identity to access restr</p>
                        <Button 
                          className="w-full bg-primary hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition"
                          onClick={openNostrModal}
                        >
                          Connect with NOSTR
                        </Button>
                      </div>
                    )}

                    {/* User Section - only show if connected */}
                    {isConnected && user && (
                      <div className="px-4 py-3 border-b border-neutral-200">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-neutral-200 overflow-hidden">
                            <img 
                              src={user.profile?.picture || DEFAULT_PROFILE_IMAGE} 
                              alt="User profile" 
                              className="h-full w-full object-cover" 
                            />
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.profile?.name || 'NOSTR User'}
                            </div>
                            <div className="text-xs text-neutral-500 truncate max-w-[200px] font-mono">
                              {user.npub}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    <Link href="/trips" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Trips
                    </Link>
                    <Link href="/wishlists" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Wishlists
                    </Link>
                    <Link href="/create-listing" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      List your property
                    </Link>
                    <Link href="/listings" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Manage listings
                    </Link>
                    <div className="border-t border-neutral-200"></div>
                    <Link href="/about" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      About restr
                    </Link>
                    <Link href="/community" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Community
                    </Link>
                    <Link href="/help" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Help Center
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search (Visible on small screens) */}
        <div className="block md:hidden pb-4">
          <div className="flex items-center w-full px-4 py-2 bg-white rounded-full border border-neutral-300 shadow-sm">
            <i className="ri-search-line text-neutral-500 mr-3"></i>
            <select 
              className="w-full bg-transparent border-none focus:outline-none appearance-none text-sm"
              aria-label="Select a city"
              value={selectedLocation}
              onChange={handleLocationChange}
            >
              <option value="" disabled>Select a location...</option>
              <option value="new-york">New York</option>
              <option value="paris">Paris</option>
              <option value="london">London</option>
              <option value="tokyo">Tokyo</option>
              <option value="sydney">Sydney</option>
              <option value="berlin">Berlin</option>
              <option value="rome">Rome</option>
              <option value="dubai">Dubai</option>
              <option value="amsterdam">Amsterdam</option>
              <option value="bangkok">Bangkok</option>
              <option value="singapore">Singapore</option>
              <option value="madrid">Madrid</option>
              <option value="barcelona">Barcelona</option>
              <option value="hong-kong">Hong Kong</option>
              <option value="san-francisco">San Francisco</option>
            </select>
          </div>
        </div>
      </div>

      {/* NOSTR Connect Modal */}
      <NostrConnectModal isOpen={showNostrModal} onClose={closeNostrModal} />
    </header>
  );
}
