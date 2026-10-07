import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';

interface Profile {
  id: number;
  user_id: string;
  role: string;
  company_name: string;
  display_name?: string;
  company_id?: number | null;
  member_role?: string | null;
}

interface ApprovalStatus {
  status: string; // 'approved' | 'pending' | 'rejected' | 'no_profile' | 'no_company'
  company_name?: string | null;
  company_id?: number | null;
}

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await client.auth.me();
        if (!u?.data) {
          navigate('/');
          return;
        }
        setUser(u);

        // Load profile
        try {
          const profileRes = await client.apiCall.invoke({
            url: '/api/v1/profile/me',
            method: 'GET',
          });
          if (profileRes?.data) {
            setProfile(profileRes.data);
          } else {
            // No profile — redirect to onboarding
            navigate('/onboarding');
            return;
          }
        } catch {
          // Profile fetch failed — redirect to onboarding
          navigate('/onboarding');
          return;
        }

        // Check approval status
        try {
          const approvalRes = await client.apiCall.invoke({
            url: '/api/v1/admin/approval-status',
            method: 'GET',
          });
          if (approvalRes?.data) {
            setApprovalStatus(approvalRes.data);
          }
        } catch {
          // If approval check fails, default to approved (don't block existing users)
          setApprovalStatus({ status: 'approved' });
        }

        // Check if user is admin
        try {
          const adminRes = await client.apiCall.invoke({
            url: '/api/v1/admin/is-admin',
            method: 'GET',
          });
          if (adminRes?.data?.is_admin) {
            setIsAdmin(true);
          }
        } catch {
          // Not admin
        }
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLogout = () => navigate('/');

  return { user, profile, approvalStatus, isAdmin, loading, handleLogout };
}