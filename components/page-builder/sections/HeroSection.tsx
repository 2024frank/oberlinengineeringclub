import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NextMeeting } from "@/components/public/NextMeeting";
import { homeIntroduction, publicCopy } from "@/lib/content/publicCopy";
import type { z } from "zod";
import type { heroSchema } from "@/lib/page-builder/schemas/hero";
import type { PageRenderContext } from "@/lib/page-builder/types";
export function HeroSection({
  section,
  context,
}: {
  section: z.infer<typeof heroSchema>;
  context?: PageRenderContext;
}) {
  const media = section.imageId ? context?.media?.[section.imageId] : undefined;
  const home = context?.pageSlug === "home";
  if (home) {
    // The workbench photograph the club chose for the homepage, unless an officer sets another.
    const image = media?.url ?? "https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-hero-workbench.jpg";
    return <>
      <section className="photo-hero">
        <Image className="photo-hero__image" src={image} alt={section.imageAlt || media?.alt || ""} fill priority sizes="100vw"/>
        <div className="shell photo-hero__inner">
          <h1>Oberlin<br/>Engineering Club<span aria-hidden="true">.</span></h1>
          <div className="photo-hero__aside">
            <p>{publicCopy(section.body) || homeIntroduction}</p>
            <Link className="button button--light" href="/projects">Explore projects <ArrowRight size={18} aria-hidden="true"/></Link>
            <nav className="hero-member-links" aria-label="Get started">
              <Link href="/get-involved?type=propose_project">Share a project idea</Link>
              <Link href="/member/login">Member sign in</Link>
            </nav>
          </div>
        </div>
      </section>
      <NextMeeting events={context?.events ?? []}/>
    </>;
  }
  const image = media?.url;
  return (
    <>
      <section className={image ? "home-hero" : "editorial-hero"}>
        {image && (
          <Image
            className="home-hero__image"
            src={image}
            alt={section.imageAlt || media?.alt || ""}
            fill
            priority
            sizes="100vw"
          />
        )}
        <div className="shell">
          <div className="hero-copy">
            {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
            <h1>{section.headline}</h1>
            <p>{section.body}</p>
            <div className="button-row">
              {section.primaryCta && (
                <Link
                  className="button button--primary"
                  href={section.primaryCta.href}
                >
                  {section.primaryCta.label}
                  <ArrowRight size={18} />
                </Link>
              )}
              {section.secondaryCta && (
                <Link
                  className="hero-secondary"
                  href={section.secondaryCta.href}
                >
                  {section.secondaryCta.label}
                  <ArrowRight size={17} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
