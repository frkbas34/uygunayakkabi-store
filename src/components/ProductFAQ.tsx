'use client'

import { useState } from 'react'

type FAQItem = {
  q: string
  a: string
}

type Props = {
  faq: FAQItem[]
}

export function ProductFAQ({ faq }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!faq || faq.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Sık Sorulan Sorular</h2>
      <div className="space-y-2">
        {faq.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-800 pr-4">{item.q}</span>
              <span className="text-gray-400 flex-shrink-0 text-lg">
                {openIndex === i ? '−' : '+'}
              </span>
            </button>
            {openIndex === i && (
              <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
