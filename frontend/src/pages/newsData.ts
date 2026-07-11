export interface NewsItem {
  title: string;
  date: string;
  category: string;
  image: string;
  excerpt: string;
  fullContent: string;
}

export const newsItems: NewsItem[] = [
  {
    title: 'Annual General Assembly Meeting 2024',
    date: 'Oct 24, 2024',
    category: 'Meeting',
    image: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/5d0b23a7-4b9c-4266-91a9-331f8e8c0065/membership-intro-f502bef2-1773668854940.webp',
    excerpt: 'Join us for the upcoming annual general meeting where we will discuss our yearly performance and dividends.',
    fullContent: 'The 2024 Annual General Assembly Meeting was a record-breaking success...'
  },
  {
    title: 'New Digital Loan Application Portal Launched',
    date: 'Sep 15, 2024',
    category: 'Product Update',
    image: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/5d0b23a7-4b9c-4266-91a9-331f8e8c0065/digital-services-3bcfae1e-1773668854174.webp',
    excerpt: 'We are excited to announce our new online portal for faster and more convenient loan applications.',
    fullContent: 'Our new Digital Loan Portal is now live...'
  },
  {
    title: 'New Branch Opening in Bole',
    date: 'Aug 30, 2024',
    category: 'Branch Notice',
    image: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/5d0b23a7-4b9c-4266-91a9-331f8e8c0065/cooperative-building-9cb297bc-1773668858665.webp',
    excerpt: 'To serve our members better, we have opened a new branch in the heart of Bole sub-city.',
    fullContent: 'Located in the vibrant heart of Bole...'
  },
  {
    title: 'Financial Literacy Workshop Series',
    date: 'July 12, 2024',
    category: 'Member Event',
    image: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/5d0b23a7-4b9c-4266-91a9-331f8e8c0065/hero-bg-e03d78b9-1773668860344.webp',
    excerpt: 'Empowering our members with the knowledge they need to make smart financial decisions.',
    fullContent: 'Our Financial Literacy Workshop Series...'
  }
];
