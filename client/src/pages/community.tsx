import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DEFAULT_PROFILE_IMAGE, RELAYS } from '@/lib/constants';
import { NostrEvent, NostrFilter } from '@/types/nostr';
import { useNostr } from '@/context/nostr-provider';
import { formatRelativeTime } from '@/lib/utils';
import { nip19 } from 'nostr-tools';

interface CommunityPost {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
  author?: {
    name?: string;
    picture?: string;
    npub?: string;
  };
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('guide');
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useNostr();
  const [location] = useLocation();
  
  // Check URL for tab parameter
  useEffect(() => {
    // Get tab from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    
    // Set active tab if valid
    if (tabParam && ['guide', 'posts'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  // Fetch community posts with #restrcommunity tag
  useEffect(() => {
    const fetchCommunityPosts = async () => {
      setIsLoading(true);
      try {
        const filter: NostrFilter = {
          kinds: [1], // regular notes
          '#t': ['restrcommunity'], // filter by tag
          limit: 20
        };

        // Function to create connections to NOSTR relays
        const createRelayConnections = (relays: string[]) => {
          return relays.map(relay => {
            try {
              const ws = new WebSocket(relay);
              return { url: relay, socket: ws, connected: false };
            } catch (e) {
              console.error(`Failed to connect to relay ${relay}:`, e);
              return null;
            }
          }).filter(Boolean);
        };

        // Subscribe to events with the filter
        const subscribeToEvents = (
          relayConnections: any[],
          filter: NostrFilter,
          onEvent: (event: NostrEvent) => void,
          onEose?: () => void
        ) => {
          const subscriptionId = Math.random().toString(36).substring(2, 15);
          
          relayConnections.forEach(relay => {
            const socket = relay.socket;
            
            // Handle WebSocket events
            socket.addEventListener('open', () => {
              relay.connected = true;
              const subMsg = ['REQ', subscriptionId, filter];
              socket.send(JSON.stringify(subMsg));
            });
            
            socket.addEventListener('message', (event: MessageEvent) => {
              try {
                const message = JSON.parse(event.data);
                if (message[0] === 'EVENT' && message[1] === subscriptionId) {
                  const nostrEvent = message[2];
                  onEvent(nostrEvent);
                } else if (message[0] === 'EOSE' && message[1] === subscriptionId && onEose) {
                  onEose();
                }
              } catch (e) {
                console.error('Error parsing WebSocket message:', e);
              }
            });
          });
          
          // Return unsubscribe function
          return () => {
            relayConnections.forEach(relay => {
              if (relay.connected) {
                const closeMsg = ['CLOSE', subscriptionId];
                relay.socket.send(JSON.stringify(closeMsg));
              }
            });
          };
        };

        // Connect to relays
        const relayConnections = createRelayConnections(RELAYS);
        
        // Collect posts
        const posts: CommunityPost[] = [];

        // Function to get user profile
        const getUserProfile = async (pubkey: string) => {
          try {
            const profileFilter: NostrFilter = {
              kinds: [0], // profile metadata
              authors: [pubkey],
              limit: 1
            };
            
            // Create temporary relay connections for profile fetching
            const tempRelayConnections = createRelayConnections(RELAYS.slice(0, 3));
            
            return new Promise<any>((resolve) => {
              const timeout = setTimeout(() => resolve({}), 5000); // 5 second timeout

              subscribeToEvents(
                tempRelayConnections,
                profileFilter,
                (event: NostrEvent) => {
                  try {
                    const content = JSON.parse(event.content);
                    clearTimeout(timeout);
                    resolve({
                      name: content.name || content.displayName || 'Anonymous',
                      picture: content.picture || DEFAULT_PROFILE_IMAGE,
                      about: content.about
                    });
                  } catch (e) {
                    console.error('Error parsing profile:', e);
                    resolve({});
                  }
                },
                () => {
                  // EOSE handler
                  clearTimeout(timeout);
                  resolve({});
                }
              );
              
              // Clean up after 5 seconds
              setTimeout(() => {
                tempRelayConnections.forEach(conn => {
                  if (conn && conn.socket.readyState === WebSocket.OPEN) {
                    conn.socket.close();
                  }
                });
              }, 5000);
            });
          } catch (e) {
            console.error('Error fetching user profile:', e);
            return {};
          }
        };

        // Process collected events
        const processEvent = async (event: NostrEvent) => {
          try {
            // Only process events with the correct tag and content
            if (
              event.kind === 1 && 
              event.tags.some(tag => tag[0] === 't' && tag[1] === 'restrcommunity') && 
              event.content
            ) {
              const profile = await getUserProfile(event.pubkey);
              
              // Create a post object
              const post: CommunityPost = {
                id: event.id,
                pubkey: event.pubkey,
                content: event.content,
                created_at: event.created_at,
                tags: event.tags,
                author: {
                  name: profile.name || 'Anonymous',
                  picture: profile.picture || DEFAULT_PROFILE_IMAGE,
                  npub: nip19.npubEncode(event.pubkey).substring(0, 12) + '...'
                }
              };
              
              // Add to posts array if not already present
              if (!posts.some(p => p.id === post.id)) {
                posts.push(post);
                
                // Sort posts by creation date (newest first) and update state
                const sortedPosts = [...posts].sort((a, b) => b.created_at - a.created_at);
                setCommunityPosts(sortedPosts);
              }
            }
          } catch (e) {
            console.error('Error processing event:', e);
          }
        };

        // Subscribe to events
        const unsubscribe = subscribeToEvents(
          relayConnections,
          filter,
          processEvent,
          () => {
            setIsLoading(false);
            
            // Cleanup connections after EOSE
            setTimeout(() => {
              relayConnections.forEach(conn => {
                if (conn && conn.socket.readyState === WebSocket.OPEN) {
                  conn.socket.close();
                }
              });
            }, 1000);
          }
        );

        // Set a fallback timeout in case EOSE is not received
        const fallbackTimeout = setTimeout(() => {
          setIsLoading(false);
          
          // If no posts were found, add sample posts
          if (posts.length === 0) {
            // Only show loading state, don't add fake data
            console.log('No posts found within timeout period');
          }
        }, 10000);

        // Cleanup function
        return () => {
          unsubscribe();
          clearTimeout(fallbackTimeout);
          relayConnections.forEach(conn => {
            if (conn && conn.socket.readyState === WebSocket.OPEN) {
              conn.socket.close();
            }
          });
        };
      } catch (e) {
        console.error('Error fetching community posts:', e);
        setIsLoading(false);
      }
    };

    fetchCommunityPosts();
  }, []);

  const hostGuideItems = [
    {
      icon: "ri-home-heart-line",
      title: "Welcome Guests with Care",
      description: "Create a welcoming environment with clear instructions, local recommendations, and thoughtful touches that make guests feel at home."
    },
    {
      icon: "ri-shield-check-line",
      title: "Prioritize Safety and Security",
      description: "Install smoke detectors, carbon monoxide alarms, fire extinguishers, and secure locks. Provide emergency contacts and first aid supplies."
    },
    {
      icon: "ri-message-3-line",
      title: "Communicate Clearly and Promptly",
      description: "Respond to inquiries and messages quickly, set clear expectations, and be available to address concerns during stays."
    },
    {
      icon: "ri-hand-coin-line",
      title: "Price Fairly and Transparently",
      description: "Set reasonable rates based on your property's features, location, and season. Avoid hidden fees and be transparent about any additional costs."
    },
    {
      icon: "ri-calendar-check-line",
      title: "Manage Your Calendar Effectively",
      description: "Keep your availability calendar up-to-date and honor all confirmed bookings. Set realistic minimum stay requirements."
    },
    {
      icon: "ri-recycle-line",
      title: "Embrace Sustainable Practices",
      description: "Offer recycling options, use energy-efficient appliances, provide eco-friendly amenities, and encourage resource conservation."
    },
    {
      icon: "ri-community-line",
      title: "Be a Good Neighbor",
      description: "Inform your neighbors about your hosting activities, create guidelines to prevent noise disturbances, and respect community standards."
    },
    {
      icon: "ri-book-open-line",
      title: "Know Local Regulations",
      description: "Research and comply with local laws, tax requirements, and zoning regulations related to short-term rentals in your area."
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold mb-4">restr Community</h1>
            <p className="text-lg text-neutral-600 mb-6">Join our community of responsible hosts and travelers building trust on the NOSTR network.</p>
          </div>
        </div>
      
        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-neutral-200 mb-8">
              <TabsList className="flex h-auto p-0 bg-transparent space-x-8">
                <TabsTrigger 
                  value="guide" 
                  className="px-1 py-3 font-medium data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 rounded-none text-neutral-500 hover:text-neutral-900 transition"
                >
                  Host Responsibly
                </TabsTrigger>
                <TabsTrigger 
                  value="posts" 
                  className="px-1 py-3 font-medium data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900 rounded-none text-neutral-500 hover:text-neutral-900 transition"
                >
                  Community Notes
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Host Responsibly Tab */}
            <TabsContent value="guide" className="mt-0">
              <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                  <h2 className="text-2xl font-bold mb-4">How to Host Responsibly</h2>
                  <p className="text-neutral-600 mb-6">
                    Being a responsible host is about more than just providing a clean space. It's about creating memorable experiences 
                    while respecting your community, your guests, and the environment. Follow these guidelines to become an outstanding host on restr.
                  </p>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded mb-8">
                    <h3 className="text-lg font-bold text-blue-700 mb-2">The NOSTR Advantage</h3>
                    <p className="text-neutral-700">
                      On restr, your reputation as a host is stored on the decentralized NOSTR protocol, giving you full ownership of your 
                      identity and reviews. This creates a portable reputation that follows you across the web, not just on our platform.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  {hostGuideItems.map((item, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mr-4 flex-shrink-0">
                        <i className={`${item.icon} text-2xl text-neutral-700`}></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                        <p className="text-neutral-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-neutral-200 pt-8 mb-12">
                  <h3 className="text-xl font-bold mb-4">Beyond the Basics: Building a Web of Trust</h3>
                  <p className="text-neutral-600 mb-6">
                    The NOSTR protocol allows hosts and guests to build a "web of trust" - a network of verified identities and attested 
                    relationships that create a more trustworthy experience for everyone.
                  </p>
                  
                  <div className="bg-neutral-50 p-6 rounded-lg space-y-4">
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <i className="ri-verified-badge-line text-lg text-green-600"></i>
                      </div>
                      <div>
                        <h4 className="font-bold">Verified Identities</h4>
                        <p className="text-sm text-neutral-600">Connect your NOSTR identity to existing social profiles and other verifiable credentials.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <i className="ri-group-line text-lg text-green-600"></i>
                      </div>
                      <div>
                        <h4 className="font-bold">Mutual Attestations</h4>
                        <p className="text-sm text-neutral-600">Give and receive attestations from other trusted NOSTR users who can vouch for your identity or property.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <i className="ri-history-line text-lg text-green-600"></i>
                      </div>
                      <div>
                        <h4 className="font-bold">Transparent History</h4>
                        <p className="text-sm text-neutral-600">Build a visible history of successful hosting experiences that stays with you across platforms.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-neutral-100 p-8 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="mb-6 md:mb-0 md:mr-6">
                      <h3 className="text-xl font-bold mb-3">Ready to Host on restr?</h3>
                      <p className="text-neutral-600">Create your listing and join our community of responsible hosts today.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button asChild className="bg-neutral-900 hover:bg-neutral-800 text-white">
                        <Link href="/create-listing">Create a Listing</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/support?tab=help-center">Learn More</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Community Notes Tab */}
            <TabsContent value="posts" className="mt-0">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Community Notes</h2>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center"
                    disabled={!isConnected}
                    onClick={() => {
                      if (isConnected) {
                        window.open("https://snort.social/compose?tags=restrcommunity", "_blank");
                      }
                    }}
                  >
                    <i className="ri-add-line mr-2"></i>
                    Share a Note
                  </Button>
                </div>
                
                {!isConnected && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <i className="ri-information-line text-yellow-400"></i>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Connect your NOSTR account to share notes with the community. Notes with the tag #restrcommunity will appear here.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="border border-neutral-200">
                        <CardContent className="p-6">
                          <div className="flex items-center mb-4">
                            <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse mr-3"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-neutral-200 animate-pulse rounded w-1/3 mb-2"></div>
                              <div className="h-3 bg-neutral-200 animate-pulse rounded w-1/4"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 bg-neutral-200 animate-pulse rounded w-full"></div>
                            <div className="h-4 bg-neutral-200 animate-pulse rounded w-full"></div>
                            <div className="h-4 bg-neutral-200 animate-pulse rounded w-2/3"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : communityPosts.length > 0 ? (
                  <div className="space-y-6">
                    {communityPosts.map((post) => (
                      <Card key={post.id} className="border border-neutral-200">
                        <CardContent className="p-6">
                          <div className="flex items-center mb-4">
                            <img 
                              src={post.author?.picture || DEFAULT_PROFILE_IMAGE} 
                              alt={post.author?.name || 'Anonymous'}
                              className="h-10 w-10 rounded-full object-cover mr-3"
                            />
                            <div>
                              <h4 className="font-bold">{post.author?.name || 'Anonymous'}</h4>
                              <div className="flex items-center text-sm text-neutral-500">
                                <span>{post.author?.npub || 'unknown'}</span>
                                <span className="mx-2">•</span>
                                <span>{formatRelativeTime(post.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="whitespace-pre-line text-neutral-700">{post.content}</p>
                          
                          <div className="mt-4 flex items-center">
                            {post.tags
                              .filter(tag => tag[0] === 't' && tag[1] !== 'restrcommunity')
                              .map((tag, i) => (
                                <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 mr-2">
                                  #{tag[1]}
                                </span>
                              ))
                            }
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center justify-between">
                            <a 
                              href={`https://snort.social/e/${nip19.noteEncode(post.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center"
                            >
                              View on Snort
                              <i className="ri-external-link-line ml-1"></i>
                            </a>
                            
                            <a 
                              href={`https://nostrbrowser.com/e/${post.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center"
                            >
                              View on NOSTR
                              <i className="ri-external-link-line ml-1"></i>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                      <i className="ri-chat-3-line text-2xl text-neutral-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No community notes found</h3>
                    <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                      Be the first to share a note with the #restrcommunity tag on NOSTR.
                    </p>
                    <Button 
                      variant="outline" 
                      className="flex items-center mx-auto"
                      disabled={!isConnected}
                      onClick={() => {
                        if (isConnected) {
                          window.open("https://snort.social/compose?tags=restrcommunity", "_blank");
                        }
                      }}
                    >
                      <i className="ri-add-line mr-2"></i>
                      Share a Note
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}