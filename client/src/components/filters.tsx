import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FiltersProps {
  onFilterChange: (filters: Record<string, any>) => void;
}

export default function Filters({ onFilterChange }: FiltersProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filter: string) => {
    if (activeFilters.includes(filter)) {
      const updatedFilters = activeFilters.filter(f => f !== filter);
      setActiveFilters(updatedFilters);
      onFilterChange({ activeFilters: updatedFilters });
    } else {
      const updatedFilters = [...activeFilters, filter];
      setActiveFilters(updatedFilters);
      onFilterChange({ activeFilters: updatedFilters });
    }
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
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition ${
              activeFilters.includes('price') 
                ? 'border-neutral-800 bg-neutral-50' 
                : 'border-neutral-300 hover:border-neutral-400'
            }`}
            onClick={() => toggleFilter('price')}
          >
            <span>Price</span>
            <i className="ri-arrow-down-s-line ml-1"></i>
          </Button>
          
          <Button 
            variant="outline"
            className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition ${
              activeFilters.includes('type') 
                ? 'border-neutral-800 bg-neutral-50' 
                : 'border-neutral-300 hover:border-neutral-400'
            }`}
            onClick={() => toggleFilter('type')}
          >
            <span>Type of place</span>
            <i className="ri-arrow-down-s-line ml-1"></i>
          </Button>
          
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
