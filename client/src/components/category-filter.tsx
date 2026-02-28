import { useState, useEffect } from 'react';
import { CATEGORY_ICONS } from '@/lib/constants';

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
  activeCategory?: string;
}

export default function CategoryFilter({ onCategoryChange, activeCategory: externalActiveCategory }: CategoryFilterProps) {
  const [activeCategory, setActiveCategory] = useState(externalActiveCategory || 'All homes');
  
  // Update internal state if the prop changes
  useEffect(() => {
    if (externalActiveCategory && externalActiveCategory !== activeCategory) {
      setActiveCategory(externalActiveCategory);
    }
  }, [externalActiveCategory]);
  
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    onCategoryChange(category);
  };

  const categories = Object.keys(CATEGORY_ICONS);

  return (
    <div className="border-b border-amber-100 bg-white shadow-sm">
      <div className="container mx-auto px-4 max-w-fit sm:px-0 lg:px-0">
        <div className="flex items-center pt-5 pb-2 overflow-x-auto hide-scrollbar space-x-8 custom-scrollbar px-4">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-pill flex flex-col items-center justify-center min-w-fit text-sm ${
                activeCategory === category
                  ? 'text-orange-500 font-semibold border-b-2 border-orange-400'
                  : 'text-neutral-500 hover:text-orange-500 pb-2 border-b-2 border-transparent hover:border-amber-200'
              } transition-colors`}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="relative">
                <i className={`${CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]} text-xl mb-1 ${
                  activeCategory === category ? 'text-orange-500' : 'text-neutral-500'
                }`}></i>
                {activeCategory === category && category !== 'All homes' && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 rounded-full w-2 h-2"></span>
                )}
              </div>
              <span className="whitespace-nowrap">{category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
