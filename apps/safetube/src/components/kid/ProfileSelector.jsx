import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function ProfileSelector({ profiles, onSelect, familyCode, onChangeCode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pinInput, setPinInput] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  // Verify PIN query
  const pinVerification = useQuery(
    api.kidProfiles.verifyKidPin,
    selectedProfile && pinInput.every(d => d !== '')
      ? { profileId: selectedProfile._id, pin: pinInput.join('') }
      : 'skip'
  );

  // Auto-submit when all 4 digits entered
  useEffect(() => {
    if (pinVerification?.valid === true) {
      setIsLoading(true);
      onSelect(selectedProfile);
    } else if (pinVerification?.valid === false) {
      setPinError('Wrong PIN');
      setPinInput(['', '', '', '']);
      pinRefs[0].current?.focus();
    }
  }, [pinVerification]);

  const handleSelect = async (profile) => {
    // If profile has a PIN, show PIN entry
    if (profile.pin) {
      setSelectedProfile(profile);
      setPinInput(['', '', '', '']);
      setPinError('');
      // Focus first input after render
      setTimeout(() => pinRefs[0].current?.focus(), 100);
      return;
    }

    // No PIN, proceed directly
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    onSelect(profile);
  };

  const handlePinChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    setPinError('');
    const newPin = [...pinInput];
    newPin[index] = value;
    setPinInput(newPin);

    // Auto-advance to next input
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleCancelPin = () => {
    setSelectedProfile(null);
    setPinInput(['', '', '', '']);
    setPinError('');
  };

  // Color class mapping
  const getColorClass = (color) => ({
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  }[color] || 'bg-red-500');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">SafeTube</span>
        </div>
        <button
          onClick={onChangeCode}
          className="text-gray-500 hover:text-gray-700 text-sm transition flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Change Code
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* PIN Entry Screen */}
        {selectedProfile ? (
          <div className="text-center">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full ${getColorClass(selectedProfile.color)} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
              {selectedProfile.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedProfile.name}</h1>
            <p className="text-gray-600 mb-6">Enter your 4-digit PIN</p>

            {/* PIN Input */}
            <div className="flex justify-center gap-3 mb-4">
              {pinInput.map((digit, index) => (
                <input
                  key={index}
                  ref={pinRefs[index]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  className={`w-14 h-14 text-center text-2xl font-bold text-gray-900 border-2 rounded-xl focus:outline-none focus:ring-2 transition ${
                    pinError
                      ? 'border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-500'
                      : 'border-gray-200 bg-white focus:ring-red-100 focus:border-red-500'
                  }`}
                  autoComplete="off"
                />
              ))}
            </div>

            {pinError && (
              <p className="text-red-500 text-sm mb-4">{pinError}</p>
            )}

            <button
              onClick={handleCancelPin}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ← Choose different profile
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Who's Watching?</h1>
            <p className="text-gray-600 mb-8">Select your profile</p>

            {profiles.length === 0 ? (
              <div className="text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm">
                <div className="w-20 h-20 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium mb-2">No profiles found for this family code.</p>
                <p className="text-gray-500 text-sm">Ask your parent to create a profile for you.</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
                {profiles.map((profile) => (
                  <button
                    key={profile._id}
                    onClick={() => handleSelect(profile)}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg hover:border-red-200 transition transform hover:scale-105 disabled:opacity-50"
                  >
                    <div className={`w-20 h-20 rounded-full shadow-md flex items-center justify-center text-white text-2xl font-bold ${getColorClass(profile.color)}`}>
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-semibold text-lg">{profile.name}</span>
                      {profile.pin && (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Family Code Display - hidden during PIN entry */}
        {!selectedProfile && (
          <>
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm">Family Code</p>
              <p className="text-gray-400 font-mono text-lg tracking-widest">{familyCode}</p>
            </div>

            {/* Parent Login Link */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-center text-gray-500 text-sm">
                Are you a parent?{' '}
                <Link to="/login" className="text-red-500 hover:text-red-600 font-medium">
                  Log in here →
                </Link>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
