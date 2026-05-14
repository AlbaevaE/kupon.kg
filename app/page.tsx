import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="px-10 py-6 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-sm font-semibold tracking-[0.15em] uppercase text-gray-900">
          kupon.kg
        </span>
        <nav className="flex items-center gap-8">
          <Link href="/auth/login" className="text-sm text-gray-400 hover:text-gray-900 transition-colors tracking-wide">
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-medium tracking-wide border border-gray-900 text-gray-900 px-6 py-2 rounded-full hover:bg-gray-900 hover:text-white transition-all duration-200"
          >
            Register
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">

          {/* Left column */}
          <div>
            {/* Label */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
              <span className="text-xs text-stone-400 font-medium tracking-[0.2em] uppercase">
                Why kupon.kg
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-[3.25rem] font-light leading-[1.15] text-gray-900 mb-10 tracking-tight">
              Coupon management<br />
              for modern<br />
              <span className="font-semibold">businesses.</span>
            </h1>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-12">
              {["Instant QR codes", "One-tap redeem", "Staff accounts"].map((tag) => (
                <span
                  key={tag}
                  className="bg-stone-100 rounded-full px-4 py-1.5 text-xs font-medium text-stone-600 tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Feature list */}
            <div className="divide-y divide-stone-200 border-y border-stone-200">
              <FeatureRow
                title="Customer self-claim"
                body="Customers claim their coupon via a public link — no printing, no friction."
              />
              <FeatureRow
                title="QR scanning & validation"
                body="Staff scan any code on their phone. One tap marks it redeemed instantly."
              />
              <FeatureRow
                title="Analytics & reports"
                body="Track redemption rates, scan events, and template performance over time."
              />
            </div>
          </div>

          {/* Right column */}
          <div className="relative">
            <div
              className="bg-stone-100 rounded-2xl p-7 overflow-hidden"
              style={{ minHeight: "540px" }}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-stone-400">
                  Est. 2025
                </span>
                <span className="bg-white rounded-full px-3 py-1 text-[10px] font-semibold tracking-widest uppercase text-stone-500 border border-stone-200">
                  Launch offer
                </span>
              </div>

              <p className="text-sm text-stone-500 mb-8 max-w-[200px] leading-relaxed">
                Designed for small and medium businesses that value simplicity and speed.
              </p>

              {/* Mock coupon card */}
              <div className="bg-white rounded-xl p-5 mb-6 border border-stone-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-1">
                      Beauty Salon · Bishkek
                    </p>
                    <p className="font-semibold text-base text-gray-900">50% off haircut</p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                </div>
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-400">Valid for 30 days</span>
                  <div className="w-10 h-10 bg-stone-100 rounded-lg" />
                </div>
              </div>

              {/* Big text */}
              <p className="text-3xl font-light text-gray-900 leading-snug mb-7 tracking-tight">
                Generate.<br />
                <span className="font-semibold">Share. Redeem.</span>
              </p>

              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-medium tracking-wide hover:bg-stone-700 transition-colors"
              >
                Start free
              </Link>

              {/* Floating stats */}
              <div className="absolute bottom-7 right-7 bg-white rounded-xl p-4 shadow-sm border border-stone-100">
                <p className="text-[10px] tracking-widest uppercase text-stone-400 mb-1">
                  Redemption rate
                </p>
                <p className="text-2xl font-semibold text-gray-900 mb-2">86%</p>
                <div className="inline-flex items-center gap-1.5 bg-stone-900 rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-white text-[10px] font-semibold tracking-widest uppercase">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-5 flex items-start justify-between gap-8 group cursor-default">
      <div>
        <p className="font-medium text-gray-900 mb-1 text-sm tracking-wide">{title}</p>
        <p className="text-sm text-stone-400 leading-relaxed">{body}</p>
      </div>
      <span className="text-stone-300 text-lg font-light shrink-0 mt-0.5 group-hover:text-stone-500 transition-colors">
        +
      </span>
    </div>
  );
}
