import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface FiltersProps {
  onFilterChange: (filters: Record<string, any>) => void;
}

export default function Filters({ onFilterChange }: FiltersProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      const updatedFilters: Record<string, any> = { activeFilters };
      
      if (priceRange[0] > 0 || priceRange[1] < 1000) {
        updatedFilters.priceRange = priceRange;
      }
      
      if (propertyType) {
        updatedFilters.propertyType = propertyType;
      }
      
      onFilterChange(updatedFilters);
    } else {
      isMounted.current = true;
    }
  }, [activeFilters, priceRange, propertyType]);

  const toggleFilter = (filter: string) => {
    if (activeFilters.includes(filter)) {
      const updatedFilters = activeFilters.filter(f => f !== filter);
      setActiveFilters(updatedFilters);
    } else {
      const updatedFilters = [...activeFilters, filter];
      setActiveFilters(updatedFilters);
    }
  };
  
  const handlePriceClick = () => {
    setIsPriceDialogOpen(true);
  };
  
  const handleTypeClick = () => {
    setIsTypePopoverOpen(!isTypePopoverOpen);
  };

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex items-center space-x-4 overflow-x-auto custom-scrollbar">
          <Button 
            variant="outline" 
            className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:border-neutral-400 transition"
          >
            <i className="ri-equalizer-line mr-2"></i>
            Filters
          </Button>
          
          {/* Price Button and Dialog */}
          <div>
            <Button 
              variant="outline"
              className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition ${
                priceRange[0] > 0 || priceRange[1] < 1000
                  ? 'border-neutral-800 bg-neutral-50' 
                  : 'border-neutral-300 hover:border-neutral-400'
              }`}
              onClick={handlePriceClick}
            >
              <span>
                {priceRange[0] > 0 || priceRange[1] < 1000 
                  ? `ϟ${priceRange[0]} - ϟ${priceRange[1]}`
                  : 'Price'
                }
              </span>
              <i className="ri-arrow-down-s-line ml-1"></i>
            </Button>
            
            <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogTitle>Price range</DialogTitle>
                <div className="py-6">
                  <div className="flex justify-between mb-4">
                    <div className="p-4 border rounded-lg">
                      <span className="block text-xs text-neutral-500">min price</span>
                      <div className="text-lg font-medium">ϟ {priceRange[0]}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <span className="block text-xs text-neutral-500">max price</span>
                      <div className="text-lg font-medium">ϟ {priceRange[1]}</div>
                    </div>
                  </div>
                  
                  <Slider 
                    value={[priceRange[0], priceRange[1]]}
                    min={0}
                    max={1000}
                    step={10}
                    onValueChange={(value) => setPriceRange([value[0], value[1]])}
                    className="my-6"
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setPriceRange([0, 1000]);
                      setIsPriceDialogOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button onClick={() => setIsPriceDialogOpen(false)}>
                    Apply
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Type of Place Popover */}
          <Popover open={isTypePopoverOpen} onOpenChange={setIsTypePopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline"
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition ${
                  propertyType 
                    ? 'border-neutral-800 bg-neutral-50' 
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}
                onClick={handleTypeClick}
              >
                <span>{propertyType || 'Type of place'}</span>
                <i className="ri-arrow-down-s-line ml-1"></i>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="py-2">
                {['Entire home', 'Private room', 'Shared room', 'Hotel'].map((type) => (
                  <button
                    key={type}
                    className={`w-full px-4 py-2 text-left hover:bg-neutral-100 ${
                      propertyType === type ? 'bg-neutral-50 font-medium' : ''
                    }`}
                    onClick={() => {
                      setPropertyType(type);
                      setIsTypePopoverOpen(false);
                    }}
                  >
                    {type}
                  </button>
                ))}
                <div className="border-t border-neutral-200 mt-2 pt-2 px-4">
                  <button
                    className="text-sm text-neutral-500 hover:text-neutral-800"
                    onClick={() => {
                      setPropertyType(null);
                      setIsTypePopoverOpen(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition ${
              activeFilters.includes('cancellation') 
                ? 'border-neutral-800 bg-neutral-50' 
                : 'border-neutral-300 hover:border-neutral-400'
            }`}
            onClick={() => toggleFilter('cancellation')}
          >
            <span>Free cancellation</span>
          </Button>
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition ${
              activeFilters.includes('wifi') 
                ? 'border-neutral-800 bg-neutral-50' 
                : 'border-neutral-300 hover:border-neutral-400'
            }`}
            onClick={() => toggleFilter('wifi')}
          >
            <span>Wifi</span>
          </Button>
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition ${
              activeFilters.includes('selfCheckin') 
                ? 'border-neutral-800 bg-neutral-50' 
                : 'border-neutral-300 hover:border-neutral-400'
            }`}
            onClick={() => toggleFilter('selfCheckin')}
          >
            <span>Self check-in</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
