import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'approved' | 'blocked'>('loading');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const u = await client.auth.me();
        if (!u?.data) {
          navigate('/');
          return;
        }

        // Check approval status
        const approvalRes = await client.apiCall.invoke({
          url: '/api/v1/admin/approval-status',
          method: 'GET',
        });

        if (approvalRes?.data) {
          const s = approvalRes.data.status;
          if (s === 'pending' || s === 'rejected') {
            navigate('/pending-approval');
            return;
          }
        }

        setStatus('approved');
      } catch {
        // If check fails, allow access (don't block existing users)
        setStatus('approved');
      }
    };
    checkAccess();
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === 'blocked') {
    return null;
  }

  return <>{children}</>;
}