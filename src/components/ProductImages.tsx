'use client'

import { useState } from 'react'
import Image from 'next/image'

type Props = {
  images: string[]
  title: string
}

export function ProductImages({ images, title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center">
        <span className="text-8xl">👟</span>
      </div>
    )
  }

  return (
    <div>
      <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
        <Image
          src={images[activeIndex]}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === activeIndex ? 'border-brand-500' : 'border-transparent'
              }`}
            >
              <Image
                src={img}
                alt={`${title} - ${idx + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
