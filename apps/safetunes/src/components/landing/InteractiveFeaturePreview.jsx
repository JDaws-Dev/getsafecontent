import React, { useState } from 'react';
import { CheckCircle, Music, Bell } from 'lucide-react';

function InteractiveFeaturePreview() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: 0,
      title: '1. Parent Approves',
      icon: CheckCircle,
      heading: 'You Control the Library',
      description: 'Search the full Apple Music catalog and whitelist albums in seconds from your dashboard. No more worrying about what slips through.',
      imageUrl: '/screenshots/4_ADMIN SEARCH APPROVE.png',
      imageAlt: 'Parent dashboard showing album approval interface',
    },
    {
      id: 1,
      title: '2. Kid Listens',
      icon: Music,
      heading: 'They See Only What You Approve',
      description: 'Your child logs in and sees ONLY the albums you approved. No searching for strangers, no podcasts, no explicit covers.',
      imageUrl: '/screenshots/KID_LIBRARY.png',
      imageAlt: 'Kid music player showing only approved content',
    },
    {
      id: 2,
      title: '3. Kid Requests',
      icon: Bell,
      heading: 'Transparent Communication',
      description: 'Child wants a new album? They hit "Request" and you get a notification to approve or deny. Teaching moments built right in.',
      imageUrl: '/screenshots/KID_REQUEST.png',
      imageAlt: 'Request system showing parent notification',
    },
  ];

  const activeTabData = tabs[activeTab];
  const Icon = activeTabData.icon;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A simple 3-step system that gives you control without being controlling
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex flex-col md:flex-row gap-4 mb-12">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 p-6 rounded-xl border-2 transition-all text-left ${
                    activeTab === tab.id
                      ? 'border-purple-600 bg-purple-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <TabIcon
                      className={`w-6 h-6 ${
                        activeTab === tab.id ? 'text-purple-600' : 'text-gray-400'
                      }`}
                    />
                    <h3
                      className={`font-semibold text-lg ${
                        activeTab === tab.id ? 'text-purple-900' : 'text-gray-700'
                      }`}
                    >
                      {tab.title}
                    </h3>
                  </div>
                  {activeTab === tab.id && (
                    <p className="text-sm text-gray-600 mt-2">
                      {tab.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Description */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {activeTabData.heading}
                  </h3>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  {activeTabData.description}
                </p>

                {/* Feature bullets based on active tab */}
                <ul className="space-y-3">
                  {activeTab === 0 && (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Search millions of songs and albums</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Preview albums before approving</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Hide explicit artwork with one click</span>
                      </li>
                    </>
                  )}
                  {activeTab === 1 && (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Clean, kid-friendly interface</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">No search = no surprises</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Full Apple Music playback quality</span>
                      </li>
                    </>
                  )}
                  {activeTab === 2 && (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Real-time notifications</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Approve or deny with one tap</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Track what they're requesting</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Right: Screenshot */}
              <div className="relative">
                <div className="bg-white rounded-xl shadow-2xl p-3 border-4 border-white">
                  <img
                    src={activeTabData.imageUrl}
                    alt={activeTabData.imageAlt}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 blur-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default InteractiveFeaturePreview;
