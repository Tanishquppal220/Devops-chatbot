/** Dark / Light theme toggle using DaisyUI themes. */

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDark]);

  return (
    <label
      id="theme-toggle"
      className="swap swap-rotate btn btn-ghost btn-circle btn-sm"
      aria-label="Toggle theme"
    >
      <input
        type="checkbox"
        checked={!isDark}
        onChange={() => setIsDark((d) => !d)}
      />
      {/* Sun icon — shown when dark mode is active (click to switch to light) */}
      <Sun className="swap-off size-5 text-amber-400" />
      {/* Moon icon — shown when light mode is active (click to switch to dark) */}
      <Moon className="swap-on size-5 text-indigo-500" />
    </label>
  );
}
