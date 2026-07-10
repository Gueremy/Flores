export function IspIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20v-8" />
      <path d="M8 20h8" />
      <path d="M4.5 10.5a10 10 0 0 0 15 0" />
      <path d="M7 7.5a6 6 0 0 0 10 0" />
      <path d="M9.5 5a3 3 0 0 0 5 0" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function RouterIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="20" height="8" rx="2" />
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
      <path d="M15 10c1.1 0 2 .9 2 2s-.9 2-2 2" />
      <path d="M15 7c2.76 0 5 2.24 5 5s-2.24 5-5 5" />
    </svg>
  );
}

export function SwitchIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <rect x="5" y="10" width="2" height="4" fill="currentColor" stroke="none" />
      <rect x="9" y="10" width="2" height="4" fill="currentColor" stroke="none" />
      <rect x="13" y="10" width="2" height="4" fill="currentColor" stroke="none" />
      <rect x="17" y="10" width="2" height="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AntennaIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20v-7" />
      <path d="M8 21h8" />
      <path d="M6.5 8a7 7 0 0 0 11 0" />
      <path d="M4 5.5a11 11 0 0 0 16 0" />
      <circle cx="12" cy="13" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function ClientIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}
