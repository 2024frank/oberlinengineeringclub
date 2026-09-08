import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Lightbulb, LogIn } from "lucide-react";
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
      <section className="project-home-hero">
        <Image className="project-home-hero__image" src={image} alt={media?.url === image ? (section.imageAlt || media.alt || "") : ""} fill priority sizes="100vw"/>
        <div className="shell project-home-hero__inner">
          <div className="project-home-hero__copy">
            <h1>Oberlin<br/>Engineering Club<span aria-hidden="true">.</span></h1>
            <p>{publicCopy(section.body) || homeIntroduction}</p>
            <Link className="button button--light" href="/projects">Explore projects <ArrowRight size={20} aria-hidden="true"/></Link>
          </div>
          <nav className="hero-member-links" aria-label="Get started">
            <Link href="/get-involved?type=propose_project"><Lightbulb size={17} aria-hidden="true"/>Share a project idea <ArrowRight size={17} aria-hidden="true"/></Link>
            <Link href="/member/login"><LogIn size={17} aria-hidden="true"/>Member sign in <ArrowRight size={17} aria-hidden="true"/></Link>
          </nav>
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
