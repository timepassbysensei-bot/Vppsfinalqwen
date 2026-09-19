import { Link } from "react-router-dom";
import Seo from "@/components/site/Seo";

export default function NotFound() {
  return (
    <>
      <Seo title="Page Not Found" noindex />
      <section className="container-app flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-heading text-6xl font-extrabold text-navy-200" aria-hidden>404</p>
        <h1 className="mt-4 font-heading text-2xl font-bold text-navy">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          The page you're looking for doesn't exist or may have moved. Try the navigation above, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">Back to Home</Link>
          <Link to="/courses" className="btn-outline">View Courses</Link>
        </div>
      </section>
    </>
  );
}
