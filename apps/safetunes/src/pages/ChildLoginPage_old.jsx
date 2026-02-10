import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../hooks/useAuth';
import { AVATAR_ICONS, COLORS } from '../constants/avatars';
import MusicPlayer from '../components/MusicPlayer';
import musicKitService from '../config/musickit';

function ChildLoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pin, setPin] = useState('');

  // Fetch all kid profiles (we'll get them from all users for now, in production you'd want a parent user context)
  // For now, let's assume we need to show all profiles - ideally we'd have a way to know which parent's kids to show
  // This is a simplified version - in production you'd want better access control
  const [allProfiles, setAllProfiles] = useState([]);

  // Helper function to get avatar SVG
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  // Helper function to get color class
  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    setError('');
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
  };

  useEffect(() => {
    // Initialize Apple Music
    const initMusicKit = async () => {
      try {
        await musicKitService.initialize();
        console.log('MusicKit initialized for child login');
      } catch (err) {
        console.error('Failed to initialize MusicKit:', err);
      }
    };

    initMusicKit();
  }, []);

  useEffect(() => {
    // Fetch all kid profiles on mount
    // In a real app, you'd want to fetch profiles for the current parent only
    const fetchProfiles = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'kidProfiles:getKidProfiles',
            args: user ? { userId: user._id } : { userId: '' } // Temporary - need better approach
          })
        });
        const result = await response.json();
        if (result.value) {
          setAllProfiles(result.value);
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      }
    };

    fetchProfiles();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProfile) {
      setError('Please select a profile');
      return;
    }

    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify PIN
      if (selectedProfile.pin !== pin) {
        setError('Incorrect PIN. Please try again.');
        setPin('');
        setLoading(false);
        return;
      }

      // Store kid profile in session
      localStorage.setItem('safetunes_kid_profile', JSON.stringify({
        _id: selectedProfile._id,
        name: selectedProfile.name,
        avatar: selectedProfile.avatar,
        color: selectedProfile.color,
        userId: selectedProfile.userId,
      }));

      // Navigate to player
      navigate('/player');
    } catch (err) {
      setError('Login failed. Please try again.');
      setPin('');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedProfile) {
      setSelectedProfile(null);
      setPin('');
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white drop-shadow-lg">SafeTunes</span>
        </Link>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Profile Selection */}
          {!selectedProfile ? (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                Who's Listening?
              </h1>
              <p className="text-xl text-white/90 mb-12 drop-shadow">
                Choose your profile to start listening
              </p>

              {allProfiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {allProfiles.map((profile) => (
                    <button
                      key={profile._id}
                      onClick={() => handleProfileSelect(profile)}
                      className="group bg-white rounded-2xl p-8 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200"
                    >
                      <div className={`w-24 h-24 mx-auto mb-4 rounded-full ${getColorClass(profile.color)} flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow p-5`}>
                        {getAvatarIcon(profile.avatar)}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{profile.name}</h3>
                      <div className="text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to continue →
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white/90 rounded-2xl p-12 text-center shadow-2xl mb-8">
                  <div className="w-24 h-24 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Profiles Yet</h3>
                  <p className="text-gray-600 mb-4">Ask your parent to create a profile for you!</p>
                </div>
              )}

              <Link
                to="/login"
                className="inline-flex items-center text-white hover:text-white/80 transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Parent? Click here
              </Link>
            </div>
          ) : (
            /* PIN Entry */
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                  <div className={`w-24 h-24 mx-auto mb-4 rounded-full ${getColorClass(selectedProfile.color)} flex items-center justify-center text-white shadow-lg p-5`}>
                    {getAvatarIcon(selectedProfile.avatar)}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Hi, {selectedProfile.name}!
                  </h2>
                  <p className="text-gray-600">Enter your 4-digit PIN</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <input
                      type="password"
                      value={pin}
                      onChange={handlePinChange}
                      maxLength={4}
                      pattern="\d{4}"
                      inputMode="numeric"
                      autoFocus
                      className="w-full px-6 py-4 text-center text-3xl font-bold tracking-widest border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                      placeholder="••••"
                    />
                    <p className="text-sm text-gray-500 text-center mt-2">
                      {pin.length}/4 digits entered
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
                      disabled={loading}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || pin.length !== 4}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {loading ? 'Checking...' : 'Start Listening'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    Forgot your PIN? Ask your parent for help.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
        <svg className="w-full h-32 text-white/10" viewBox="0 0 1440 320" fill="currentColor">
          <path d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,96C1248,75,1344,53,1392,42.7L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Music Player */}
      <MusicPlayer />
    </div>
  );
}

export default ChildLoginPage;
