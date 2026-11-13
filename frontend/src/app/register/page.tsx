'use client';

import { API_URL, GOOGLE_SIGNUP_KEY } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Eye, EyeOff, MapPin, Bell, Smartphone, Loader2, CheckCircle2, AlertCircle, Heart, Popcorn, Check, Search, Plus, X, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { requestLocation, requestNotifications, UserLocation } from '@/lib/permissions';
import ModernInput from '@/components/ModernInput';
import BackButton from '@/components/BackButton';
import GoogleButton from '@/components/GoogleButton';
import BirthdayInput from '@/components/BirthdayInput';
import PasswordStrength, { isStrongPassword } from '@/components/PasswordStrength';
import { defaultAgeRange } from '@/lib/utils';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, GENDER_HELP, ORIENTATION_HELP } from '@/lib/identity';

const STEPS = {
  ACCOUNT: 1,
  LOCATION: 2,
  NOTIFICATIONS: 3,
  NAME: 4,
  BIRTHDAY: 5,
  GENDER: 6,
  ORIENTATION: 7,
  MODE: 8,
  INTERESTED_IN: 9,
  PHOTOS: 10,
  FILMS: 11,
  WELCOME: 12,
};

const GENDERS = GENDER_OPTIONS;

// Values match the relationship goals on the profile edit page
const MODES = [
  { value: 'Dating', label: 'Date', description: 'Find someone to fall in love with', icon: Heart },
  { value: 'Friendship', label: 'Friend', description: 'Find someone to watch films with', icon: Popcorn },
];

const INTERESTS = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'everyone', label: 'Everyone' },
];

const MIN_AGE = 18;
const MAX_AGE = 100;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // Matches the backend upload limit
const FILM_COUNT = 4;

const PRIMARY_BUTTON = 'w-full h-12 px-5 bg-[#1f2937] hover:bg-[#111827] text-white font-semibold rounded-xl transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON = 'w-full py-3 px-5 text-gray-600 hover:text-[#1f2937] font-medium transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed';
const COMING_SOON_BUTTON = 'w-full py-3 px-5 flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-400 font-medium rounded-lg cursor-not-allowed';

// Requires something@domain.tld, so "name@" or "name@site" doesn't count as finished
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

// Rejects dates like 02/31 that don't exist on the calendar
const isRealDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const calculateAge = (birthday: string) => {
  const [year, month, day] = birthday.split('-').map(Number);
  const today = new Date();
  const hadBirthdayThisYear =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (hadBirthdayThisYear ? 0 : 1);
};

function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-300 text-red-600 px-4 py-3 rounded-lg text-sm">
      {message}
    </div>
  );
}

function StepCard({ title, subtitle, error, onBack, children }: {
  title: string;
  subtitle?: string;
  error: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 px-6 py-8 sm:px-8">
      <BackButton onClick={onBack} label="Back" />

      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
        {subtitle && <p className="text-gray-600 text-sm">{subtitle}</p>}
      </div>

      <ErrorMessage message={error} />

      {children}
    </div>
  );
}

