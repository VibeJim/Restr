import { useState } from 'react';
import { Link } from 'wouter';
import { useNostr } from '@/context/nostr-provider';
import { DEFAULT_PROFILE_IMAGE } from '@/lib/constants';
import NostrConnectModal from './nostr-connect-modal';
import { Button } from './ui/button';

export default function Header() {
  const { user, isConnected } = useNostr();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNostrModal, setShowNostrModal] = useState(false);

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

  return (
    <header className="sticky top-0 bg-white border-b border-neutral-200 z-50 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.0049 2C15.3186 2 18.0049 4.68629 18.0049 8C18.0049 9.6955 17.269 11.2047 16.0693 12.243C19.049 13.188 21.0049 15.7764 21.0049 19H15.0049C15.0049 16.7909 13.214 15 11.0049 15C8.79575 15 7.00486 16.7909 7.00486 19H1.00488C1.00488 15.7763 2.96079 13.188 5.94051 12.243C4.74082 11.2047 4.00488 9.6955 4.00488 8C4.00488 4.68629 6.69117 2 10.0049 2H12.0049ZM12.0049 4H10.0049C7.79575 4 6.00488 5.79086 6.00488 8C6.00488 10.2091 7.79575 12 10.0049 12H12.0049C14.214 12 16.0049 10.2091 16.0049 8C16.0049 5.79086 14.214 4 12.0049 4Z"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-primary">NostrBnB</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-left border border-neutral-300 rounded-full shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="flex items-center divide-x divide-neutral-300">
                  <span className="pr-3 font-medium">Anywhere</span>
                  <span className="px-3 font-medium">Any week</span>
                  <span className="pl-3 text-neutral-500">Add guests</span>
                </div>
                <div className="bg-primary text-white p-2 rounded-full">
                  <i className="ri-search-line text-sm"></i>
                </div>
              </button>
            </div>
          </div>

          {/* User Navigation */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="hidden md:block text-sm font-medium hover:bg-neutral-100 px-4 py-2 rounded-full transition"
            >
              List your property
            </Button>
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 border border-neutral-300 p-2 rounded-full shadow-sm hover:shadow-md transition-shadow"
              >
                <i className="ri-menu-line text-neutral-600"></i>
                {isConnected && user?.profile?.picture ? (
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    <img 
                      src={user.profile.picture || DEFAULT_PROFILE_IMAGE} 
                      alt="User profile" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-neutral-700 text-white rounded-full h-8 w-8 flex items-center justify-center">
                    <i className="ri-user-3-line"></i>
                  </div>
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
                        <p className="text-sm text-neutral-500 mb-3">Use your NOSTR identity to access NostrBnB</p>
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
                              {user.profile?.name || user.npub}
                            </div>
                            <div className="text-sm text-neutral-500 truncate max-w-[200px]">
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
                    <Link href="/listings" className="block px-4 py-3 text-sm hover:bg-neutral-100 transition">
                      Manage listings
                    </Link>
                    <div className="border-t border-neutral-200"></div>
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
          <button className="flex items-center w-full px-4 py-3 bg-white rounded-full border border-neutral-300 shadow-sm">
            <i className="ri-search-line text-neutral-500 mr-3"></i>
            <span className="text-sm text-neutral-800">Where to?</span>
          </button>
        </div>
      </div>

      {/* NOSTR Connect Modal */}
      <NostrConnectModal isOpen={showNostrModal} onClose={closeNostrModal} />
    </header>
  );
}
