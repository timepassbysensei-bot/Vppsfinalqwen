import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";

export default function VerifyEmail() {
  return (
    <main className="grid min-h-screen place-items-center bg-offwhite px-4 py-10">
      <div className="card w-full max-w-md p-8 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-success" aria-hidden />
        <h1 className="mt-4 font-heading text-xl font-bold text-navy">Verify your email</h1>
        <p className="mt-2 text-sm text-muted">
          We've sent a verification link to your email address. Please click it to activate your account, then sign in.
        </p>
        <Link to="/login" className="btn-primary mt-6">Back to Login</Link>
      </div>
    </main>
  );
}