function OptionButton({ selected, onClick, children }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all duration-200 ${
        selected
          ? 'bg-[#1f2937] text-white border-[#1f2937]'
          : 'bg-white text-gray-700 border-gray-300 hover:border-[#1f2937]'
      }`}
    >
      {children}
    </button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(STEPS.ACCOUNT);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    birthday: '',
    gender: '',
    sexualOrientation: [] as string[],
    mode: '',
    interestedIn: '',
  });
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [photos, setPhotos] = useState<(File | null)[]>([null, null]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([null, null]);
  const [topFilms, setTopFilms] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearch = useRef('');
  const filmSearchInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Which part of account creation is running, shown in the loading overlay
  const [createStage, setCreateStage] = useState<{ step: number; label: string }>({ step: 0, label: '' });
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Turns unmet password rules red once someone tries to continue
  const [showPasswordErrors, setShowPasswordErrors] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Kept across retries of the last step so a failure part way doesn't re-register or re-upload
  const accountToken = useRef<string | null>(null);
  const uploadedPhotoCount = useRef(0);

  // Set when sign-up started with Google: the account is created with this instead of a password
  const [googleSignup, setGoogleSignup] = useState<{ signupToken: string; email: string } | null>(null);

  const [emailAvailable, setEmailAvailable] = useState(false);
  const emailCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestEmail = useRef('');

  const checkEmailAvailability = async (email: string) => {
    if (!isValidEmail(email)) {
      setEmailAvailable(false);
      return true;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      // Ignore an answer for an address the user has since changed
      if (email !== latestEmail.current) return !data.exists;

      if (data.exists) {
        setEmailError('This email is already registered');
        setEmailAvailable(false);
        return false;
      }
      setEmailError('');
      setEmailAvailable(true);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      if (email === latestEmail.current) setCheckingEmail(false);
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));

    // Editing the password clears the "choose a stronger password" message
    if (name === 'password') setError('');

    if (name === 'email') {
      const email = value.trim();
      latestEmail.current = email;
      setEmailError('');
      setEmailAvailable(false);
      setCheckingEmail(false);
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
      if (isValidEmail(email)) {
        emailCheckTimeout.current = setTimeout(() => checkEmailAvailability(email), 500);
      }
    }
  };

  const emailStatus: 'default' | 'error' | 'success' = emailError
    ? 'error'
    : emailAvailable && !checkingEmail
      ? 'success'
      : 'default';

  const goToStep = (nextStep: number) => {
    setError('');
    setIsStepTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsStepTransitioning(false);
    }, 300);
  };

  const handleBack = () => goToStep(step - 1);

  // Moves on when the current step is valid, otherwise shows why it isn't
  const continueIf = (validationError: string) => {
    if (validationError) {
      setError(validationError);
      return;
    }
    goToStep(step + 1);
  };

  const startGoogleSignup = (data: { signupToken: string; email: string; name: string }) => {
    setGoogleSignup({ signupToken: data.signupToken, email: data.email });
    setFormData((current) => ({ ...current, email: data.email, password: '', name: current.name || data.name }));
    goToStep(STEPS.LOCATION);
  };

  // Picks up a Google sign-up that started on the login page
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(GOOGLE_SIGNUP_KEY);
      if (!saved) return;
      sessionStorage.removeItem(GOOGLE_SIGNUP_KEY);
      startGoogleSignup(JSON.parse(saved));
    } catch {
      // Nothing usable saved: start with the normal sign-up
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setRequestingPermission(true);
    try {
      const response = await api.googleAuth(credential);
      if (response.needsProfile) {
        startGoogleSignup(response);
        return;
      }
      // Already has an account: just sign them in
      localStorage.setItem('token', response.token);
      setIsTransitioning(true);
      setTimeout(() => router.replace('/discover'), 300);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleAccountNext = async () => {
    setGoogleSignup(null);
    const email = formData.email.trim();
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (!isStrongPassword(formData.password)) {
      setShowPasswordErrors(true);
      setError('Please choose a stronger password that meets all the requirements below.');
      return;
    }
    latestEmail.current = email;
    if (await checkEmailAvailability(email)) {
      goToStep(STEPS.LOCATION);
    }
  };

  const handleEnableLocation = async () => {
    setRequestingPermission(true);
    setLocation(await requestLocation());
    setRequestingPermission(false);
    goToStep(STEPS.NOTIFICATIONS);
  };

  const handleEnableNotifications = async () => {
    setRequestingPermission(true);
    await requestNotifications();
    setRequestingPermission(false);
    goToStep(STEPS.NAME);
  };

  const getBirthdayError = () => {
    if (!formData.birthday) return 'Please enter your birthday';
    if (!isRealDate(formData.birthday)) return 'Please enter a real date';
    const age = calculateAge(formData.birthday);
    if (age < MIN_AGE) return `You must be at least ${MIN_AGE} to use MatchFlix`;
    if (age > MAX_AGE) return 'Please enter a valid birthday';
    return '';
  };

  const handlePhotoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_SIZE) {
      setError('Each photo must be smaller than 5MB');
      return;
    }

    setError('');
    setPhotos((current) => current.map((photo, i) => (i === index ? file : photo)));
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrls((current) => current.map((url, i) => (i === index ? (reader.result as string) : url)));
    };
    reader.readAsDataURL(file);
  };

  const searchFilms = async (query: string) => {
    setSearching(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=cdae6080cab925d15b7afd3c8e4894a5&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      // A slower, older search must not replace the results of a newer one
      if (query === latestSearch.current) {
        // Films are saved by their poster, so one without a poster can't be picked
        setSearchResults((data.results || []).filter((film: any) => film.poster_path));
      }
    } catch (err) {
      console.error('Error searching films:', err);
      setError('Could not search for films. Please try again.');
    } finally {
      if (query === latestSearch.current) {
        setSearching(false);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setError('');

    // Debounce search
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    latestSearch.current = query.trim();
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    searchTimeout.current = setTimeout(() => searchFilms(query.trim()), 500);
  };

  const addFilm = (film: any) => {
    if (topFilms.length < FILM_COUNT && !topFilms.some((f) => f.id === film.id)) {
      setTopFilms([...topFilms, film]);
      setError('');
    }
    latestSearch.current = '';
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFilm = (filmId: number) => {
    setTopFilms(topFilms.filter((f) => f.id !== filmId));
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      setCreateStage({ step: 1, label: 'Creating your account' });
      if (!accountToken.current) {
        const response = googleSignup
          ? await api.completeGoogleSignup({
              signupToken: googleSignup.signupToken,
              name: formData.name.trim(),
              birthday: formData.birthday,
              gender: formData.gender,
            })
          : await api.register({
              name: formData.name.trim(),
              email: formData.email,
              password: formData.password,
              birthday: formData.birthday,
              gender: formData.gender,
            });
        accountToken.current = response.token;
        localStorage.setItem('token', response.token);
      }

      setCreateStage({ step: 2, label: 'Setting up your profile' });
      await api.updateProfile({
        relationshipGoals: [formData.mode],
        preferredGender: [formData.interestedIn],
        sexualOrientation: formData.sexualOrientation,
        ...defaultAgeRange(calculateAge(formData.birthday)),
        topFilms: topFilms.map((film) => `https://image.tmdb.org/t/p/w500${film.poster_path}`),
        ...location,
      });

      for (const photo of photos.slice(uploadedPhotoCount.current)) {
        setCreateStage({ step: 3, label: `Uploading photos (${uploadedPhotoCount.current + 1}/${photos.length})` });
        await api.addPhoto(photo as File);
        uploadedPhotoCount.current += 1;
      }

      setCreateStage({ step: 4, label: "You're all set!" });
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => router.replace('/discover'), 300);
      }, 500);
      // The overlay stays up until Discover opens
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
      setCreateStage({ step: 0, label: '' });
    }
  };

  return (
    <div
      className={`theme-surface min-h-[100dvh] bg-white flex items-start sm:items-center justify-center px-4 pt-12 pb-8 sm:py-8 relative transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Creating-account overlay */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-white/85 backdrop-blur-sm animate-fadeIn"
        >
          <div className="flex flex-col items-center text-center px-6">
            {createStage.step === 4 ? (
              <span className="w-14 h-14 rounded-full bg-[#1f2937] flex items-center justify-center animate-scaleIn">
                <Check className="w-7 h-7 text-white" strokeWidth={3} />
              </span>
            ) : (
              <span className="w-14 h-14 rounded-full border-[3px] border-gray-200 border-t-[#1f2937] animate-spin" />
            )}
            <p className="mt-5 text-base font-semibold text-gray-900">{createStage.label || 'Creating your account'}</p>
            <p className="mt-1 text-sm text-gray-500">
              {createStage.step === 4 ? 'Taking you to Discover…' : 'This only takes a moment'}
            </p>
            <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    createStage.step > n ? 'w-6 bg-[#1f2937]' : createStage.step === n ? 'w-6 bg-gray-400' : 'w-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`w-full max-w-md transition-all duration-300 relative z-10 ${isStepTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Step 1: Create account */}
        {step === STEPS.ACCOUNT && (
          <>
            {/* Back to Home Button */}
            <BackButton href="/" label="Home" className="mb-2 ml-6 sm:ml-8" />

            <div className="space-y-6 px-6 py-8 sm:px-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Create Your Account</h2>
                <p className="text-gray-600 text-sm">Start your journey to find your perfect match</p>
              </div>

              <ErrorMessage message={error} />

              <div className="space-y-3">
                <GoogleButton
                  text="signup_with"
                  disabled={requestingPermission}
                  onCredential={handleGoogleCredential}
                  onError={setError}
                />
                {/* Not connected yet: needs an SMS provider */}
                <button disabled className={COMING_SOON_BUTTON}>
                  <Smartphone className="w-5 h-5" />
                  Use mobile number
                </button>
                <p className="text-center text-xs text-gray-500">Mobile sign-in is coming soon</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-500">or use your email</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <div className="space-y-4">
                <ModernInput
                  type="email"
                  name="email"
                  label="Email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  status={emailStatus}
                  trailing={
                    checkingEmail ? (
                      <Loader2 className="w-5 h-5 mr-2 text-gray-400 animate-spin" />
                    ) : emailStatus === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
                    ) : emailStatus === 'error' ? (
                      <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                    ) : null
                  }
                  helperText={
                    emailError
                      ? emailError
                      : emailStatus === 'success'
                        ? 'Email is available'
                        : undefined
                  }
                />

                <ModernInput
                  type={showPassword ? "text" : "password"}
                  name="password"
                  label="Password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  status={formData.password && isStrongPassword(formData.password) ? 'success' : showPasswordErrors ? 'error' : 'default'}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 ease-out"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />
                <PasswordStrength password={formData.password} showErrors={showPasswordErrors} />
              </div>

              <button onClick={handleAccountNext} className={PRIMARY_BUTTON}>
                Continue
              </button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-[#1f2937] hover:text-[#111827] font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}

        {/* Step 2: Location */}
        {step === STEPS.LOCATION && (
          <StepCard
            title="Enable location services"
            subtitle="We use your location to show you people nearby"
            error={error}
            onBack={handleBack}
          >
            <div className="flex justify-center">
              <MapPin className="w-16 h-16 text-[#1f2937]" />
            </div>
            <div className="space-y-2">
              <button onClick={handleEnableLocation} disabled={requestingPermission} className={PRIMARY_BUTTON}>
                {requestingPermission ? 'Enabling...' : 'Enable location'}
              </button>
              <button onClick={() => goToStep(STEPS.NOTIFICATIONS)} disabled={requestingPermission} className={SECONDARY_BUTTON}>
                Not now
              </button>
            </div>
          </StepCard>
        )}

        {/* Step 3: Notifications */}
        {step === STEPS.NOTIFICATIONS && (
          <StepCard
            title="Allow notifications"
            subtitle="Find out when you get a new match or message"
            error={error}
            onBack={handleBack}
          >
            <div className="flex justify-center">
              <Bell className="w-16 h-16 text-[#1f2937]" />
            </div>
            <div className="space-y-2">
              <button onClick={handleEnableNotifications} disabled={requestingPermission} className={PRIMARY_BUTTON}>
                {requestingPermission ? 'Allowing...' : 'Allow notifications'}
              </button>
              <button onClick={() => goToStep(STEPS.NAME)} disabled={requestingPermission} className={SECONDARY_BUTTON}>
                Not now
              </button>
            </div>
          </StepCard>
        )}

        {/* Step 4: Preferred name */}
        {step === STEPS.NAME && (
          <StepCard title="What's your preferred name?" subtitle="This is how you'll appear on MatchFlix" error={error} onBack={handleBack}>
            <ModernInput
              type="text"
              name="name"
              label="Preferred name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
            <button onClick={() => continueIf(formData.name.trim() ? '' : 'Please enter your name')} className={PRIMARY_BUTTON}>
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 5: Birthday */}
        {step === STEPS.BIRTHDAY && (
          <StepCard title="When's your birthday?" subtitle="Your age will be shown on your profile" error={error} onBack={handleBack}>
            <BirthdayInput
              value={formData.birthday}
              onChange={(birthday) => {
                setError('');
                setFormData((current) => ({ ...current, birthday }));
              }}
              hint={
                isRealDate(formData.birthday) && calculateAge(formData.birthday) >= 0
                  ? <>You're <span className="font-semibold text-gray-800">{calculateAge(formData.birthday)}</span></>
                  : 'Enter your date of birth'
              }
            />
            <button onClick={() => continueIf(getBirthdayError())} className={PRIMARY_BUTTON}>
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 6: Gender identity */}
        {step === STEPS.GENDER && (
          <StepCard title="What's your gender identity?" subtitle={GENDER_HELP} error={error} onBack={handleBack}>
            <div className="grid grid-cols-2 gap-3">
              {GENDERS.map(({ value, label }) => (
                <OptionButton
                  key={value}
                  selected={formData.gender === value}
                  onClick={() => setFormData({ ...formData, gender: value })}
                >
                  {label}
                </OptionButton>
              ))}
            </div>
            <button onClick={() => continueIf(formData.gender ? '' : 'Please select your gender identity')} className={PRIMARY_BUTTON}>
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 7: Sexual orientation */}
        {step === STEPS.ORIENTATION && (
          <StepCard title="What's your sexual orientation?" subtitle={ORIENTATION_HELP} error={error} onBack={handleBack}>
            <div className="grid grid-cols-2 gap-3">
              {ORIENTATION_OPTIONS.map(({ value, label }) => {
                const selected = formData.sexualOrientation[0] === value;
                return (
                  <OptionButton
                    key={value}
                    selected={selected}
                    onClick={() => {
                      setError('');
                      setFormData((current) => ({ ...current, sexualOrientation: [value] }));
                    }}
                  >
                    {label}
                  </OptionButton>
                );
              })}
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5" />
              Private — never shown on your profile
            </p>
            <button
              onClick={() => continueIf(formData.sexualOrientation.length ? '' : 'Please choose an option (or "Prefer not to say")')}
              className={PRIMARY_BUTTON}
            >
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 7: Mode */}
        {step === STEPS.MODE && (
          <StepCard title="Choose a mode to get started" error={error} onBack={handleBack}>
            <div role="radiogroup" aria-label="Mode" className="grid gap-3">
              {MODES.map(({ value, label, description, icon: Icon }) => {
                const selected = formData.mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setError('');
                      setFormData((current) => ({ ...current, mode: value }));
                    }}
                    className={`group flex items-center gap-4 w-full p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 ${
                      selected
                        ? 'border-[#1f2937] bg-gray-50 shadow-[0_0_0_1px_#1f2937]'
                        : 'border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:bg-gray-50/60'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ease-out ${
                        selected ? 'bg-[#1f2937] text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-6 h-6" strokeWidth={2} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-semibold text-gray-900">{label}</span>
                      <span className="block text-sm text-gray-500 mt-0.5">{description}</span>
                    </span>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        selected ? 'border-[#1f2937] bg-[#1f2937]' : 'border-gray-300'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => continueIf(formData.mode ? '' : 'Please choose a mode')} className={PRIMARY_BUTTON}>
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 8: Interested in */}
        {step === STEPS.INTERESTED_IN && (
          <StepCard title="Who are you interested in?" error={error} onBack={handleBack}>
            <div className="grid grid-cols-3 gap-3">
              {INTERESTS.map(({ value, label }) => (
                <OptionButton
                  key={value}
                  selected={formData.interestedIn === value}
                  onClick={() => setFormData({ ...formData, interestedIn: value })}
                >
                  {label}
                </OptionButton>
              ))}
            </div>
            <button onClick={() => continueIf(formData.interestedIn ? '' : 'Please select who you are interested in')} className={PRIMARY_BUTTON}>
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 9: Photos */}
        {step === STEPS.PHOTOS && (
          <StepCard title="Add your first 2 photos" subtitle="Your first photo will be your profile picture" error={error} onBack={handleBack}>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((_, index) => (
                <label key={index} className="aspect-[3/4] cursor-pointer rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-[#1f2937] transition-all duration-200 ease-out">
                  {previewUrls[index] ? (
                    <img src={previewUrls[index] as string} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">Photo {index + 1}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => handlePhotoChange(index, e)}
                    className="hidden"
                  />
                </label>
              ))}
            </div>
            <button onClick={() => continueIf(photos.every(Boolean) ? '' : 'Please add 2 photos')} className={PRIMARY_BUTTON}>
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 10: Top 4 films */}
        {step === STEPS.FILMS && (
          <StepCard title="Choose your top 4 films" subtitle="Share your favorite movies to find better matches" error={error} onBack={handleBack}>
            {/* Search */}
            <div className="relative">
              <div
                className={`relative flex items-center rounded-xl border bg-white shadow-sm transition-all duration-200 ${
                  topFilms.length < FILM_COUNT
                    ? 'border-gray-200 hover:border-gray-300 focus-within:border-[#1f2937] focus-within:ring-4 focus-within:ring-[#1f2937]/10'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  ref={filmSearchInput}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  disabled={topFilms.length >= FILM_COUNT}
                  placeholder={topFilms.length >= FILM_COUNT ? 'All 4 films chosen' : 'Search for a film...'}
                  className="w-full h-14 pl-12 pr-12 bg-transparent outline-none text-[15px] text-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed"
                />
                {searching && <Loader2 className="absolute right-4 w-5 h-5 text-gray-400 animate-spin" />}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-1.5">
                  {searchResults.slice(0, 6).map((film) => {
                    const alreadyChosen = topFilms.some((f) => f.id === film.id);
                    return (
                      <button
                        key={film.id}
                        onClick={() => addFilm(film)}
                        disabled={alreadyChosen}
                        className="w-full p-2 flex items-center gap-3 rounded-xl hover:bg-gray-100 transition-all duration-200 ease-out text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w92${film.poster_path}`}
                          alt=""
                          className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{film.title}</p>
                          <p className="text-xs text-gray-500">{film.release_date?.split('-')[0] || 'N/A'}</p>
                        </div>
                        <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-700">
                          {alreadyChosen ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Count */}
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-gray-700">Your top films</span>
              <span className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{topFilms.length}</span> of {FILM_COUNT} chosen
              </span>
            </div>

            {/* 2x2 poster grid */}
            <div className="grid grid-cols-2 gap-3 max-w-[320px] mx-auto">
              {Array.from({ length: FILM_COUNT }, (_, index) => topFilms[index]).map((film, index) =>
                film ? (
                  <div key={film.id} className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-gray-100 shadow-md">
                    <img
                      src={`https://image.tmdb.org/t/p/w342${film.poster_path}`}
                      alt={film.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                    <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur text-gray-900 text-xs font-bold flex items-center justify-center shadow">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => removeFilm(film.id)}
                      aria-label={`Remove ${film.title}`}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white flex items-center justify-center transition-all duration-200 ease-out"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="absolute bottom-2 left-2.5 right-2.5 text-white text-xs font-semibold leading-tight line-clamp-2">
                      {film.title}
                    </p>
                  </div>
                ) : (
                  <button
                    key={`empty-${index}`}
                    type="button"
                    onClick={() => filmSearchInput.current?.focus()}
                    className="aspect-[2/3] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 ease-out flex flex-col items-center justify-center gap-2 text-gray-400"
                  >
                    <span className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                      <Plus className="w-5 h-5 text-gray-500" />
                    </span>
                    <span className="text-xs font-medium">Film {index + 1}</span>
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => continueIf(topFilms.length === FILM_COUNT ? '' : `Please choose ${FILM_COUNT} films`)}
              className={PRIMARY_BUTTON}
            >
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 11: Before you swipe */}
        {step === STEPS.WELCOME && (
          <div className="space-y-8 px-6 py-8 sm:px-8">
            <BackButton onClick={handleBack} disabled={loading} label="Back" />

            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-gray-800">Before you swipe</h2>

              <div className="text-justify hyphens-auto space-y-4 max-w-lg mx-auto leading-relaxed">
                <p className="text-gray-700">
                  Welcome! We're excited to be part of your dating journey.
                </p>

                <p className="text-gray-700">
                  Here we treat everyone with kindness and respect, no matter their race, religion, nationality, ethnicity, skin color, ability, size, sex, gender identity, or sexual orientation.
                </p>

                <p className="text-gray-700">
                  In our mission to actively keep MatchFlix safe and inclusive, we ask you to join us by adhering to our{' '}
                  <Link href="/guidelines" className="text-[#1f2937] hover:text-[#111827] font-semibold underline">
                    guidelines
                  </Link>
                  .
                </p>

                <p className="text-gray-700">
                  And remember: We've always got your back!
                </p>

                <p className="text-left text-[#1f2937] font-semibold text-lg pt-2">
                  With love, The MatchFlix Team
                </p>
              </div>
            </div>

            <ErrorMessage message={error} />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 px-5 bg-[#1f2937] hover:bg-[#111827] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              I agree
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
