import { useEffect, useMemo, useState } from 'react';
import { fetchPublicAnnouncements } from '../../lib/publicContentApi';

type Announcement = {
  id: string;
  title: string;
  content: string;
  placement: string;
  status?: string;
  startDate: string;
  endDate?: string | null;
};

type BannerAnnouncementsProps = {
  placement: 'Banner Top' | 'Homepage Above News' | 'Downloads Banner' | 'Loans Banner' | 'Banner Bottom';
};

function isActive(announcement: Announcement) {
  const now = Date.now();
  const start = new Date(announcement.startDate).getTime();
  const end = announcement.endDate ? new Date(announcement.endDate).getTime() : Infinity;
  return start <= now && now <= end;
}

export default function BannerAnnouncements({ placement }: BannerAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    let mounted = true;

    void fetchPublicAnnouncements().then((items) => {
      if (!mounted || !items) return;

      const filtered = (items as Announcement[])
        .filter((item) => item.placement === placement && isActive(item))
        .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());

      setAnnouncements(filtered);
    });

    return () => {
      mounted = false;
    };
  }, [placement]);

  const announcement = useMemo(() => announcements[0], [announcements]);

  const isBottom = placement === 'Banner Bottom';
  const isCompact = placement === 'Homepage Above News';

  const fallbackBottom: Announcement = {
    id: 'fallback-bottom',
    title: 'Welcome to Zemen Digital Trust',
    content: '<p>Become a member today. <a href="/membership" class="underline">Learn more</a></p>',
    placement: 'Banner Bottom',
    startDate: new Date().toISOString(),
    endDate: null,
  };

  const effectiveAnnouncement = announcement ?? (isBottom ? fallbackBottom : null);

  if (!effectiveAnnouncement) return null;

  if (isBottom) {
    return (
      <section aria-label={`${placement} announcement`} className="w-full overflow-x-hidden">
        <div className="container mx-auto px-6">
          <div className="relative z-10 w-full border-t border-white/10 bg-blue-950/80 p-6 backdrop-blur-xl md:p-10 lg:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="max-w-2xl text-center lg:text-left">
                <h2 className="mb-3 text-2xl font-black uppercase italic tracking-tight text-white md:text-2xl lg:text-3xl">Zemen Announcement</h2>
                <div className="text-sm font-semibold italic text-blue-100/85" dangerouslySetInnerHTML={{ __html: effectiveAnnouncement.content }} />
              </div>

              {/* Keep an empty actions area for layout parity with CTA */}
              <div className="w-full lg:w-auto" />
            </div>

            <div className="relative mt-6 h-[2px] w-full overflow-hidden bg-white/10 md:mt-8">
              <div className="absolute inset-0 w-1/4 bg-blue-600 transition-all duration-[3000ms]" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={`${placement} announcement`}
      className={['w-full border-y overflow-x-hidden', isCompact ? 'border-blue-100 bg-blue-50 text-blue-950' : 'border-sky-200 bg-sky-600 text-white'].join(' ')}
    >
      <div className={[
        'container mx-auto flex w-full max-w-7xl flex-col gap-1 px-6',
        isCompact ? 'py-4' : 'py-3',
      ].join(' ')}>
        {placement !== 'Banner Top' && (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">
            {placement.replace(/banner/i, '').trim()}
          </p>
        )}
        <h2 className={isCompact ? 'text-base font-semibold' : 'text-sm font-semibold sm:text-base'}>{effectiveAnnouncement.title}</h2>
        <div
          className={isCompact ? 'text-sm leading-6 text-blue-900 break-words max-w-full' : 'text-sm leading-6 opacity-95 break-words max-w-full'}
          dangerouslySetInnerHTML={{ __html: effectiveAnnouncement.content }}
        />
      </div>
    </section>
  );
}
