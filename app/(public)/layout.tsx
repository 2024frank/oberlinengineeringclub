import { OrganizationSchema } from '@/components/public/OrganizationSchema'
import { getPublishedNavigation, getPublicSiteSettings } from '@/lib/page-builder/publicPages'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { AnnouncementBanner } from '@/components/public/AnnouncementBanner'
import './professional.css'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [navigation, settings] = await Promise.all([getPublishedNavigation(), getPublicSiteSettings()])
  return <div className="professional-site">
    <OrganizationSchema siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oberlin32engineeringsociety.com'} contactEmail={settings.contact.email} socialLinks={settings.social}/>
    <PublicHeader items={navigation} logoSrc={settings.brand.badgeUrl}/>
    <AnnouncementBanner announcement={settings.announcement}/>
    <main id="main-content" tabIndex={-1}>{children}</main>
    <PublicFooter contactEmail={settings.contact.email} footerText={settings.footer.text} socialLinks={settings.social} badgeSrc={settings.brand.badgeUrl}/>
  </div>
}
