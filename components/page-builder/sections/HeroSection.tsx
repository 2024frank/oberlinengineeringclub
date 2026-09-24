import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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
    const image = media?.url && !media.url.includes("home-hero-workbench")
      ? media.url : "/brand/project-led/hardware-hero.webp";
    return <>
      <section className="studio-hero">
        <div className="shell studio-hero__grid">
          <div className="studio-hero__copy">
            <p className="studio-hero__kicker"><span>Student engineering</span><span>Oberlin College, Ohio</span></p>
            <h1>Oberlin<br/>Engineering Club<span aria-hidden="true">.</span></h1>
            <p className="studio-hero__lede">{publicCopy(section.body) || homeIntroduction}</p>
            <div className="studio-hero__actions">
              <Link className="button button--primary" href="/projects">Explore projects <ArrowRight size={18} aria-hidden="true"/></Link>
              <nav className="hero-member-links" aria-label="Get started">
                <Link href="/get-involved?type=propose_project">Share a project idea <ArrowUpRight size={16} aria-hidden="true"/></Link>
                <Link href="/member/login">Member sign in <ArrowUpRight size={16} aria-hidden="true"/></Link>
              </nav>
            </div>
          </div>
          <figure className="studio-hero__figure">
            <div className="studio-hero__frame"><Image className="studio-hero__image" src={image} alt={media?.url === image ? (section.imageAlt || media.alt || "") : ""} fill priority sizes="(max-width:900px) 100vw, 46vw"/></div>
            <figcaption><span>Fig. 01</span>On the bench</figcaption>
          </figure>
        </div>
      </section>
      <NextMeeting events={context?.events ?? []}/>
      <section className="home-steps" aria-label="How it works"><div className="shell"><ol>
        <li><Link href="/projects"><strong>Pick a project</strong></Link><p>Browse what teams are building and find one that fits your interests.</p></li>
        <li><Link href="/get-involved"><strong>Join the club</strong></Link><p>No engineering experience needed, and you don’t have to be in the 3-2 program.</p></li>
        <li><Link href="/member/login"><strong>Build with a team</strong></Link><p>Track tasks, meet teammates, and share progress from your member account.</p></li>
      </ol></div></section>
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
