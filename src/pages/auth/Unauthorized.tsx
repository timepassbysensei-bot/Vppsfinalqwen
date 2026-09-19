import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Unauthorized() {
  const { session } = useAuth();
  return (
    <main className="grid min-h-screen place-items-center bg-offwhite px-4 py-10">
      <div className="card w-full max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-error" aria-hidden />
        <h1 className="mt-4 font-heading text-xl font-bold text-navy">Access restricted</h1>
        <p className="mt-2 text-sm text-muted">
          Your account doesn't have permission to view this page. If you believe this is a mistake, please contact the office.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="btn-outline">Home</Link>
          {session ? <Link to="/login" className="btn-primary">My Account</Link> : <Link to="/login" className="btn-primary">Sign In</Link>}
        </div>
      </div>
    </main>
  );
}
