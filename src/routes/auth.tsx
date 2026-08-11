import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import logoImg from "@/assets/studiodesk-logo.png";
import { checkEmailExists, checkBusinessNameExists } from "@/lib/profile.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("has_seen_onboarding")) {
      throw redirect({ to: "/onboarding" });
    }
  },
  head: () => ({ meta: [{ title: "Sign in — Studio" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const checkEmail = useServerFn(checkEmailExists);
  const checkBusiness = useServerFn(checkBusinessNameExists);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot_password" | "recovery_otp" | "update_password">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    if (verificationEmail && resendTimer > 0) {
      const timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [verificationEmail, resendTimer]);

  async function handleResendOtp() {
    if (resendTimer > 0) return;
    try {
      if (mode === "recovery_otp") {
        const { error } = await supabase.auth.resetPasswordForEmail(verificationEmail, {
          redirectTo: "https://studiodesk-rouge.vercel.app/auth",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: verificationEmail,
        });
        if (error) throw error;
      }
      toast.success("Verification code resent!");
      setResendTimer(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend code");
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) return; // Can be 6 or 8 digits depending on Supabase settings
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: otp,
        type: mode === "recovery_otp" ? "recovery" : "signup",
      });
      if (error) throw error;
      
      if (mode === "recovery_otp") {
        toast.success("Code verified! Please set a new password.");
        setVerificationEmail("");
        setMode("update_password");
        setOtp("");
      } else {
        toast.success("Email verified successfully!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setOtpLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      // Don't auto-redirect if we just clicked a recovery link
      if (data.user && !window.location.hash.includes("type=recovery")) {
        navigate({ to: "/dashboard" });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update_password");
        setVerificationEmail(""); // Close OTP screen if open
      } else if (event === "SIGNED_IN") {
        if (!window.location.hash.includes("type=recovery")) {
          navigate({ to: "/dashboard" });
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
        }
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google login failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot_password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://studiodesk-rouge.vercel.app/auth",
        });
        if (error) throw error;
        toast.success("Password reset instructions sent to your email.");
        setVerificationEmail(email);
        setMode("recovery_otp");
        setResendTimer(60);
        setLoading(false);
        return;
      }
      
      if (mode === "update_password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated successfully!");
        navigate({ to: "/dashboard" });
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { exists: emailExists, reason } = await checkEmail({ data: { email } });
        if (emailExists) {
          if (reason === "deactivated") {
            toast.error("This email is associated with a deactivated account. Please contact support.");
          } else {
            toast.error("An account with this email already exists");
          }
          setLoading(false);
          return;
        }

        if (business.trim()) {
          const { exists: businessExists } = await checkBusiness({
            data: { business_name: business },
          });
          if (businessExists) {
            toast.error("Studio / Business name already registered");
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://studiodesk-rouge.vercel.app",
            data: { full_name: name, business_name: business },
          },
        });
        if (error) throw error;

        // If email confirmation is enabled, session will be null and we need confirmation
        if (data && !data.session && data.user) {
          setVerificationEmail(email);
          setResendTimer(60);
          setLoading(false);
          return;
        }

        toast.success("Account created — welcome!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setVerificationEmail(email);
            setResendTimer(60);
            setLoading(false);
            return;
          }
          throw error;
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      
      // Supabase masks trigger exceptions with this generic message
      if (errorMessage.includes("Database error saving new user")) {
        toast.error("Sorry, you cannot create an account.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  if (verificationEmail) {
    return (
      <div className="min-h-[100dvh] bg-background md:bg-muted/30 flex flex-col items-center justify-center p-0 md:p-8 relative">
        <div className="w-full max-w-md bg-background md:bg-surface px-6 py-10 md:p-10 md:rounded-[2.5rem] md:shadow-2xl md:border border-border/50 mx-auto flex flex-col relative min-h-[100dvh] md:min-h-0">
        <button
          onClick={() => {
            setVerificationEmail("");
            setMode("signin");
            setEmail(verificationEmail);
          }}
          className="absolute top-8 left-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </button>

        <div className="flex flex-col text-center w-full my-auto">
          <div className="size-16 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto mb-6">
            <Mail className="size-8" />
          </div>
          <h1 className="font-display text-3xl leading-tight">Check your email</h1>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed mb-8">
            We have sent an 8-digit verification code to{" "}
            <strong className="text-foreground">{verificationEmail}</strong>. Please enter the code
            below to activate your account.
          </p>

          <form onSubmit={handleVerifyOtp} className="flex flex-col items-center gap-6 w-full">
            <InputOTP maxLength={8} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
                <InputOTPSlot index={6} />
                <InputOTPSlot index={7} />
              </InputOTPGroup>
            </InputOTP>

            <button
              type="submit"
              disabled={otpLoading || otp.length !== 8}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center shadow-[var(--shadow-pop)] disabled:opacity-60 cursor-pointer"
            >
              {otpLoading ? "Verifying…" : "Verify code"}
            </button>

            <div className="text-sm text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer font-medium"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
              </button>
            </div>
          </form>

          <p className="text-xs text-muted-foreground/85 mt-6 bg-surface/50 border border-border/60 rounded-2xl p-3 text-center">
            💡 <strong>Tip:</strong> If you don't see the email, please check your{" "}
            <strong>Spam</strong> or <strong>Junk</strong> folder.
          </p>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background md:bg-muted/30 flex flex-col items-center justify-center p-0 md:p-8 relative">
      <div className="w-full max-w-md bg-background md:bg-surface px-6 py-10 md:p-10 md:rounded-[2.5rem] md:shadow-2xl md:border border-border/50 mx-auto flex flex-col min-h-[100dvh] md:min-h-0">
        <div className="flex flex-col w-full my-auto">
        <div className="flex justify-center mb-6">
          <img
            src={logoImg}
            alt="StudioDesk"
            className="size-16 rounded-2xl shadow-[var(--shadow-pop)]"
          />
        </div>
        <h1 className="font-display text-4xl leading-tight text-center">
          {mode === "signup" ? "Start your creative studio." : mode === "forgot_password" ? "Reset password." : mode === "update_password" ? "New password." : "Welcome back."}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-center">
          {mode === "forgot_password" ? "Enter your email to receive recovery instructions." : mode === "update_password" ? "Secure your account with a new password." : "AI-grounded pricing and branded documents creation — built for creatives."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {mode === "signup" && (
            <>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                placeholder="Studio / Business name"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </>
          )}
          {mode !== "update_password" && (
            <input
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
          {(mode === "signin" || mode === "signup" || mode === "update_password") && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={mode === "update_password" ? "New Password" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 pl-4 pr-10 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          )}
          {mode === "signin" && (
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => setMode("forgot_password")}
                className="text-xs text-primary hover:underline cursor-pointer font-medium"
              >
                Forgot Password?
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center shadow-[var(--shadow-pop)] disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot_password" ? "Send Instructions" : mode === "update_password" ? "Update Password" : "Sign in"}
          </button>
        </form>

        {(mode === "signin" || mode === "signup") && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background md:bg-surface px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-12 rounded-full bg-background border border-border text-foreground font-medium flex items-center justify-center hover:bg-muted/50 transition-colors shadow-sm relative overflow-hidden"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Google
            </button>
          </>
        )}

        <div className="text-sm text-muted-foreground mt-6 text-center">
          {mode === "forgot_password" || mode === "update_password" ? (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="font-medium text-primary hover:underline cursor-pointer"
            >
              Return to sign in
            </button>
          ) : mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </div>
        </div>
        <p className="text-[11px] text-muted-foreground/70 text-center mt-8">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
