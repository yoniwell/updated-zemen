import { Hero } from '@/components/home/Hero';
import { TrustIntro } from '@/components/home/TrustIntro';
import { Services } from '@/components/home/Services';
import { Process } from '@/components/home/Process';
import { Portals } from '@/components/home/Portals';
import { Requirements } from '@/components/home/Requirements';
import { News } from '@/components/home/News';
import { CTA } from '@/components/home/CTA';

export default function Home() {
  return (
    <>
      <Hero />
      <Portals />
      <TrustIntro />
      <Services />
      <Process />
      <Requirements />
      <News />
      <CTA />
    </>
  );
}
