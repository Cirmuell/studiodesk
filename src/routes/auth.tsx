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
          redirectTo: window.location.origin + "/auth",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot_password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth",
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
        const { exists: emailExists } = await checkEmail({ data: { email } });
        if (emailExists) {
          toast.error("multiple registration not allowed");
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
