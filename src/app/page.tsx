import Image from "next/image";
import Link from "next/link";
import { getGlobalSettings } from "@/lib/supabase/settings";

export default async function Home() {
  let settings;
  try {
    settings = await getGlobalSettings();
  } catch (error) {
    // If settings can't be fetched, assume setup not completed
    settings = {
      instanceName: 'Zocalo Instance',
      instanceDomain: '',
      allowPublicSignup: true,
      requireEmailConfirmation: true,
      setupCompleted: false
    };
  }

  const { instanceName, allowPublicSignup, setupCompleted } = settings;

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        
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
          {!setupCompleted ? (
            <Link
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="/setup"
            >
              Start now
            </Link>
          ) : (
            <>
              <Link
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                href="/login"
              >
                Login
              </Link>
              {allowPublicSignup && (
                <Link
                  className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
                  href="/signup"
                >
                  Sign Up
                </Link>
              )}
            </>
          )}
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our blog
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
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
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
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
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
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
}
