'use client'

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { observer } from 'mobx-react-lite';
import { getGlobalSettings, isSetupCompleted } from "@/lib/supabase/settings";
import { useUserStore } from "@/stores";
import { Loader2 } from 'lucide-react';

const HomePageContent = observer(() => {
  const router = useRouter();
  const userStore = useUserStore();
  const [settings, setSettings] = useState({
    instanceName: 'Zocalo Instance',
    instanceDomain: '',
    allowPublicSignup: true,
    requireEmailConfirmation: true,
    setupCompleted: false
  });
  const [setupComplete, setSetupComplete] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Check session and load settings on mount
  useEffect(() => {
    const initializePage = async () => {
      // Check session first
      await userStore.checkSession();
      
      // If user is authenticated, redirect to dashboard
      if (userStore.isAuthenticated) {
        router.push('/dashboard');
        return;
      }

      // Load settings for non-authenticated users
      try {
        const globalSettings = await getGlobalSettings();
        const setupCompleted = await isSetupCompleted();
        setSettings(globalSettings);
        setSetupComplete(setupCompleted);
      } catch (error) {
        // If settings can't be fetched, use defaults
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    initializePage();
  }, [userStore, router]);

  // Show loading while checking authentication and settings
  if (userStore.isLoading || isLoadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, don't render the page content (redirect is in progress)
  if (userStore.isAuthenticated) {
    return null;
  }

  const { instanceName, allowPublicSignup } = settings;

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        
        {/* Orange Zocalo Logo */}
        <div className="mx-auto sm:mx-0">
          <div className="text-6xl font-bold text-orange-500 mb-8">
            zocalo
          </div>
        </div>
        
        <div className="text-center sm:text-left">
          <h1 className="text-5xl font-bold">Welcome to {instanceName}</h1>
          <p className="mt-6 text-xl">
            Zocalo is an open-source community platform where you can:
          </p>
          <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Host discussions and chats</li>
            <li>Share content, links, documents</li>
            <li>Create custom rules and voting systems</li>
            <li>Build their own community spaces</li>
          </ul>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          {!setupComplete ? (
            <Link
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-orange-500 text-white gap-2 hover:bg-orange-600 font-semibold text-sm sm:text-base h-12 px-6 shadow-md hover:shadow-lg"
              href="/setup"
            >
              Start Setup
            </Link>
          ) : (
            <>
              <Link
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-orange-500 text-white gap-2 hover:bg-orange-600 font-semibold text-sm sm:text-base h-12 px-6 shadow-md hover:shadow-lg"
                href="/auth/login"
              >
                Sign In
              </Link>
              {allowPublicSignup && (
                <Link
                  className="rounded-full border border-solid border-orange-300 text-orange-600 transition-colors flex items-center justify-center hover:bg-orange-50 hover:border-orange-400 font-medium text-sm sm:text-base h-12 px-6"
                  href="/auth/signup"
                >
                  Sign Up
                </Link>
              )}
            </>
          )}
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-12 px-6"
            href="https://we-free.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn More
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://we-free.org/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Documentation
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/We-free/zocalo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          GitHub
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://we-free.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to we-free.org →
        </a>
      </footer>
    </div>
  );
});

export default function Home() {
  return <HomePageContent />;
}
