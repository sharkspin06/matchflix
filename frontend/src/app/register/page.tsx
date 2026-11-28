'use client';

import { API_URL } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Eye, EyeOff, MapPin, Bell, Loader2, CheckCircle2, AlertCircle, Heart, UserPlus, Smile, HeartHandshake, Check, Search, Plus, X, Lock, Mail, MailCheck, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { requestLocation, requestNotifications, UserLocation } from '@/lib/permissions';
import AuthInput from '@/components/AuthInput';
import { CARD_ON, CARD_OFF } from '@/components/pillStyles';
import OtpInput from '@/components/OtpInput';
import BackButton from '@/components/BackButton';
import AuthShell, { AUTH_BUTTON, AUTH_LINK } from '@/components/AuthShell';
import Logo from '@/components/Logo';
import Wordmark from '@/components/Wordmark';
import BirthdayInput from '@/components/BirthdayInput';
import PasswordStrength, { isStrongPassword } from '@/components/PasswordStrength';
import { defaultAgeRange } from '@/lib/utils';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, ORIENTATION_HELP } from '@/lib/identity';
import PermissionSettingsDialog, { type PermissionKind } from '@/components/PermissionSettingsDialog';
import GuidelinesModal from '@/components/GuidelinesModal';

const STEPS = {
  ACCOUNT: 1,
  VERIFY: 2,
  LOCATION: 3,
  NOTIFICATIONS: 4,
  NAME: 5,
  BIRTHDAY: 6,
  GENDER: 7,
  ORIENTATION: 8,
  MODE: 9,
  INTERESTED_IN: 10,
  PHOTOS: 11,
  FILMS: 12,
  WELCOME: 13,
};

const GENDERS = GENDER_OPTIONS;

