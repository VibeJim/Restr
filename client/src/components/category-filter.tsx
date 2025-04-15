import { useState } from 'react';
import { CATEGORY_ICONS } from '@/lib/constants';

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ onCategoryChange }: CategoryFilterProps) {
  const [activeCategory, setActiveCategory] = useState('All homes');
  
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    onCategoryChange(category);
  };

  const categories = Object.keys(CATEGORY_ICONS);

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-4 overflow-x-auto hide-scrollbar space-x-8 custom-scrollbar">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-pill flex flex-col items-center min-w-fit text-sm ${
                activeCategory === category
                  ? 'text-neutral-900 border-b-2 border-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-900 pb-2 border-b-2 border-transparent hover:border-neutral-300'
              } transition-colors`}
              onClick={() => handleCategoryClick(category)}
            >
              <i className={`${CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]} text-xl mb-1`}></i>
              <span>{category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
