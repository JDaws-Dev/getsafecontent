import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const COLORS = [
  { name: 'red', class: 'bg-red-500', ring: 'ring-red-300' },
  { name: 'orange', class: 'bg-orange-500', ring: 'ring-orange-300' },
  { name: 'yellow', class: 'bg-yellow-500', ring: 'ring-yellow-300' },
  { name: 'green', class: 'bg-green-500', ring: 'ring-green-300' },
  { name: 'blue', class: 'bg-blue-500', ring: 'ring-blue-300' },
  { name: 'purple', class: 'bg-purple-500', ring: 'ring-purple-300' },
  { name: 'pink', class: 'bg-pink-500', ring: 'ring-pink-300' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: sessionLoading } = useConvexAuth();

  const [step, setStep] = useState(1); // 1 = welcome, 2 = create kids
  const [kids, setKids] = useState([{ name: '', color: 'blue' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFamilyCodeModal, setShowFamilyCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Get current user from Convex Auth
  const currentUser = useQuery(api.userSync.getCurrentUser);

  // Build onboarding status from currentUser
  const onboardingStatus = currentUser !== undefined ? {
    needsOnboarding: currentUser?.onboardingCompleted === false,
    user: currentUser,
  } : undefined;

  const createKidProfile = useMutation(api.kidProfiles.createKidProfile);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  // Redirect if not logged in or already completed onboarding
  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      navigate('/login');
    }
    if (onboardingStatus && !onboardingStatus.needsOnboarding && onboardingStatus.user) {
      navigate('/admin');
    }
  }, [isAuthenticated, sessionLoading, onboardingStatus, navigate]);

  const user = onboardingStatus?.user;

  const addKid = () => {
    // Get next available color
    const usedColors = kids.map(k => k.color);
    const availableColor = COLORS.find(c => !usedColors.includes(c.name))?.name || 'blue';
    setKids([...kids, { name: '', color: availableColor }]);
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

  const handleSubmit = async () => {
    if (!user) return;

    // Validate at least one kid with a name
    const validKids = kids.filter(k => k.name.trim());
    if (validKids.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create kid profiles
      for (const kid of validKids) {
        await createKidProfile({
          userId: user._id,
          name: kid.name.trim(),
          color: kid.color,
        });
      }

      // Mark onboarding complete
      await completeOnboarding({ userId: user._id });

      // Show family code modal
      setShowFamilyCodeModal(true);
    } catch (error) {
      console.error('Error creating profiles:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyFamilyCode = async () => {
    if (user?.familyCode) {
      try {
        await navigator.clipboard.writeText(user.familyCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch {
        // Fallback - just show the code
      }
    }
  };

  if (sessionLoading || !onboardingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900">SafeTube</span>
      </header>

      {/* Progress bar */}
      <div className="px-6 py-2">
        <div className="max-w-md mx-auto">
          <div className="flex gap-2">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-red-500' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-red-500' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>

      <main className="px-6 py-8 max-w-lg mx-auto">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SafeTube!</h1>
              <p className="text-gray-600">
                Let's set things up so your kids can start watching safe YouTube videos.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your 7-Day Free Trial is Active
              </div>
              <p className="text-green-600 text-sm">
                Explore all features risk-free. No credit card required.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold text-lg transition shadow-md"
            >
              Let's Get Started
            </button>
          </div>
        )}

        {/* Step 2: Create Kids */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Add Your Kids</h1>
              <p className="text-gray-600">
                Create a profile for each child. They'll use these to log in and watch videos.
              </p>
            </div>

            <div className="space-y-4">
              {kids.map((kid, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-3">
                    {/* Color picker preview */}
                    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg ${COLORS.find(c => c.name === kid.color)?.class || 'bg-blue-500'}`}>
                      {kid.name ? kid.name.charAt(0).toUpperCase() : '?'}
                    </div>

                    <div className="flex-1 space-y-3">
                      {/* Name input */}
                      <input
                        type="text"
                        value={kid.name}
                        onChange={(e) => updateKid(index, 'name', e.target.value)}
                        placeholder="Child's name"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />

                      {/* Color selection */}
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => updateKid(index, 'color', color.name)}
                            className={`w-8 h-8 rounded-full ${color.class} transition ${kid.color === color.name ? `ring-2 ${color.ring} ring-offset-2` : 'hover:scale-110'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Remove button */}
                    {kids.length > 1 && (
                      <button
                        onClick={() => removeKid(index)}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add another kid button */}
              <button
                onClick={addKid}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Child
              </button>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !kids.some(k => k.name.trim())}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition shadow-md"
              >
                {isSubmitting ? 'Creating Profiles...' : 'Continue'}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full text-gray-500 hover:text-gray-700 py-2 transition"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Family Code Modal */}
      {showFamilyCodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">You're All Set!</h2>
                <p className="text-gray-600 mt-2">
                  Your kids can now log in using your Family Code:
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="text-4xl font-bold text-red-600 tracking-widest font-mono mb-3">
                  {user?.familyCode}
                </div>
                <button
                  onClick={copyFamilyCode}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium transition text-sm"
                >
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-600 font-medium mb-2">How kids log in:</p>
                <ol className="text-sm text-gray-500 space-y-1">
                  <li>1. Go to <code className="bg-yellow-100 px-1 rounded text-red-600">getsafetube.com/play</code></li>
                  <li>2. Enter the Family Code</li>
                  <li>3. Select their profile</li>
                </ol>
              </div>

              <button
                onClick={() => navigate('/admin')}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold transition shadow-md"
              >
                Go to Parent Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