// Values match the relationship goals on the profile edit page
// Same options as "Here for" in Edit Profile (values match relationshipGoals there)
const MODES = [
  { value: 'Dating', label: 'Dating', description: 'Find someone to fall for', icon: Heart },
  { value: 'Friendship', label: 'Friendship', description: 'A film buddy to watch with', icon: UserPlus },
  { value: 'Casual', label: 'Casual', description: 'Keep it light, see where it goes', icon: Smile },
  { value: 'Serious Relationship', label: 'Serious', description: 'Looking for something long-term', icon: HeartHandshake },
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
const CODE_LENGTH = 6;

const PRIMARY_BUTTON = 'w-full h-12 px-5 bg-[#1f2937] hover:bg-[#111827] text-white font-semibold rounded-xl transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON = 'w-full py-3 px-5 text-gray-600 hover:text-[#1f2937] font-medium transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

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
  // Same pill as the login fields; the chosen one turns white like the main button
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`h-14 px-4 rounded-full border text-[15px] font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffffff]/20 ${
        selected
          ? 'bg-[#f5f5f5] text-[#0b0d10] border-[#f5f5f5] font-semibold'
          : 'bg-[#2a2e35] text-[#f3f4f6] border-[#3a3f47] hover:border-[#4b515a] hover:bg-[#31363e]'
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
    modes: [] as string[],
    interestedIn: '',
  });
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [permissionHelp, setPermissionHelp] = useState<{
    kind: PermissionKind;
    outcome: 'blocked' | 'unavailable';
  } | null>(null);
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


  // Email code (OTP) check before the account can be created
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [codeNotice, setCodeNotice] = useState('');
  // Proof from the server that `verifiedEmail` passed the code check; sent with register
  const emailVerificationToken = useRef<string | null>(null);
  const verifiedEmail = useRef('');
  // Where to go after verifying; the last step when the proof expired during sign-up
  const afterVerifyStep = useRef(STEPS.LOCATION);

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

  // The code screen is skipped going back: there's nothing to redo once the email is verified
  const handleBack = () => goToStep(step === STEPS.LOCATION || step === STEPS.VERIFY ? STEPS.ACCOUNT : step - 1);

  // Counts down until another code can be requested
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Moves on when the current step is valid, otherwise shows why it isn't
  const continueIf = (validationError: string) => {
    if (validationError) {
      setError(validationError);
      return;
    }
    goToStep(step + 1);
  };

  const handleAccountNext = async () => {
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
    if (!(await checkEmailAvailability(email))) return;

    // Already verified this exact address (e.g. came back to fix the password)
    if (emailVerificationToken.current && verifiedEmail.current === email.toLowerCase()) {
      goToStep(STEPS.LOCATION);
      return;
    }
    afterVerifyStep.current = STEPS.LOCATION;
    if (await sendCode()) goToStep(STEPS.VERIFY);
  };

  // Emails a code; returns false when there's no point showing the code screen
  const sendCode = async () => {
    const email = formData.email.trim();
    setSendingCode(true);
    setOtpError('');
    setCodeNotice('');
    try {
      const result = await api.sendSignupCode(email);
      setOtp('');
      setResendIn(result.resendInSeconds);
      return true;
    } catch (err: any) {
      if (err.status === 429 && err.retryAfter) {
        // A code went out less than a minute ago and still works
        setResendIn(err.retryAfter);
        return true;
      }
      if (err.status === 409) {
        setEmailError('This email is already registered');
        setEmailAvailable(false);
        if (step !== STEPS.ACCOUNT) goToStep(STEPS.ACCOUNT);
        return false;
      }
      if (step === STEPS.VERIFY) setOtpError(err.message);
      else setError(err.message || "We couldn't send the code. Please try again.");
      return false;
    } finally {
      setSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendIn > 0 || sendingCode) return;
    if (await sendCode()) setCodeNotice('A new code is on its way.');
  };

  const verifyCode = async (code: string) => {
    if (verifyingCode || code.length !== CODE_LENGTH) return;
    setVerifyingCode(true);
    setOtpError('');
    try {
      const email = formData.email.trim();
      const result = await api.verifySignupCode(email, code);
      emailVerificationToken.current = result.emailVerificationToken;
      verifiedEmail.current = email.toLowerCase();
      goToStep(afterVerifyStep.current);
    } catch (err: any) {
      setOtpError(err.message || "That code didn't work. Please try again.");
      setOtp('');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Blocked or switched-off permissions get a popup explaining how to turn them on in settings.
  // A prompt that was just closed leaves the person on the step to try again or choose "Not now".
  const handleEnableLocation = async () => {
    setRequestingPermission(true);
    const { location: result, outcome } = await requestLocation();
    setRequestingPermission(false);
    setLocation(result);
    if (outcome === 'blocked' || outcome === 'unavailable') {
      setPermissionHelp({ kind: 'location', outcome });
      return;
    }
    if (outcome === 'granted') {
      setPermissionHelp(null);
      goToStep(STEPS.NOTIFICATIONS);
    }
  };

  const handleEnableNotifications = async () => {
    setRequestingPermission(true);
    const outcome = await requestNotifications();
    setRequestingPermission(false);
    if (outcome === 'blocked' || outcome === 'unavailable') {
      setPermissionHelp({ kind: 'notifications', outcome });
      return;
    }
    if (outcome === 'granted') {
      setPermissionHelp(null);
      goToStep(STEPS.NAME);
    }
  };

  const getBirthdayError = () => {
    if (!formData.birthday) return 'Please enter your birthday';
    if (!isRealDate(formData.birthday)) return 'Please enter a real date';
    const age = calculateAge(formData.birthday);
    if (age < MIN_AGE) return `You must be at least ${MIN_AGE} to use Cinephile`;
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
        const response = await api.register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          birthday: formData.birthday,
          gender: formData.gender,
          emailVerificationToken: emailVerificationToken.current || '',
        });
        accountToken.current = response.token;
        localStorage.setItem('token', response.token);
      }

      setCreateStage({ step: 2, label: 'Setting up your profile' });
      await api.updateProfile({
        relationshipGoals: formData.modes,
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
      setLoading(false);
      setCreateStage({ step: 0, label: '' });
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        // The verification lasts a few hours; get a fresh code, then come straight back here
        emailVerificationToken.current = null;
        afterVerifyStep.current = STEPS.WELCOME;
        if (await sendCode()) {
          goToStep(STEPS.VERIFY);
          setTimeout(() => setCodeNotice('Your email verification expired. We sent you a new code.'), 350);
        }
        return;
      }
      setError(err.message || 'Registration failed');
    }
  };

  // Step 1 uses the cinematic login-style screen; the later steps keep the regular layout
  if (step === STEPS.ACCOUNT) {
    return (
      <AuthShell fading={isTransitioning} cardHidden={isStepTransitioning}>
        <div className="space-y-6">
          <div className="text-center">
            <Wordmark className="h-12 sm:h-14 mx-auto mb-5" />
            <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white mb-1.5">Create Your Account</h2>
            <p className="text-gray-400 text-sm">Start your journey to find your perfect match</p>
          </div>

          <ErrorMessage message={error} />

          <div className="space-y-4">
            <AuthInput
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              icon={<Mail />}
              autoComplete="email"
              required
              status={emailStatus}
              trailing={
                checkingEmail ? (
                  <Loader2 className="w-5 h-5 mr-3 text-gray-400 animate-spin" />
                ) : emailStatus === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500" />
                ) : emailStatus === 'error' ? (
                  <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
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

            <AuthInput
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              icon={<Lock />}
              autoComplete="new-password"
              required
              minLength={8}
              status={formData.password && isStrongPassword(formData.password) ? 'success' : showPasswordErrors ? 'error' : 'default'}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-2.5 rounded-full text-[#8b93a1] hover:text-[#f3f4f6] hover:bg-[#ffffff]/10 transition-all duration-200 ease-out"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />
            <PasswordStrength password={formData.password} showErrors={showPasswordErrors} />
          </div>

          <button onClick={handleAccountNext} disabled={sendingCode || checkingEmail} className={AUTH_BUTTON}>
            {sendingCode ? 'Sending code…' : 'Continue'}
          </button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className={AUTH_LINK}>
              Sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  if (step === STEPS.VERIFY) {
    return (
      <AuthShell fading={isTransitioning} cardHidden={isStepTransitioning} onBack={handleBack}>
        <div className="space-y-6">
          <div className="text-center">
            <span className="mx-auto mb-5 flex w-16 h-16 items-center justify-center rounded-full bg-[#2a2e35] border border-[#3a3f47]">
              <MailCheck className="w-8 h-8 text-[#f3f4f6]" />
            </span>
            <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white mb-1.5">Check your email</h2>
            <p className="text-gray-400 text-sm">
              We sent a {CODE_LENGTH}-digit code to
              <br />
              <span className="font-semibold text-[#f3f4f6] break-all">{formData.email.trim()}</span>
            </p>
          </div>

          <div className="space-y-3">
            <OtpInput
              value={otp}
              onChange={(value) => {
                setOtp(value);
                if (otpError) setOtpError('');
              }}
              onComplete={verifyCode}
              length={CODE_LENGTH}
              disabled={verifyingCode}
              invalid={Boolean(otpError)}
              autoFocus
            />
            <p className="min-h-[20px] text-center text-[13px]" aria-live="polite">
              {otpError ? (
                <span className="text-red-600">{otpError}</span>
              ) : codeNotice ? (
                <span className="text-emerald-600">{codeNotice}</span>
              ) : (
                <span className="text-gray-500">The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.</span>
              )}
            </p>
          </div>

          <button
            onClick={() => verifyCode(otp)}
            disabled={otp.length !== CODE_LENGTH || verifyingCode}
            className={AUTH_BUTTON}
          >
            {verifyingCode ? 'Verifying…' : 'Verify email'}
          </button>

          <div className="text-center text-sm text-gray-400 space-y-2">
            <p>
              Didn&apos;t get a code?{' '}
              {resendIn > 0 ? (
                <span className="text-gray-500">Resend in {resendIn}s</span>
              ) : (
                <button type="button" onClick={handleResendCode} disabled={sendingCode} className={`${AUTH_LINK} disabled:opacity-50`}>
                  {sendingCode ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </p>
            <p>
              Wrong email?{' '}
              <button type="button" onClick={() => goToStep(STEPS.ACCOUNT)} className={AUTH_LINK}>
                Change it
              </button>
            </p>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    // Always dark, like the first sign-up step, whatever the app theme
    <div className="dark">
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

        <GuidelinesModal open={showGuidelines} onClose={() => setShowGuidelines(false)} />

        {permissionHelp && (
          <PermissionSettingsDialog
            open
            kind={permissionHelp.kind}
            outcome={permissionHelp.outcome}
            retrying={requestingPermission}
            onRetry={permissionHelp.kind === 'location' ? handleEnableLocation : handleEnableNotifications}
            onClose={() => setPermissionHelp(null)}
          />
        )}

        {/* Step 4: Preferred name */}
        {step === STEPS.NAME && (
          <StepCard title="What's your preferred name?" subtitle="This is how you'll appear on Cinephile" error={error} onBack={handleBack}>
            <AuthInput
              type="text"
              name="name"
              icon={<UserRound />}
              value={formData.name}
              onChange={handleChange}
              placeholder="Your preferred name"
              autoComplete="given-name"
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
              appearance="auth"
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
          <StepCard title="What's your gender identity?" error={error} onBack={handleBack}>
            <div role="radiogroup" aria-label="Gender identity" className="grid grid-cols-1 gap-3">
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
            <div role="radiogroup" aria-label="Sexual orientation" className="grid grid-cols-2 gap-3">
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
          <StepCard title="Choose a mode to get started" subtitle="Pick all that apply" error={error} onBack={handleBack}>
            <div className="grid grid-cols-2 gap-2.5">
              {MODES.map(({ value, label, description, icon: Icon }) => {
                const selected = formData.modes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setError('');
                      setFormData((current) => ({
                        ...current,
                        modes: selected ? current.modes.filter((m) => m !== value) : [...current.modes, value],
                      }));
                    }}
                    className={`group relative flex flex-col items-start gap-3 p-4 rounded-3xl border text-left transition-all duration-200 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffffff]/20 ${
                      selected ? CARD_ON : CARD_OFF
                    }`}
                  >
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                        selected ? 'bg-[#1f2937] text-white' : 'bg-[#e3e5e9] text-gray-600 dark:bg-[#3a3f47] dark:text-[#d1d5db]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">{label}</span>
                      <span className="block mt-0.5 text-xs leading-snug text-gray-500">{description}</span>
                    </span>
                    <span
                      className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        selected ? 'border-[#1f2937] bg-[#1f2937]' : 'border-gray-300 dark:border-[#4b515a]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => continueIf(formData.modes.length ? '' : 'Please choose at least one')} className={PRIMARY_BUTTON}>
              Continue
            </button>
          </StepCard>
        )}

        {/* Step 8: Interested in */}
        {step === STEPS.INTERESTED_IN && (
          <StepCard title="Who are you interested in?" error={error} onBack={handleBack}>
            <div role="radiogroup" aria-label="Interested in" className="grid grid-cols-3 gap-3">
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
                className={`group relative flex items-center rounded-full border bg-[#2a2e35] transition-all duration-200 ${
                  topFilms.length < FILM_COUNT
                    ? 'border-[#3a3f47] hover:border-[#4b515a] focus-within:border-[#d1d5db] focus-within:ring-4 focus-within:ring-[#ffffff]/10'
                    : 'border-[#3a3f47] opacity-60'
                }`}
              >
                <Search className="absolute left-5 w-5 h-5 text-[#8b93a1] pointer-events-none transition-colors group-focus-within:text-[#f3f4f6]" />
                <input
                  ref={filmSearchInput}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  disabled={topFilms.length >= FILM_COUNT}
                  placeholder={topFilms.length >= FILM_COUNT ? 'All 4 films chosen' : 'Search for a film...'}
                  className="auth-input w-full h-14 pl-[52px] pr-12 bg-transparent outline-none text-[15px] text-[#f3f4f6] disabled:cursor-not-allowed"
                />
                {searching && <Loader2 className="absolute right-5 w-5 h-5 text-[#8b93a1] animate-spin" />}
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
              <div>
                <Logo variant="logo2" className="h-14 sm:h-16 mx-auto mb-3" />
                <h2 className="text-3xl font-bold text-gray-800">Before you swipe</h2>
              </div>

              <div className="text-justify hyphens-auto space-y-4 max-w-lg mx-auto leading-relaxed">
                <p className="text-gray-700">
                  Welcome! We're excited to be part of your dating journey.
                </p>

                <p className="text-gray-700">
                  Here we treat everyone with kindness and respect, no matter their race, religion, nationality, ethnicity, skin color, ability, size, sex, gender identity, or sexual orientation.
                </p>

                <p className="text-gray-700">
                  In our mission to actively keep Cinephile safe and inclusive, we ask you to join us by adhering to our{' '}
                  {/* Opens in a modal so leaving to read them doesn't lose sign-up progress */}
                  <button
                    type="button"
                    onClick={() => setShowGuidelines(true)}
                    className="text-[#1f2937] hover:text-[#111827] font-semibold underline"
                  >
                    guidelines
                  </button>
                  .
                </p>

                <p className="text-gray-700">
                  And remember: We've always got your back!
                </p>

                <p className="text-left text-[#1f2937] font-semibold text-lg pt-2">
                  With love, The Cinephile Team
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
    </div>
  );
}
