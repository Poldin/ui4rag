"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CleanupCookiesPage() {
  const router = useRouter();
  const [cleaned, setCleaned] = useState(false);

  useEffect(() => {
    // Ottieni tutti i cookie
    const cookies = document.cookie.split(';');
    
    let removedCount = 0;
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      
      // Rimuovi tutti i cookie Supabase vecchi
      // Tieni solo quelli che non sono del progetto corrente
      if (cookieName.startsWith('sb-') && cookieName.includes('-auth-token')) {
        // Rimuovi il cookie impostandolo con una data passata
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        removedCount++;
      }
    });
    
    console.log(`Rimossi ${removedCount} cookie Supabase vecchi`);
    setCleaned(true);
    
    // Redirect alla home dopo 2 secondi
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {cleaned ? "✅ Cookie puliti" : "🔄 Pulizia cookie..."}
        </h1>
        <p className="text-sm text-gray-600">
          {cleaned 
            ? "Tutti i cookie Supabase vecchi sono stati rimossi. Reindirizzamento alla home..."
            : "Rimozione dei cookie Supabase vecchi in corso..."}
        </p>
      </div>
    </div>
  );
}

