import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../constants/avatars';
import musicKitService from '../config/musickit';
import ChildDashboard from '../components/child/ChildDashboard';
import { useIsNativeApp } from '../hooks/useIsNativeApp';

function ChildLoginPage() {
  const navigate = useNavigate();
  const isNativeApp = useIsNativeApp();
  const [step, setStep] = useState('family-code'); // 'family-code', 'select-profile', 'enter-pin', 'dashboard'
  const [familyCode, setFamilyCode] = useState('');
  const [savedFamilyCode, setSavedFamilyCode] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [kidProfile, setKidProfile] = useState(null);

  // Check if family code is already saved in localStorage
  useEffect(() => {
    const savedCode = localStorage.getItem('safetunes_family_code');
    const profileData = localStorage.getItem('safetunes_kid_profile');

    if (savedCode && profileData) {
      // Already logged in
      setSavedFamilyCode(savedCode);
      setKidProfile(JSON.parse(profileData));
      setStep('dashboard');
    } else if (savedCode) {
      // Has family code but not logged in as a profile
      setSavedFamilyCode(savedCode);
      setStep('select-profile');
    }
  }, []);

  // Initialize MusicKit in the background - don't block login
  useEffect(() => {
    const initMusicKit = async () => {
      try {
        // Use a timeout to prevent blocking the login flow on iOS
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MusicKit init timeout')), 5000)
        );

        await Promise.race([
          musicKitService.initialize(),
          timeoutPromise
        ]);
      } catch (err) {
        // Don't block login if MusicKit fails - it will be initialized later when needed
        console.warn('MusicKit pre-initialization skipped:', err.message);
      }
    };
    initMusicKit();
  }, []);

  // Fetch kid profiles by family code
  const familyData = useQuery(
    api.kidProfiles.getKidProfilesByFamilyCode,
    savedFamilyCode ? { familyCode: savedFamilyCode } : 'skip'
  );

  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  const handleFamilyCodeSubmit = (e) => {
    e.preventDefault();
    const code = familyCode.toUpperCase().trim();

    if (code.length !== 6) {
      setError('Family code must be 6 characters');
      return;
    }

    // Save and move to profile selection
    localStorage.setItem('safetunes_family_code', code);
    setSavedFamilyCode(code);
    setStep('select-profile');
    setError('');
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    setPin('');
    setError('');

    // If profile has no PIN, log in directly
    if (!profile.pin) {
      localStorage.setItem('safetunes_kid_profile', JSON.stringify(profile));
      // Clear any saved tab preference to start fresh on home
      localStorage.removeItem('safetunes_child_tab');
      setKidProfile(profile);
      setStep('dashboard');
    } else {
      // Has PIN, proceed to PIN entry
      setStep('enter-pin');
    }
  };

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const verifyPin = (pinToVerify) => {
    if (pinToVerify === selectedProfile.pin) {
      // Success - save to localStorage
      localStorage.setItem('safetunes_kid_profile', JSON.stringify(selectedProfile));
      // Clear any saved tab preference to start fresh on home
      localStorage.removeItem('safetunes_child_tab');
      setKidProfile(selectedProfile);
      setStep('dashboard');
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('safetunes_kid_profile');
    setKidProfile(null);
    setSelectedProfile(null);
    setPin('');
    // In native app, go to app landing page (skip splash); on web, stay on profile selection
    if (isNativeApp) {
      navigate('/app?skip=1');
    } else {
      setStep('select-profile');
    }
  };

  const handleChangeFamilyCode = () => {
    localStorage.removeItem('safetunes_family_code');
    localStorage.removeItem('safetunes_kid_profile');
    setSavedFamilyCode('');
    setFamilyCode('');
    setKidProfile(null);
    setSelectedProfile(null);
    setPin('');
    setStep('family-code');
  };

  // Show dashboard if logged in
  if (step === 'dashboard' && kidProfile) {
    return <ChildDashboard onLogout={handleLogout} />;
  }

  // Show error if family code is invalid
  if (savedFamilyCode && familyData === null && step === 'select-profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Invalid Family Code</h2>
          <p className="text-gray-600 mb-6">
            The family code "{savedFamilyCode}" doesn't exist. Ask your parent for the correct code.
          </p>
          <button
            onClick={handleChangeFamilyCode}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition"
          >
            Enter Different Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
              <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SafeTunes</h1>
          <p className="text-gray-600">Your Music, Your Way</p>
        </div>

        {/* Step 1: Enter Family Code */}
        {step === 'family-code' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Enter Family Code</h2>
            <p className="text-gray-600 mb-6 text-center">Ask your parent for your family's 6-character code</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleFamilyCodeSubmit}>
              <input
                type="text"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-4 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent uppercase mb-4"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-lg font-semibold text-lg transition shadow-lg"
              >
                Continue
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-2">Don't have a family code?</p>
              <button
                onClick={() => navigate('/app?skip=1')}
                className="text-purple-600 hover:text-purple-700 font-medium text-sm"
              >
                Back to login options
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Profile */}
        {step === 'select-profile' && familyData && familyData.profiles && (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Who's Listening?</h2>
              <p className="text-gray-600">{familyData.familyName}'s Family</p>
              <button
                onClick={handleChangeFamilyCode}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700"
              >
                Change family code
              </button>
            </div>

            {familyData.profiles.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <p className="text-gray-600">No profiles found. Ask your parent to create a profile for you!</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6">
                {familyData.profiles.map((profile) => (
                  <button
                    key={profile._id}
                    onClick={() => handleProfileSelect(profile)}
                    className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transform hover:scale-105 transition-all w-48"
                  >
                    <div className={`w-24 h-24 ${getColorClass(profile.color)} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Enter PIN */}
        {step === 'enter-pin' && selectedProfile && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <button
              onClick={() => setStep('select-profile')}
              className="mb-4 text-purple-600 hover:text-purple-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="text-center mb-8">
              <div className={`w-20 h-20 ${getColorClass(selectedProfile.color)} rounded-full flex items-center justify-center mx-auto mb-4`}>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProfile.name}</h2>
              <p className="text-gray-600">Enter your 4-digit PIN</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm text-center">
                {error}
              </div>
            )}

            {/* PIN Dots */}
            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > i
                      ? 'bg-purple-600 border-purple-600 scale-110'
                      : 'bg-white border-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinInput(num.toString())}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-2xl font-semibold py-6 rounded-xl transition active:scale-95"
                >
                  {num}
                </button>
              ))}
              <div></div>
              <button
                onClick={() => handlePinInput('0')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-2xl font-semibold py-6 rounded-xl transition active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 py-6 rounded-xl transition active:scale-95 flex items-center justify-center"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChildLoginPage;
