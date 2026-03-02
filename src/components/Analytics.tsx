import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function Analytics() {
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('google_analytics_code, google_analytics_enabled')
          .maybeSingle();

        if (error) {
          console.error('Error loading analytics settings:', error);
          return;
        }

        if (!data || !data.google_analytics_enabled || !data.google_analytics_code) {
          return;
        }

        const code = data.google_analytics_code.trim();

        if (code.startsWith('G-')) {
          const measurementId = code;

          const script1 = document.createElement('script');
          script1.async = true;
          script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
          document.head.appendChild(script1);

          const script2 = document.createElement('script');
          script2.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `;
          document.head.appendChild(script2);

          console.log('Google Analytics loaded:', measurementId);
        } else if (code.includes('gtag') || code.includes('analytics')) {
          const scriptContainer = document.createElement('div');
          scriptContainer.innerHTML = code;

          const scripts = scriptContainer.querySelectorAll('script');
          scripts.forEach((oldScript) => {
            const newScript = document.createElement('script');

            if (oldScript.src) {
              newScript.src = oldScript.src;
              if (oldScript.async) newScript.async = true;
              if (oldScript.defer) newScript.defer = true;
            }

            if (oldScript.innerHTML) {
              newScript.innerHTML = oldScript.innerHTML;
            }

            document.head.appendChild(newScript);
          });

          console.log('Google Analytics custom code loaded');
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    };

    loadAnalytics();
  }, []);

  return null;
}
