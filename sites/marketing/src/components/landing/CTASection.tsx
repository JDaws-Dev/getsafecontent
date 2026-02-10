export default function CTASection() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-3xl" />
          </div>

          <div className="relative text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to take control?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
              Join families who have already discovered peace of mind with
              Safe Family. Start your free trial today.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-lg hover:bg-slate-100 transition-all hover:scale-105"
              >
                Start Free Trial
                <svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </a>
              <a
                href="#apps"
                className="inline-flex items-center justify-center text-base font-medium text-white hover:text-slate-200 transition-colors"
              >
                Learn more about our apps
              </a>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              No credit card required. 7-day free trial on all apps.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
