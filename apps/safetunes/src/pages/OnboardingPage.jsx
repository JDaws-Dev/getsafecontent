import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import musicKitService from '../config/musickit';
import { AVATAR_ICONS, COLORS } from '../constants/avatars';
const DAILY_LIMIT_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 0, label: 'Unlimited' },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isPending } = useConvexAuth();
  const updateUser = useMutation(api.users.updateUser);
  const createKidProfile = useMutation(api.kidProfiles.createKidProfile);

  // Get current user from Convex Auth
  const currentUser = useQuery(api.userSync.getCurrentUser);

  const [step, setStep] = useState(1); // 1: Welcome, 2: Apple Music, 3: Kid Profiles, 4: Complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Redirect to admin if user not logged in or already completed onboarding
  useEffect(() => {
    console.log('Onboarding useEffect:', { isAuthenticated, currentUser, isPending, onboardingCompleted: currentUser?.onboardingCompleted, subscriptionStatus: currentUser?.subscriptionStatus });

    // Don't redirect while still loading session
    if (isPending) {
      console.log('Session loading, waiting...');
      return;
    }

    // Wait for currentUser data to load before making redirect decisions
    if (isAuthenticated && currentUser === undefined) {
      console.log('Waiting for user data to load...');
      return;
    }

    if (!isAuthenticated || !currentUser) {
      console.log('No session, redirecting to login');
      navigate('/login');
    } else if (currentUser && currentUser.onboardingCompleted) {
      console.log('Onboarding already completed, redirecting to admin');
      navigate('/admin');
    } else {
      // Allow all authenticated users to proceed with onboarding
      // Trial users are valid - they're in their free trial period
      // Active/lifetime users are also valid
      console.log('User logged in, showing onboarding');
    }
  }, [isAuthenticated, currentUser, isPending, navigate]);

  // Apple Music state
  const [appleMusicAuthorized, setAppleMusicAuthorized] = useState(false);

  // Kid profiles state
  const [kids, setKids] = useState([
    {
      name: '',
      avatar: AVATAR_ICONS[0].id,
      color: COLORS[0].id,
      pin: '',
      dailyLimitMinutes: 60, // Default to 1 hour
    }
  ]);

  const handleAppleMusicAuth = async () => {
    setLoading(true);
    setError('');

    try {
      await musicKitService.initialize();
      await musicKitService.authorize();

      // Update user in database
      await updateUser({
        userId: currentUser._id,
        appleMusicAuthorized: true,
        appleMusicAuthDate: Date.now(),
      });

      setAppleMusicAuthorized(true);
      setError('');
    } catch (err) {
      console.error('Apple Music authorization failed:', err);
      setError('Failed to connect to Apple Music. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipAppleMusic = () => {
    setStep(3);
  };

  const handleContinueToKids = () => {
    setStep(3);
  };

  const addKid = () => {
    setKids([
      ...kids,
      {
        name: '',
        avatar: AVATAR_ICONS[kids.length % AVATAR_ICONS.length].id,
        color: COLORS[kids.length % COLORS.length].id,
        pin: '',
        dailyLimitMinutes: 60,
      }
    ]);
  };

  const removeKid = (index) => {
    if (kids.length > 1) {
      setKids(kids.filter((_, i) => i !== index));
    }
  };

  const updateKid = (index, field, value) => {
    const updated = [...kids];
    updated[index][field] = value;
    setKids(updated);
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError('');

    // Validate
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      if (!kid.name.trim()) {
        setError(`Please enter a name for kid #${i + 1}`);
        setLoading(false);
        return;
      }
      // PIN is optional, but if provided, must be 4 digits
      if (kid.pin && kid.pin.length !== 4) {
        setError(`PIN for ${kid.name} must be exactly 4 digits (or leave blank for no PIN)`);
        setLoading(false);
        return;
      }
    }

    try {
      // Create all kid profiles
      for (const kid of kids) {
        await createKidProfile({
          userId: currentUser._id,
          name: kid.name,
          avatar: kid.avatar,
          color: kid.color,
          pin: kid.pin.trim() || undefined, // Only set PIN if provided
          dailyLimitMinutes: kid.dailyLimitMinutes || undefined,
        });
      }

      // Mark onboarding as completed
      await updateUser({
        userId: currentUser._id,
        onboardingCompleted: true,
      });

      // Show the info modal with family code
      setShowInfoModal(true);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError('Failed to save profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Info Modal */}
      {showInfoModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 md:p-12 relative animate-fadeIn">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Important Information!</h2>
              <p className="text-gray-600">Save this information to share with your kids</p>
            </div>

            <div className="space-y-6">
              {/* Family Code Section */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-900 text-lg">Your Family Code</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentUser.familyCode);
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-4xl font-bold text-purple-600 text-center tracking-widest font-mono">
                    {currentUser.familyCode}
                  </p>
                </div>
                <p className="text-sm text-purple-800">
                  Your kids will need this code to log in to their music dashboard
                </p>
              </div>

              {/* Kid Login URL Section */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900 text-lg">Kid Login Website</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('https://getsafetunes.com/play');
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-xl font-semibold text-blue-600 text-center break-all">
                    getsafetunes.com/play
                  </p>
                </div>
                <p className="text-sm text-blue-800">
                  Send this link to your kids so they can access their music
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  How it works:
                </h3>
                <ol className="space-y-2 text-sm text-green-800 list-decimal list-inside">
                  <li>Share the website link with your kids</li>
                  <li>They enter the family code: <span className="font-mono font-bold">{currentUser.familyCode}</span></li>
                  <li>They select their profile and enter their PIN (if you set one)</li>
                  <li>They can now browse and request music you've approved!</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => {
                setShowInfoModal(false);
                navigate('/admin');
              }}
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-lg font-semibold text-lg transition shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                  <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                </svg>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to SafeTunes!</h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Let's get you set up. We'll connect your Apple Music account and create profiles for your kids.
              </p>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-purple-900 mb-3">What we'll do:</h3>
                <ul className="space-y-2 text-purple-800">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Connect your Apple Music account for playback</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Create profiles for your kids</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Set daily listening limits</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep(2)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg"
              >
                Let's Get Started
              </button>
            </div>
          )}

          {/* Step 2: Apple Music Authorization */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 88.994 96.651">
                    <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Connect Apple Music</h2>
                <p className="text-gray-600">
                  To play music, we need permission to access your Apple Music account.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              {appleMusicAuthorized ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center text-green-800">
                    <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold">Apple Music Connected!</p>
                      <p className="text-sm">You're all set to play music.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start space-x-3 text-blue-900">
                    <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-semibold mb-1">You'll need:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>An active Apple Music subscription</li>
                        <li>To be signed in to your Apple ID</li>
                      </ul>
                      <p className="mt-3 text-xs text-blue-700">
                        We never see your Apple ID or password. Authentication is handled securely by Apple.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {appleMusicAuthorized ? (
                <button
                  onClick={handleContinueToKids}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition"
                >
                  Continue
                </button>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleAppleMusicAuth}
                      disabled={loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 88.994 96.651">
                            <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                          </svg>
                          Connect Apple Music
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSkipAppleMusic}
                      className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-semibold transition border-2 border-gray-300"
                    >
                      I'll Connect Later - Show Me the Dashboard
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    You can connect Apple Music anytime from Settings. Connecting now allows you to preview music playback.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 3: Kid Profiles */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Kid Profiles</h2>
                <p className="text-gray-600">
                  Add your kids and set their daily listening limits
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <div className="space-y-6 mb-6">
                {kids.map((kid, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-6 relative">
                    {kids.length > 1 && (
                      <button
                        onClick={() => removeKid(index)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    <h3 className="font-semibold text-gray-900 mb-4">Kid #{index + 1}</h3>

                    {/* Name Field */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={kid.name}
                        onChange={(e) => updateKid(index, 'name', e.target.value)}
                        placeholder="Enter name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      />
                    </div>

                    {/* Color Theme */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color Theme
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => updateKid(index, 'color', color.id)}
                            className={`w-10 h-10 rounded-lg ${color.class} transition ${
                              kid.color === color.id ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* PIN Field */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        4-Digit PIN (Optional)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Protects this profile from siblings. Leave blank if not needed.</p>
                      <input
                        type="password"
                        value={kid.pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          updateKid(index, 'pin', value);
                        }}
                        maxLength={4}
                        placeholder="••••"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      />
                    </div>

                    {/* Daily Limit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Listening Limit
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {DAILY_LIMIT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateKid(index, 'dailyLimitMinutes', option.value)}
                            className={`px-3 py-2 rounded-lg border text-sm transition ${
                              kid.dailyLimitMinutes === option.value
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addKid}
                className="w-full mb-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium transition flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Kid
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleCompleteOnboarding}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-4">You're All Set!</h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                SafeTunes is ready to use. Start searching for music and approve albums for your kids.
              </p>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-purple-900 mb-3">Next steps:</h3>
                <ul className="space-y-2 text-purple-800">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span>Search for albums and approve them for your kids</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span>Review album requests from your kids</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span>Share the kid login link with your children</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/admin')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
