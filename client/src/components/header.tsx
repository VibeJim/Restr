import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useNostr } from '@/context/nostr-provider';
import NostrConnectModal from './nostr-connect-modal';
import { Button } from './ui/button';
import { RestrLogoFull } from './restr-logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { filterUserCreatedListings, filterUserViewedListings, filterUserSavedListings } from '@/lib/user-history';

export interface HeaderProps {
  onLocationChange?: (location: string) => void;
}

export default function Header({ onLocationChange }: HeaderProps) {
  const { user, isConnected, disconnect } = useNostr();
  const [, setLocation] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNostrModal, setShowNostrModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  // Returns the best available user display name or a clear empty fallback.
  const getUserDisplayName = () => {
    const displayName = typeof user?.profile?.display_name === 'string' ? user.profile.display_name.trim() : '';
    if (displayName) {
      return displayName;
    }

    const name = typeof user?.profile?.name === 'string' ? user.profile.name.trim() : '';
    return name || 'No name';
  };

  // Returns a usable avatar URL, or undefined when unavailable.
  const getUserPicture = () => {
    const picture = typeof user?.profile?.picture === 'string' ? user.profile.picture.trim() : '';
    return picture || undefined;
  };

  const userDisplayName = getUserDisplayName();
  const userPicture = getUserPicture();
  const showUserPicture = !!userPicture && !avatarLoadFailed;

  // Resets image failure state when the connected user/avatar changes.
  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.pubkey, userPicture]);

  const toggleUserMenu = () => {
    // console.log(user);
    setShowUserMenu(!showUserMenu);
  };

  const openNostrModal = () => {
    setShowNostrModal(true);
    setShowUserMenu(false);
  };

  const closeNostrModal = () => {
    setShowNostrModal(false);
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Close the menu after selection
    setTimeout(() => setShowUserMenu(false), 100);
    
    // Navigate based on tab selection
    switch(value) {
      case 'all':
        setLocation('/?tab=all');
        break;
      case 'viewed':
        setLocation('/?tab=viewed');
        break;
      case 'saved':
        setLocation('/?tab=saved');
        break;
      case 'created':
        setLocation('/?tab=created');
        break;
      default:
        setLocation('/');
        break;
    }
  };
  
  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const location = e.target.value;
    setSelectedLocation(location);
    
    // If we have the callback, use it
    if (onLocationChange) {
      onLocationChange(location);
    }
    
    // Update URL with the search param
    if (location && location !== 'all') {
      setLocation(`/?location=${location}`);
    } else {
      setLocation('/');
    }
  };

  return (
    <header className="sticky top-0 bg-white border-b border-amber-100 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/?tab=all" className="flex items-center" onClick={() => window.location.href = '/?tab=all'}>
              <RestrLogoFull />
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <div className="flex items-center justify-between w-full px-3 py-1.5 text-sm text-left border border-neutral-200 rounded-full bg-white hover:border-amber-300 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-amber-100 shadow-sm hover:shadow transition-all duration-200">
                <select 
                  className="w-full bg-transparent border-none focus:outline-none appearance-none cursor-pointer text-neutral-700 placeholder:text-neutral-400"
                  aria-label="Select a city"
                  value={selectedLocation}
                  onChange={handleLocationChange}
                >
                  <option value="" disabled>Select a location...</option>
                  <option value="all">All</option>
                  <optgroup label="Big City Life">
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
                  </optgroup>
                  <optgroup label="Sat Cities">
                    <option value="san-salvador">San Salvador</option>
                    <option value="lugano">Lugano</option>
                    <option value="miami">Miami</option>
                    <option value="el-zonte">El Zonte</option>
                    <option value="madeira">Madeira</option>
                    <option value="prospera">Próspera</option>
                    <option value="dubai">Dubai</option>
                  </optgroup>
                </select>
                <div className="bg-orange-400 text-white p-1.5 rounded-full flex-shrink-0 ml-2 shadow-sm hover:bg-orange-600 transition-colors w-7 h-7 flex items-center justify-center">
                  <i className="ri-search-line text-[15px]"></i>
                </div>
              </div>
            </div>
          </div>

          {/* User Navigation */}
          <div className="flex items-center space-x-4">
            <Link href="/create-listing">
              <Button 
                variant="ghost" 
                className="hidden md:block text-sm font-medium hover:bg-amber-50 px-4 py-2 rounded-full transition text-orange-400"
              >
                List your property
              </Button>
            </Link>
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 border border-neutral-300 p-2 rounded-full shadow-sm hover:shadow-md hover:border-amber-300 transition"
              >
                {isConnected && user ? (
                  <>
                    <i className="ri-menu-line text-neutral-600"></i>
                    <div className="hidden sm:flex items-center space-x-2 pr-1">
                      <span className="text-sm font-medium truncate max-w-[100px]">
                        {userDisplayName}
                      </span>
                    </div>
                    {showUserPicture ? (
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-200">
                        <img
                          src={userPicture}
                          alt="User profile"
                          className="h-full w-full object-cover"
                          onError={() => setAvatarLoadFailed(true)}
                        />
                      </div>
                    ) : (
                      <div className="bg-neutral-700 text-white rounded-full h-8 w-8 flex items-center justify-center">
                        <i className="ri-user-3-line"></i>
                      </div>
                    )}
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
                        <p className="text-sm text-neutral-500 mb-3">Use your NOSTR identity to access Restr</p>
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
                          {showUserPicture ? (
                            <div className="h-10 w-10 rounded-full bg-neutral-200 overflow-hidden">
                              <img
                                src={userPicture}
                                alt="User profile"
                                className="h-full w-full object-cover"
                                onError={() => setAvatarLoadFailed(true)}
                              />
                            </div>
                          ) : (
                            <div className="bg-neutral-700 text-white rounded-full h-10 w-10 flex items-center justify-center">
                              <i className="ri-user-3-line"></i>
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {userDisplayName}
                            </div>
                            <div className="text-xs text-neutral-500 truncate max-w-[200px] font-mono">
                              {user.npub}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    

                    {/* Menu Items */}
                    <a 
                      href="/?tab=saved" 
                      onClick={() => window.location.href = '/?tab=saved'} 
                      className="block px-4 py-3 text-sm hover:bg-neutral-100 transition"
                    >
                      Saved Listings
                    </a>
                    <Link href="/create-listing" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      List your property
                    </Link>
                    <a href="/?tab=created" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition" onClick={() => window.location.href = '/?tab=created'}>
                      Your listings
                    </a>
                    <div className="border-t border-neutral-200"></div>
                    <Link href="/about" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      About Restr
                    </Link>
                    <Link href="/community" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Community
                    </Link>
                    <Link href="/help" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Help Center
                    </Link>
                    {/* Disconnect Button - only show if connected */}
                    {isConnected && (
                      <div className="px-4 py-3">
                        <Button 
                          variant="ghost"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-medium py-2 px-4 rounded-lg transition flex items-center justify-center"
                          onClick={() => {
                            disconnect();
                            setShowUserMenu(false);
                          }}
                        >
                          <i className="ri-logout-box-line mr-2"></i>
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search (Visible on small screens) */}
        <div className="block md:hidden pb-4">
          <div className="relative w-full">
            <div className="flex items-center w-full px-3 py-1.5 bg-white rounded-full border border-neutral-200 hover:border-neutral-300 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-100 shadow-sm hover:shadow transition-all duration-200">
              <i className="ri-search-line text-[15px] text-neutral-500 mr-3"></i>
              <select 
                className="w-full bg-transparent border-none focus:outline-none appearance-none text-sm text-neutral-700 placeholder:text-neutral-400"
                aria-label="Select a city"
                value={selectedLocation}
                onChange={handleLocationChange}
              >
                <option value="" disabled>Select a location...</option>
                <option value="all">All</option>
                
                <optgroup label="Big City Life">
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
                </optgroup>
                
                <optgroup label="Sat Cities">
                  <option value="san-salvador">San Salvador</option>
                  <option value="lugano">Lugano</option>
                  <option value="miami">Miami</option>
                  <option value="el-zonte">El Zonte</option>
                  <option value="madeira">Madeira</option>
                  <option value="prospera">Próspera</option>
                  <option value="dubai">Dubai</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* NOSTR Connect Modal */}
      <NostrConnectModal isOpen={showNostrModal} onClose={closeNostrModal} />
    </header>
  );
}
