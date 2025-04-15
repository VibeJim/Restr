import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useNostr } from '@/context/nostr-provider';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { publishListing } from '@/lib/nostr';
import { NostrListingContent } from '@/types/nostr';
import { AMENITIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function CreateListing() {
  const { isConnected } = useNostr();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<NostrListingContent>>({
    title: '',
    description: '',
    location: '',
    price: 0,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'],
    beds: 1,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
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
    
    if (!isConnected) {
      toast({
        title: "Authentication Required",
        description: "Please connect with NOSTR to create a listing",
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

      const listingContent: NostrListingContent = {
        title: formData.title!,
        description: formData.description!,
        location: formData.location!,
        price: formData.price!,
        currency: formData.currency || 'USD',
        images: cleanImages,
        beds: formData.beds || 1,
        bedrooms: formData.bedrooms || 1,
        bathrooms: formData.bathrooms || 1,
        maxGuests: formData.maxGuests || 1,
        amenities: formData.amenities || []
      };

      const eventId = await publishListing(listingContent);
      
      if (eventId) {
        toast({
          title: "Listing Created",
          description: "Your property has been listed successfully",
          variant: "default"
        });
        navigate('/');
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

  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow py-8 container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold mb-4">Connect with NOSTR</h1>
            <p className="mb-6 text-neutral-600">
              You need to connect with NOSTR to create a listing. This allows you to sign your listing and receive messages from potential guests.
            </p>
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
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location"
                      name="location"
                      value={formData.location || ''}
                      onChange={handleChange}
                      placeholder="e.g. New York, NY"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-6">
                <h2 className="text-xl font-semibold">Property Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="price">Price per night</Label>
                    <div className="mt-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                      <Input 
                        id="price"
                        name="price"
                        type="number"
                        min="1"
                        value={formData.price || ''}
                        onChange={handleChange}
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency || 'USD'}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
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
                      <li><a href="https://imgur.com/" target="_blank" rel="noopener noreferrer" className="text-primary">Imgur</a></li>
                      <li><a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-primary">ImgBB</a></li>
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
