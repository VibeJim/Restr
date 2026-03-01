import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useNostr } from '@/context/nostr-provider';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { publishListing } from '@/lib/nostr';
import { NostrListingContent } from '@/types/nostr';
import { AMENITIES, PLACE_TYPES, STAY_TYPES, CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import ListingSuccess from '@/components/listing-success';

export default function CreateListing() {
  const { isConnected } = useNostr();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNostrOptions, setShowNostrOptions] = useState(false);
  const [nostrOption, setNostrOption] = useState<'extension' | 'generate'>('extension');
  const [listingCreated, setListingCreated] = useState(false);
  const [createdListingId, setCreatedListingId] = useState('');
  const [generatedKeyPair, setGeneratedKeyPair] = useState<any>(null);
  
  const [formData, setFormData] = useState<Partial<NostrListingContent>>({
    title: '',
    description: '',
    location: '',
    suburb: '',
    price: 0,
    currency: 'BTC',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'],
    beds: 1,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    categories: [],
    type: [],
    amenities: []
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric values
    if (['price', 'beds', 'bedrooms', 'bathrooms', 'maxGuests'].includes(name)) {
      setFormData({
        ...formData,
        [name]: parseInt(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    const currentAmenities = formData.amenities || [];
    
    if (currentAmenities.includes(amenity)) {
      setFormData({
        ...formData,
        amenities: currentAmenities.filter(a => a !== amenity)
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...currentAmenities, amenity]
      });
    }
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = formData.categories || [];
    console.log(`Toggle category: ${category}`);
    
    // Make sure we store the exact string from CATEGORIES constant
    // This ensures exact matching between what's displayed and what's stored
    const categoryToAdd = CATEGORIES.find(c => c.name === category)?.name || category;
    
    if (currentCategories.includes(categoryToAdd)) {
      setFormData({ 
        ...formData, 
        categories: currentCategories.filter((c: string) => c !== categoryToAdd) 
      });
    } else {
      setFormData({ 
        ...formData, 
        categories: [...currentCategories, categoryToAdd] 
      });
    }
  };

  const handleTypeToggle = (type: string) => {
    const currentTypes = formData.type || [];
    if (currentTypes.includes(type)) {
      setFormData({ ...formData, type: currentTypes.filter((t: string) => t !== type) });
    } else {
      setFormData({ ...formData, type: [...currentTypes, type] });
    }
  };

  const handleImageUrlChange = (url: string, index: number) => {
    const updatedImages = [...(formData.images || [])];
    updatedImages[index] = url;
    setFormData({
      ...formData,
      images: updatedImages
    });
  };

  const addImageField = () => {
    setFormData({
      ...formData,
      images: [...(formData.images || []), '']
    });
  };

  const removeImageField = (index: number) => {
    const updatedImages = [...(formData.images || [])];
    updatedImages.splice(index, 1);
    setFormData({
      ...formData,
      images: updatedImages
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If not connected and we haven't chosen to generate a key (or haven't progressed to form)
    if (!isConnected && !showNostrOptions) {
      toast({
        title: "Authentication Required",
        description: "Please connect with NOSTR to create a listing or choose to generate a new key",
        variant: "destructive"
      });
      return;
    }

    // Basic validation
    if (!formData.title || !formData.description || !formData.location || !formData.price) {
      toast({
        title: "Missing Fields",
        description: "Please fill out all required fields",
        variant: "destructive"
      });
      return;
    }

    // Type of place is required
    const selectedPlaceTypes = (formData.type || []).filter(t =>
      PLACE_TYPES.some(p => p.name === t)
    );
    if (selectedPlaceTypes.length === 0) {
      toast({
        title: "Type of Place Required",
        description: "Please select at least one option under Type of Place",
        variant: "destructive"
      });
      return;
    }

    // Type of stay is required
    const selectedStayTypes = (formData.type || []).filter(t =>
      STAY_TYPES.some(s => s.name === t)
    );
    if (selectedStayTypes.length === 0) {
      toast({
        title: "Type of Stay Required",
        description: "Please select at least one option under Type of Stay",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Clean up empty image URLs
      const cleanImages = (formData.images || []).filter(url => url.trim() !== '');
      
      if (cleanImages.length === 0) {
        toast({
          title: "Image Required",
          description: "Please provide at least one image URL",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Get the city label from the select element
      const citySelect = document.getElementById('location') as HTMLSelectElement;
      const cityLabel = citySelect.options[citySelect.selectedIndex].text;

      // Combine suburb and location if suburb exists
      const fullLocation = formData.suburb 
        ? `${formData.suburb}, ${cityLabel}`
        : cityLabel;

      const listingContent: NostrListingContent = {
        title: formData.title!,
        description: formData.description!,
        location: fullLocation,
        price: formData.price!,
        currency: formData.currency || 'USD',
        images: cleanImages,
        beds: formData.beds || 1,
        bedrooms: formData.bedrooms || 1,
        bathrooms: formData.bathrooms || 1,
        maxGuests: formData.maxGuests || 1,
        amenities: formData.amenities || [],
        type: formData.type || [],
        category: formData.categories || []
      };

      // Debug output
      console.log("Submitting listing with categories:", formData.categories);
      console.log("Full listing content:", listingContent);

      // Use the appropriate method based on the user's choice
      const useNewKey = nostrOption === 'generate' || !isConnected;
      console.log("Using new key:", useNewKey);
      
      // Always generate a new key if not connected or if explicitly chosen to do so
      const result = await publishListing(listingContent);
      
      if (result.eventId) {
        toast({
          title: "Listing Created",
          description: "Your property has been listed successfully",
          variant: "default"
        });
        
        // If we generated a new key, save it and show the success screen with key information
        if (result.keyPair) {
          setGeneratedKeyPair(result.keyPair);
          setCreatedListingId(result.eventId);
          setListingCreated(true);
          
          // After showing the key info, automatically redirect to home page after a delay
          // setTimeout(() => {
          //   navigate('/?refresh=' + Date.now());
          // }, 10000); // 10 seconds delay to allow user to save keys
        } else {
          // Otherwise, redirect to the home page with a refresh parameter to trigger a data refresh
          navigate('/?refresh=' + Date.now());
        }
      } else {
        toast({
          title: "Listing Failed",
          description: "Failed to create listing on NOSTR network. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: "Error",
        description: "An error occurred while creating your listing",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we've created a listing with a generated key, show the success screen
  if (listingCreated && generatedKeyPair && createdListingId) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow py-8 container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <ListingSuccess keyPair={generatedKeyPair} listingId={createdListingId} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If not connected with NOSTR extension and we haven't chosen to generate a key, offer options
  if (!isConnected && !showNostrOptions) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow py-8 container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold mb-4">Create Your Listing</h1>
            <p className="mb-6 text-neutral-600">
              Choose how you want to publish your listing on the NOSTR network:
            </p>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-4 hover:border-primary cursor-pointer" 
                onClick={() => setNostrOption('extension')}>
                <div className="flex items-start space-x-3">
                  <div className={`rounded-full h-5 w-5 border flex items-center justify-center mt-0.5 ${nostrOption === 'extension' ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                    {nostrOption === 'extension' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Connect with NOSTR Extension</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      Use your existing NOSTR identity through a browser extension like flamingo, nos2x, or Alby.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 hover:border-primary cursor-pointer" 
                onClick={() => setNostrOption('generate')}>
                <div className="flex items-start space-x-3">
                  <div className={`rounded-full h-5 w-5 border flex items-center justify-center mt-0.5 ${nostrOption === 'generate' ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                    {nostrOption === 'generate' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Generate a New Nostr Identity</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      Create a new NOSTR identity just for this listing. You'll receive a private key to manage your listing.
                    </p>
                  </div>
                </div>
              </div>
              
              {nostrOption === 'extension' ? (
                <Button 
                  className="w-full"
                  onClick={() => {
                    // This could open the NOSTR connect modal
                    toast({
                      title: "Connect from Header",
                      description: "Please use the connect button in the header",
                      variant: "default"
                    });
                  }}
                >
                  Connect with NOSTR
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => setShowNostrOptions(true)}
                >
                  Continue with New Key
                </Button>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">List Your Property</h1>
            <p className="text-neutral-600 mb-8">
              Share your space on the NOSTR network and connect with guests around the world.
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Property Title</Label>
                    <Input 
                      id="title"
                      name="title"
                      value={formData.title || ''}
                      onChange={handleChange}
                      placeholder="e.g. Cozy Downtown Apartment"
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description"
                      name="description"
                      value={formData.description || ''}
                      onChange={handleChange}
                      placeholder="Describe your property, the neighborhood, and what makes it special..."
                      className="mt-1 h-32"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="suburb">Suburb/Neighborhood (Optional)</Label>
                    <Input 
                      id="suburb"
                      name="suburb"
                      value={formData.suburb || ''}
                      onChange={handleChange}
                      placeholder="e.g. Manhattan, Downtown, West End"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="location">City</Label>
                    <select 
                      id="location"
                      name="location"
                      value={formData.location || ''}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-2 pr-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                      required
                    >
                      <option value="" disabled>Select a location...</option>
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

              {/* Details */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
                <h2 className="text-xl font-semibold">Property Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Currency selector */}
                  <div>
                    <Label>Currency</Label>
                    <div className="mt-1 flex rounded-md overflow-hidden border border-input">
                      {[
                        { value: 'USD', label: 'USD', symbol: '$' },
                        { value: 'BTC', label: '₿ Bitcoin', symbol: '₿' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, currency: opt.value })}
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${
                            formData.currency === opt.value
                              ? 'bg-[#FF8900] text-white'
                              : 'bg-white text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <Label htmlFor="price">
                      Price per night ({formData.currency === 'USD' ? 'USD' : 'BTC'})
                    </Label>
                    <div className="mt-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-neutral-500">
                        {formData.currency === 'USD' ? '$' : '₿'}
                      </span>
                      <Input 
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step={formData.currency === 'USD' ? '1' : '0.00000001'}
                        value={formData.price || ''}
                        onChange={handleChange}
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input 
                      id="bedrooms"
                      name="bedrooms"
                      type="number"
                      min="0"
                      value={formData.bedrooms || ''}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="beds">Beds</Label>
                    <Input 
                      id="beds"
                      name="beds"
                      type="number"
                      min="1"
                      value={formData.beds || ''}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input 
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.bathrooms || ''}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maxGuests">Maximum Guests</Label>
                    <Input 
                      id="maxGuests"
                      name="maxGuests"
                      type="number"
                      min="1"
                      value={formData.maxGuests || ''}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
                <h2 className="text-xl font-semibold">Categories</h2>
                <p className="text-neutral-500 text-sm">Select the categories your property belongs to</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {CATEGORIES.map((category, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`category-${index}`}
                        checked={(formData.categories || []).includes(category.name)}
                        onCheckedChange={() => handleCategoryToggle(category.name)}
                      />
                      <label 
                        htmlFor={`category-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <i className={`${category.icon} mr-2 text-neutral-600`}></i>
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Type of Place — required */}
              <div className={`bg-white p-6 rounded-xl border space-y-4 ${
                (formData.type || []).filter(t => PLACE_TYPES.some(p => p.name === t)).length === 0
                  ? 'border-neutral-200'
                  : 'border-green-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Type of Place <span className="text-red-500">*</span></h2>
                    <p className="text-neutral-500 text-sm mt-0.5">Select what kind of space guests will have</p>
                  </div>
                  {(formData.type || []).filter(t => PLACE_TYPES.some(p => p.name === t)).length > 0 && (
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                      <i className="ri-check-line"></i> Selected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PLACE_TYPES.map((type, index) => {
                    const isSelected = (formData.type || []).includes(type.name);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleTypeToggle(type.name)}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                          isSelected
                            ? 'border-[#FF8900] bg-orange-50 text-[#FF8900]'
                            : 'border-neutral-200 hover:border-neutral-400 text-neutral-600'
                        }`}
                      >
                        <i className={`${type.icon} text-2xl`}></i>
                        {type.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type of Stay — required */}
              <div className={`bg-white p-6 rounded-xl border space-y-4 ${
                (formData.type || []).filter(t => STAY_TYPES.some(s => s.name === t)).length === 0
                  ? 'border-neutral-200'
                  : 'border-green-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Type of Stay <span className="text-red-500">*</span></h2>
                    <p className="text-neutral-500 text-sm mt-0.5">Select the rental duration or arrangement</p>
                  </div>
                  {(formData.type || []).filter(t => STAY_TYPES.some(s => s.name === t)).length > 0 && (
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                      <i className="ri-check-line"></i> Selected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {STAY_TYPES.map((type, index) => {
                    const isSelected = (formData.type || []).includes(type.name);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleTypeToggle(type.name)}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                          isSelected
                            ? 'border-[#FF8900] bg-orange-50 text-[#FF8900]'
                            : 'border-neutral-200 hover:border-neutral-400 text-neutral-600'
                        }`}
                      >
                        <i className={`${type.icon} text-2xl`}></i>
                        {type.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amenities */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
                <h2 className="text-xl font-semibold">Amenities</h2>
                <p className="text-neutral-500 text-sm">Select the amenities your property offers</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {AMENITIES.map((amenity, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`amenity-${index}`}
                        checked={(formData.amenities || []).includes(amenity.name)}
                        onCheckedChange={() => handleAmenityToggle(amenity.name)}
                      />
                      <label 
                        htmlFor={`amenity-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                      >
                        <i className={`${amenity.icon} mr-2 text-neutral-600`}></i>
                        {amenity.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
                <h2 className="text-xl font-semibold">Images</h2>
                <p className="text-neutral-500 text-sm">Add images of your property (URLs)</p>
                
                <div className="space-y-4">
                  {(formData.images || []).map((url, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Input 
                        value={url}
                        onChange={(e) => handleImageUrlChange(e.target.value, index)}
                        placeholder="Image URL"
                        className="flex-grow"
                      />
                      {index > 0 && (
                        <Button 
                          type="button"
                          variant="outline"
                          className="flex-shrink-0"
                          onClick={() => removeImageField(index)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={addImageField}
                    className="w-full"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Add Another Image
                  </Button>

                  <div className="text-sm text-neutral-500">
                    <p>Need image hosting? Try these free services:</p>
                    <ul className="list-disc list-inside mt-1">
                      {/* <li><a href="https://imgur.com/" target="_blank" rel="noopener noreferrer" className="text-primary">Imgur</a></li>
                      <li><a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-primary">ImgBB</a></li> */}
                      <li><a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" className="text-primary">PostImages</a></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="px-8 py-6 text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Publishing to NOSTR...
                    </>
                  ) : (
                    <>Publish Listing</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
