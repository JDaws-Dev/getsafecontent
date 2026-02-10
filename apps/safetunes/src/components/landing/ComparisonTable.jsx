import React from 'react';
import { Check, X } from 'lucide-react';

function ComparisonTable() {
  const features = [
    {
      name: 'Flexible Approval (Whole Albums OR Individual Songs)',
      safeTunes: true,
      spotifyKids: false,
      appleMusic: false,
    },
    {
      name: 'Real Artists (No Kidz Bop covers)',
      safeTunes: true,
      spotifyKids: false,
      appleMusic: true,
    },
    {
      name: 'Block Explicit Album Art',
      safeTunes: true,
      spotifyKids: false,
      appleMusic: false,
    },
    {
      name: 'Child Request System',
      safeTunes: true,
      spotifyKids: false,
      appleMusic: false,
    },
    {
      name: 'Search Monitoring & Alerts',
      safeTunes: true,
      spotifyKids: false,
      appleMusic: false,
    },
    {
      name: 'Works with Apple Music',
      safeTunes: true,
      spotifyKids: false,
      appleMusic: true,
    },
    {
      name: 'Whitelist Individual Songs',
      safeTunes: true,
      spotifyKids: false,
      appleMusic: false,
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why SafeTunes Beats the Competition
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Other solutions either limit your child to covers or don't give you granular control.
            SafeTunes gives you the best of both worlds.
          </p>
        </div>

        {/* Mobile: Card-based layout */}
        <div className="block md:hidden max-w-lg mx-auto space-y-4 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">{feature.name}</h3>
              <div className="flex justify-between items-center gap-3">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">SafeTunes</p>
                  {feature.safeTunes ? (
                    <Check className="w-5 h-5 text-green-600 mx-auto" strokeWidth={3} />
                  ) : (
                    <X className="w-5 h-5 text-red-500 mx-auto" strokeWidth={2} />
                  )}
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-600 mb-2">Spotify Kids</p>
                  {feature.spotifyKids ? (
                    <Check className="w-5 h-5 text-green-600 mx-auto" strokeWidth={3} />
                  ) : (
                    <X className="w-5 h-5 text-gray-300 mx-auto" strokeWidth={2} />
                  )}
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-600 mb-2">Apple Music</p>
                  {feature.appleMusic ? (
                    <Check className="w-5 h-5 text-green-600 mx-auto" strokeWidth={3} />
                  ) : (
                    <X className="w-5 h-5 text-gray-300 mx-auto" strokeWidth={2} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden md:block max-w-5xl mx-auto overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-6 px-6 text-left text-gray-600 font-semibold">
                  Feature
                </th>
                <th className="py-6 px-6 text-center bg-gradient-to-br from-purple-600 to-pink-600">
                  <div className="text-white font-bold text-lg">SafeTunes</div>
                  <div className="text-purple-100 text-sm font-normal mt-1">$4.99/mo</div>
                </th>
                <th className="py-6 px-6 text-center text-gray-600 font-semibold">
                  <div>Spotify Kids</div>
                  <div className="text-sm font-normal text-gray-500 mt-1">Included</div>
                </th>
                <th className="py-6 px-6 text-center text-gray-600 font-semibold">
                  <div>Apple Music</div>
                  <div className="text-sm font-normal text-gray-500 mt-1">Restrictions</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="py-5 px-6 font-medium text-gray-900">
                    {feature.name}
                  </td>
                  <td className="py-5 px-6 text-center bg-purple-50">
                    {feature.safeTunes ? (
                      <Check className="w-6 h-6 text-green-600 mx-auto" strokeWidth={3} />
                    ) : (
                      <X className="w-6 h-6 text-red-500 mx-auto" strokeWidth={2} />
                    )}
                  </td>
                  <td className="py-5 px-6 text-center">
                    {feature.spotifyKids ? (
                      <Check className="w-6 h-6 text-green-600 mx-auto" strokeWidth={3} />
                    ) : (
                      <X className="w-6 h-6 text-gray-300 mx-auto" strokeWidth={2} />
                    )}
                  </td>
                  <td className="py-5 px-6 text-center">
                    {feature.appleMusic ? (
                      <Check className="w-6 h-6 text-green-600 mx-auto" strokeWidth={3} />
                    ) : (
                      <X className="w-6 h-6 text-gray-300 mx-auto" strokeWidth={2} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-8">
          <a
            href="/signup"
            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg hover:shadow-xl"
          >
            Start Free Trial
          </a>
          <p className="text-sm text-gray-500 mt-3">
            7-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

export default ComparisonTable;
