import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, MoveLeft } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePageTitle } from '@/hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Not found');
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl py-10">
      <EmptyState
        icon={Compass}
        title="This page drifted off the map"
        description="The link may be old, or the collection was removed. Your music is still exactly where you left it."
        action={
          <>
            <Link to="/" className="btn btn-primary">
              <Home className="size-4" aria-hidden />
              Back home
            </Link>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-glass">
              <MoveLeft className="size-4" aria-hidden />
              Go back
            </button>
          </>
        }
      />
    </div>
  );
}
