import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FBFAF8]">
      {/* Hero Section */}
      <div className="bg-[#FBFAF8]">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative w-56 h-36">
              <Image
                src="/yeshivapics/210e988b-d56a-4a04-878a-056d5facb233.png"
                alt="YTYM Wine Raffle"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Yeshiva Name */}
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 text-center mb-2">
            Yeshivas Tiferes Yisroel v&apos;Moshe
          </h1>
          <p className="text-stone-600 text-center text-sm md:text-base mb-5">
            Supporting Torah learning in Far Rockaway
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link
              href="/raffle"
              className="inline-block px-8 py-4 bg-[#722F37] text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-[#5a252c] transition-colors"
            >
              Enter the Raffle
            </Link>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="pt-2 pb-8 bg-[#FBFAF8]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl font-serif font-bold text-stone-800 text-center mb-5">
            Our Community
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group Study Photo - Large */}
            <div className="md:col-span-2">
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="/yeshivapics/14ee456d-4d07-4d2c-a2ac-aaa86e63b065.JPG"
                  alt="Yeshiva students learning together"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Individual Study Photo */}
            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/yeshivapics/4a351d80-6946-4e76-ada1-e2b4d2a23d46.JPG"
                alt="Torah study"
                fill
                className="object-cover"
              />
            </div>

            {/* Group Portrait */}
            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/yeshivapics/image000000.jpg"
                alt="Yeshiva community"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-[#f5f0e8] py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-xl font-serif font-bold text-stone-800 text-center mb-4">
            Our Mission
          </h2>
          <div className="flex justify-center">
            <div className="relative w-full max-w-lg">
              <Image
                src="/yeshivapics/image-2.png"
                alt="Yeshivas Tiferes Yisroel Moshe Mission Statement"
                width={800}
                height={200}
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Second CTA */}
      <div className="bg-[#722F37] py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-serif font-bold text-white mb-3">
            Support Our Yeshiva
          </h2>
          <p className="text-stone-200 mb-4">
            Enter our wine raffle for a chance to win while supporting Torah education.
          </p>
          <Link
            href="/raffle"
            className="inline-block px-8 py-4 bg-white text-[#722F37] text-lg font-semibold rounded-lg shadow-lg hover:bg-stone-100 transition-colors"
          >
            Enter the Raffle
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-stone-800 py-6">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-stone-300 text-sm mb-2">
            Yeshivas Tiferes Yisroel v&apos;Moshe
          </p>
          <p className="text-stone-400 text-xs">
            1069 Dickens Street, Far Rockaway, NY 11691
          </p>
          {/* Chill Labs Badge */}
          <div className="flex justify-center items-center mt-6 w-full">
            <iframe
              src="https://chilllabs.vercel.app/badge"
              style={{
                border: 'none',
                width: '220px',
                height: '60px'
              }}
              title="Made by Chill Labs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
