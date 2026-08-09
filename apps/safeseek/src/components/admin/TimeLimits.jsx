import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';

// Check if a value matches a preset (not custom)
const PRESET_VALUES = new Set([0, 10, 20, 30, 50, 100]);
function isCustomValue(val) {
  return val !== undefined && val !== null && !PRESET_VALUES.has(val);
}

// Get Tailwind color class from color name
function getColorClass(color) {
  const colors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-accent-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500',
    cyan: 'bg-cyan-500',
    teal: 'bg-teal-500',
  };
  return colors[color] || 'bg-accent-500';
}

// Search limit presets (number of searches per day)
const SEARCH_PRESETS = [
  { value: 0, label: 'Unlimited' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

// Hour options for time window
const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
}));

// The FAMILY-WIDE limit is measured in minutes (it has to be — it's shared with
// SafeTunes, SafeTube, SafeReads and SafeSpark, where usage is time, not searches).
const FAMILY_TIME_PRESETS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

function formatMinutes(mins) {
  if (!mins) return 'Unlimited';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

export default function TimeLimits({ userId, defaultKidId }) {
  const [selectedKid, setSelectedKid] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showTimeWindow, setShowTimeWindow] = useState(false);

  const { token } = useAuth();
  const timeLimitsData = useQuery(
    api.timeLimits.getTimeLimitsForUser,
    userId ? { userId, userToken: token ?? undefined } : 'skip'
  );

  const setTimeLimit = useMutation(api.timeLimits.setTimeLimit);
  const deleteTimeLimit = useMutation(api.timeLimits.deleteTimeLimit);

  // FAMILY-WIDE limit (one allowance shared across all five Safe Family apps).
  // Parents pick EITHER this OR the per-app search limit below — never both —
  // so turning this on disables the per-app controls rather than stacking.
  const getFamilyLimit = useAction(api.sharedScreenTime.getFamilyLimit);
  const setFamilyLimitAction = useAction(api.sharedScreenTime.setFamilyLimit);
  const [familyLimit, setFamilyLimit] = useState(null); // null = still loading
  const [familyLimitBusy, setFamilyLimitBusy] = useState(false);

  useEffect(() => {
    if (!selectedKid) {
      setFamilyLimit(null);
      return;
    }
    let cancelled = false;
    getFamilyLimit({ kidProfileId: selectedKid, userToken: token ?? undefined })
      .then((r) => { if (!cancelled) setFamilyLimit(r); })
      .catch(() => { if (!cancelled) setFamilyLimit({ available: false }); });
    return () => { cancelled = true; };
  }, [selectedKid, getFamilyLimit, token]);

  const saveFamilyLimit = async (minutes) => {
    if (!selectedKid) return;
    setFamilyLimitBusy(true);
    try {
      const res = await setFamilyLimitAction({
        kidProfileId: selectedKid,
        dailyLimitMinutes: minutes,
        userToken: token ?? undefined,
      });
      if (res?.ok) {
        setFamilyLimit((prev) => ({
          ...(prev || { available: true }),
          available: true,
          limitSet: minutes > 0,
          limitMinutes: minutes,
        }));
      }
    } finally {
      setFamilyLimitBusy(false);
    }
  };

  const familyLimitOn = !!familyLimit?.limitSet;

  // Auto-select kid if defaultKidId is provided
  useEffect(() => {
    if (defaultKidId && timeLimitsData && !selectedKid) {
      const kid = timeLimitsData.find(k => k.kidProfileId === defaultKidId);
      if (kid) {
        setSelectedKid(kid.kidProfileId);
      }
    }
  }, [defaultKidId, timeLimitsData, selectedKid]);

  // Local form state
  const [formState, setFormState] = useState({
    dailyLimitSearches: 50,
    weekendLimitSearches: undefined,
    allowedStartHour: undefined,
    allowedEndHour: undefined,
    _dailyCustom: false,
    _weekendCustom: false,
  });

  // Update form when kid is selected
  useEffect(() => {
    if (selectedKid) {
      const kidData = timeLimitsData?.find(k => k.kidProfileId === selectedKid);
      if (kidData?.limit) {
        const daily = kidData.limit.dailyLimitSearches ?? kidData.limit.dailyLimitMinutes ?? 50;
        const weekend = kidData.limit.weekendLimitSearches ?? kidData.limit.weekendLimitMinutes;
        setFormState({
          dailyLimitSearches: daily,
          weekendLimitSearches: weekend,
          allowedStartHour: kidData.limit.allowedStartHour,
          allowedEndHour: kidData.limit.allowedEndHour,
          _dailyCustom: isCustomValue(daily),
          _weekendCustom: weekend !== undefined && isCustomValue(weekend),
        });
        setShowTimeWindow(kidData.limit.allowedStartHour !== undefined);
      } else {
        setFormState({
          dailyLimitSearches: 50,
          weekendLimitSearches: undefined,
          allowedStartHour: undefined,
          allowedEndHour: undefined,
          _dailyCustom: false,
          _weekendCustom: false,
        });
        setShowTimeWindow(false);
      }
    }
  }, [selectedKid, timeLimitsData]);

  const handleSave = async () => {
    if (!selectedKid) return;
    setSaving(true);
    try {
      // The stored fields are named *Minutes for cross-app parity, but in
      // SafeStudy they hold a SEARCH COUNT (see convex/schema.ts). Sending
      // `dailyLimitSearches` here was silently failing the mutation's validator,
      // so per-app limits could never be saved.
      await setTimeLimit({
        kidProfileId: selectedKid,
        dailyLimitMinutes: formState.dailyLimitSearches,
        weekendLimitMinutes: formState.weekendLimitSearches,
        allowedStartHour: showTimeWindow ? formState.allowedStartHour : undefined,
        allowedEndHour: showTimeWindow ? formState.allowedEndHour : undefined,
        userToken: token ?? undefined,
      });
    } catch (err) {
      console.error('Failed to save time limit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLimit = async () => {
    if (!selectedKid) return;
    setSaving(true);
    try {
      await deleteTimeLimit({ kidProfileId: selectedKid, userToken: token ?? undefined });
      setFormState({
        dailyLimitSearches: 50,
        weekendLimitSearches: undefined,
        allowedStartHour: undefined,
        allowedEndHour: undefined,
        _dailyCustom: false,
        _weekendCustom: false,
      });
      setShowTimeWindow(false);
    } catch (err) {
      console.error('Failed to remove time limit:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!timeLimitsData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Search Limits</h2>
        <p className="text-gray-600 text-sm mt-1">
          Set daily search limits and allowed hours for each kid.
        </p>
      </div>

      {/* Kid selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {timeLimitsData.map((kid) => (
          <button
            key={kid.kidProfileId}
            onClick={() => setSelectedKid(kid.kidProfileId)}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition ${
              selectedKid === kid.kidProfileId
                ? 'border-accent-500 bg-accent-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${getColorClass(kid.kidColor)}`}
            >
              {kid.kidIcon}
            </div>
            <span className="mt-2 text-sm font-medium text-gray-900">{kid.kidName}</span>
            <span className="text-xs text-gray-500 mt-1">
              {kid.limit
                ? kid.limit.dailyLimitMinutes === 0
                  ? 'Unlimited'
                  : `${kid.limit.dailyLimitMinutes} searches/day`
                : 'No limit'}
            </span>
            {/* Today's usage */}
            {kid.searchCountToday > 0 && (
              <span className="text-xs text-accent-600 mt-0.5">
                {kid.searchCountToday} searches today
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Settings panel */}
      {selectedKid && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Settings for {timeLimitsData.find(k => k.kidProfileId === selectedKid)?.kidName}
          </h3>

          {/* One limit across every Safe Family app */}
          <div className="mb-6 rounded-xl border border-accent-200 bg-accent-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">One limit for all apps</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {timeLimitsData.find(k => k.kidProfileId === selectedKid)?.kidName}&rsquo;s
                  time counts across SafeTunes, SafeTube, SafeReads, SafeStudy and
                  SafeSpark together &mdash; not a separate allowance in each. In
                  SafeStudy that&rsquo;s time spent searching and working with the tutor.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={familyLimitOn}
                  disabled={familyLimitBusy}
                  onChange={(e) => saveFamilyLimit(e.target.checked ? (familyLimit?.limitMinutes || 60) : 0)}
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-accent-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
              </label>
            </div>

            {familyLimit && familyLimit.available === false && (
              <p className="mt-2 text-xs text-amber-700">
                Couldn&rsquo;t load this right now. The per-app limit below still applies.
              </p>
            )}

            {familyLimitOn && (
              <div className="mt-3">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {FAMILY_TIME_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={familyLimitBusy}
                      onClick={() => saveFamilyLimit(preset.value)}
                      className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        familyLimit?.limitMinutes === preset.value
                          ? 'bg-accent-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {typeof familyLimit?.usedMinutes === 'number' && (
                  <p className="mt-2 text-xs text-gray-600">
                    Used today across all apps: {formatMinutes(familyLimit.usedMinutes)}
                    {familyLimit.limitMinutes ? ` of ${formatMinutes(familyLimit.limitMinutes)}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Per-app search limit — ignored while the all-apps limit is on */}
          <div className={familyLimitOn ? 'opacity-40 pointer-events-none' : ''}>
          {familyLimitOn && (
            <p className="mb-3 text-xs text-gray-500">
              Turned off while &ldquo;One limit for all apps&rdquo; is on.
            </p>
          )}

          {/* Daily limit */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Search Limit (Weekdays)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {SEARCH_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setFormState(s => ({ ...s, dailyLimitSearches: preset.value, _dailyCustom: false }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    formState.dailyLimitSearches === preset.value && !formState._dailyCustom
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setFormState(s => ({ ...s, _dailyCustom: true, dailyLimitSearches: isCustomValue(s.dailyLimitSearches) ? s.dailyLimitSearches : 75 }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  formState._dailyCustom || isCustomValue(formState.dailyLimitSearches)
                    ? 'bg-accent-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom
              </button>
            </div>
            {(formState._dailyCustom || isCustomValue(formState.dailyLimitSearches)) && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={formState.dailyLimitSearches || ''}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
                    setFormState(s => ({ ...s, dailyLimitSearches: val, _dailyCustom: true }));
                  }}
                  className="w-24 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
                />
                <span className="text-sm text-gray-500">searches per day</span>
              </div>
            )}
          </div>

          {/* Weekend limit toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.weekendLimitSearches !== undefined}
                onChange={(e) => setFormState(s => ({
                  ...s,
                  weekendLimitSearches: e.target.checked ? s.dailyLimitSearches : undefined,
                }))}
                className="w-4 h-4 text-accent-500 border-gray-300 rounded focus:ring-accent-500"
              />
              <span className="text-sm font-medium text-gray-700">Different limit on weekends</span>
            </label>
            {formState.weekendLimitSearches !== undefined && (
              <div className="mt-3 ml-6">
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  {SEARCH_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setFormState(s => ({ ...s, weekendLimitSearches: preset.value, _weekendCustom: false }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        formState.weekendLimitSearches === preset.value && !formState._weekendCustom
                          ? 'bg-accent-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setFormState(s => ({ ...s, _weekendCustom: true, weekendLimitSearches: isCustomValue(s.weekendLimitSearches) ? s.weekendLimitSearches : 75 }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      formState._weekendCustom || isCustomValue(formState.weekendLimitSearches)
                        ? 'bg-accent-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {(formState._weekendCustom || isCustomValue(formState.weekendLimitSearches)) && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={formState.weekendLimitSearches || ''}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
                        setFormState(s => ({ ...s, weekendLimitSearches: val, _weekendCustom: true }));
                      }}
                      className="w-24 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
                    />
                    <span className="text-sm text-gray-500">searches per day</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time window toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTimeWindow}
                onChange={(e) => {
                  setShowTimeWindow(e.target.checked);
                  if (e.target.checked && formState.allowedStartHour === undefined) {
                    setFormState(s => ({ ...s, allowedStartHour: 8, allowedEndHour: 20 }));
                  }
                }}
                className="w-4 h-4 text-accent-500 border-gray-300 rounded focus:ring-accent-500"
              />
              <span className="text-sm font-medium text-gray-700">Restrict to specific hours</span>
            </label>
            {showTimeWindow && (
              <div className="mt-3 ml-6 flex items-center gap-3">
                <select
                  value={formState.allowedStartHour ?? 8}
                  onChange={(e) => setFormState(s => ({ ...s, allowedStartHour: parseInt(e.target.value) }))}
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
                <span className="text-gray-500">to</span>
                <select
                  value={formState.allowedEndHour ?? 20}
                  onChange={(e) => setFormState(s => ({ ...s, allowedEndHour: parseInt(e.target.value) }))}
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-accent-500 focus:border-accent-500"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-medium transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {timeLimitsData.find(k => k.kidProfileId === selectedKid)?.limit && (
              <button
                onClick={handleRemoveLimit}
                disabled={saving}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition"
              >
                Remove Limit
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* No kid selected prompt */}
      {!selectedKid && timeLimitsData.length > 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Select a kid above to manage their search limits</p>
        </div>
      )}

      {/* No kids */}
      {timeLimitsData.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Kid Profiles</h3>
          <p className="text-gray-500">
            Create kid profiles first to set up search limits.
          </p>
        </div>
      )}
    </div>
  );
}
