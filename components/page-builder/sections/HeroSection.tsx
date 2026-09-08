import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FolderOpen, Lightbulb, LogIn } from "lucide-react";
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
  const image =
    media?.url ??
    (home && section.layout !== "minimal"
      ? "https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-hero-workbench.jpg"
      : null);
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
            {home ? (
              <>
                <h1>
                  Oberlin
                  <br />
                  Engineering
                  <br />
                  <em>Club.</em>
                </h1>
                <h2>{section.headline}</h2>
              </>
            ) : (
              <h1>{section.headline}</h1>
            )}
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
      {home && (
        <nav className="shell club-shortcuts" aria-label="Get started">
          <Link href="/projects">
            <FolderOpen size={22} aria-hidden="true" />
            <span>Explore projects</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/get-involved?type=propose_project">
            <Lightbulb size={22} aria-hidden="true" />
            <span>Share a project idea</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/member/login">
            <LogIn size={22} aria-hidden="true" />
            <span>Member sign in</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </nav>
      )}
    </>
  );
}
