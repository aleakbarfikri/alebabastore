import React, { useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AccountImageGallery = ({ account }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (!account.images || account.images.length === 0) {
    return null;
  }

  const openLightbox = (index) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : account.images.length - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev < account.images.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {account.images.map((image, index) => {
          const imageUrl = pb.files.getURL(account, image, { thumb: '300x300' });
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group bg-muted"
              onClick={() => openLightbox(index)}
            >
              <img
                src={imageUrl}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                  Lihat Gambar
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-primary transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 text-white hover:text-primary transition-colors z-10"
            >
              <ChevronLeft className="w-12 h-12" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 text-white hover:text-primary transition-colors z-10"
            >
              <ChevronRight className="w-12 h-12" />
            </button>

            <motion.img
              key={selectedIndex}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={pb.files.getURL(account, account.images[selectedIndex])}
              alt={`Screenshot ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {selectedIndex + 1} / {account.images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccountImageGallery;