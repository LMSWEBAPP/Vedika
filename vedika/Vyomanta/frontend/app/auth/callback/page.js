// app/auth/callback/page.js
"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { T } from '@/lib/lms-data';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Verifying your Google session...');
  const [error, setError] = useState('');

  useEffect(() => {
    async function verifyAndFetchUser() {
      try {
        const frappeUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || 'https://vyomanta.onrender.com';
        
        // Retrieve sid from search parameters if present (passed via redirect URL parameter)
        let sid = searchParams.get('sid');
        if (sid) {
          localStorage.setItem('frappe_sid', sid);
        } else {
          sid = localStorage.getItem('frappe_sid');
        }
        
        // Fetch logged-in user email from backend
        // We append the sid query parameter to bypass cross-site cookie restrictions
        const fetchUrl = sid 
          ? `${frappeUrl}/api/method/frappe.auth.get_logged_user?sid=${encodeURIComponent(sid)}`
          : `${frappeUrl}/api/method/frappe.auth.get_logged_user`;
          
        const emailRes = await fetch(fetchUrl, {
          credentials: 'include'
        });
        
        if (!emailRes.ok) {
          throw new Error('OAuth authentication failed');
        }
        
        const emailData = await emailRes.json();
        const email = emailData.message;
        
        if (!email || email === 'Guest') {
          throw new Error('No active session found');
        }
        
        setStatus('Retrieving student profile details...');
        
        // Fetch User Doc details
        const userFetchUrl = sid
          ? `${frappeUrl}/api/resource/User/${encodeURIComponent(email)}?sid=${encodeURIComponent(sid)}`
          : `${frappeUrl}/api/resource/User/${encodeURIComponent(email)}`;
          
        const userRes = await fetch(userFetchUrl, {
          credentials: 'include'
        });
        
        if (!userRes.ok) {
          throw new Error('Failed to load user profile');
        }
        
        const userData = await userRes.json();
        const userDoc = userData.data;
        
        // Google OAuth logins are treated as students; admin page is reserved for password-based admin login
        const role = 'Student';
        
        const userProfile = {
          email: userDoc.email,
          username: userDoc.email,
          name: userDoc.full_name || `${userDoc.first_name || ''} ${userDoc.last_name || ''}`.trim() || userDoc.email,
          role
        };
        
        setStatus('Synchronizing course progress...');
        
        // Fetch student completions from Redis database
        try {
          const progressRes = await fetch(`/api/progress?email=${encodeURIComponent(userProfile.email)}`);
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            const completed = progressData.completed || {};
            // Store completions in localStorage
            localStorage.setItem(`completed_lessons_${userProfile.email}`, JSON.stringify(completed));
          }
        } catch (e) {
          console.error("Failed to sync progress on callback", e);
        }
        
        // Save user profile to local storage
        localStorage.setItem('frappe_user', JSON.stringify(userProfile));
        
        setStatus('Welcome! Redirecting to workspace...');
        
        // Redirect to student workspace
        setTimeout(() => {
          router.replace('/');
        }, 800);
        
      } catch (err) {
        console.error("Callback authentication error:", err);
        setError(err.message || 'Verification failed. Please try again.');
        setTimeout(() => {
          router.replace('/login?error=oauth_failed');
        }, 3000);
      }
    }
    
    verifyAndFetchUser();
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #0F132A 0%, #07080F 100%)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-outfit), sans-serif',
      color: '#DDE3F2'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: T.s1 || 'rgba(255,255,255,0.02)',
        border: `1px solid ${T.border || 'rgba(255,255,255,0.05)'}`,
        borderRadius: 16,
        padding: '40px 32px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(135deg, ${T.accent || '#5B8CF8'} 0%, ${T.purple || '#9B6EF8'} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(91, 140, 248, 0.2)'
        }}>
          <GraduationCap size={28} color="#fff" />
        </div>
        
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Google Sign-In</h3>
          <p style={{ fontSize: 13.5, color: error ? (T.red || '#F55B6B') : (T.muted || '#647298'), margin: 0, lineHeight: 1.5 }}>
            {error ? error : status}
          </p>
        </div>
        
        {!error && (
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: T.accent || '#5B8CF8',
            animation: 'spin 1s linear infinite'
          }} />
        )}
      </div>
    </div>
  );
}