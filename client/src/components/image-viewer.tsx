import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}

export default function ImageViewer({ isOpen, onClose, images, initialIndex = 0 }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (initialIndex !== undefined) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[90vw] max-w-[90vw] max-h-[90vh] p-0 bg-black/90">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={handlePrevious}
              >
                <i className="ri-arrow-left-s-line text-2xl"></i>
              </Button>
              <Button
                variant="ghost"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={handleNext}
              >
                <i className="ri-arrow-right-s-line text-2xl"></i>
              </Button>
            </>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <i className="ri-close-line text-2xl"></i>
          </Button>

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Zoomable Image */}
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
          >
            <TransformComponent wrapperClass="w-full flex justify-center" contentClass="w-full">
              <img
                src={images[currentIndex]}
                alt={`Image ${currentIndex + 1}`}
                className="w-full h-auto object-cover sm:max-h-[90vh] sm:object-contain sm:min-w-[600px] sm:blur-[1px] sm:hover:blur-none"
              />
            </TransformComponent>
          </TransformWrapper>
        </div>
      </DialogContent>
    </Dialog>
  );
} 