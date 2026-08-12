import React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Download, 
  BookOpen, 
  FileCheck, 
  ShieldAlert 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchPublicDownloads, resolvePublicAssetUrl, type PublicDownloadCategory } from '@/lib/publicContentApi';
import PublicServiceNotice from '@/components/PublicServiceNotice';
import BannerAnnouncements from '@/components/public/BannerAnnouncements';
import { usePublicUiI18n } from '@/lib/uiI18n';

export default function Downloads() {
  const { tPublic } = usePublicUiI18n();
  const [categories, setCategories] = useState<Array<{ title: string; files: Array<{ name: string; size: string; type: string; link: string }> }>>([]);
  const [isCmsUnavailable, setIsCmsUnavailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadDownloads = async () => {
      try {
        const cmsCategories: PublicDownloadCategory[] = await fetchPublicDownloads();
        if (!mounted || cmsCategories.length === 0) return;

        setIsCmsUnavailable(false);

        const categoryMap = new Map<string, { title: string; files: Array<{ name: string; size: string; type: string; link: string }> }>();
        for (const category of cmsCategories) {
          const normalizedTitle = category.title.trim();
          const key = normalizedTitle.toLowerCase();
          const existing = categoryMap.get(key) || { title: normalizedTitle, files: [] };

          const seenFiles = new Set(existing.files.map((file) => `${file.name.toLowerCase()}|${file.link}`));
          for (const file of category.files) {
            const resolvedLink = resolvePublicAssetUrl(file.link);
            const fileKey = `${file.name.trim().toLowerCase()}|${resolvedLink}`;
            if (seenFiles.has(fileKey)) continue;
            seenFiles.add(fileKey);
            existing.files.push({
              name: file.name,
              size: file.size,
              type: file.type,
              link: resolvedLink,
            });
          }

          categoryMap.set(key, existing);
        }

        setCategories(Array.from(categoryMap.values()));
      } catch {
        if (mounted) setIsCmsUnavailable(true);
      }
    };

    void loadDownloads();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="animate-in fade-in duration-500 py-16 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{tPublic('downloadsHeroTitle', 'Resource Center & Downloads')}</h1>
          <p className="text-lg text-gray-600">
            {tPublic('downloadsHeroDescription', 'Access essential forms, institutional policies, financial reports, and regulatory guidelines. All documents are securely maintained and updated regularly.')}
          </p>
        </div>

        {isCmsUnavailable ? (
          <div className="mx-auto mb-8 max-w-3xl">
            <PublicServiceNotice message={tPublic('downloadsCmsUnavailableNotice', 'Download services are temporarily unavailable. Please try again later.')} />
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-8">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-gray-200">
                <CardHeader className="bg-white border-b border-gray-100 rounded-t-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100">
                    {category.files.map((file, idx) => (
                      <li key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.type} • {file.size}
                            </p>
                          </div>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          <a href={file.link} download={file.name} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          {tPublic('download', 'Download')}
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <BannerAnnouncements placement="Downloads Banner" />

      </div>
    </div>
  );
}
