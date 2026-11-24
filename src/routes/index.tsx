import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import { AuraApp } from "@/components/aura/AuraApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AuraBot AI · Booking concierge for Glow Beauty Lounge" },
      {
        name: "description",
        content:
          "A prototype WhatsApp and Instagram booking assistant for a boutique salon: no overlaps, waitlist refills, deposits and staff escalations.",
      },
      { property: "og:title", content: "AuraBot AI · Your glow, always on time" },
      {
        property: "og:description",
        content: "Prototype salon booking concierge with a client chat and a live staff dashboard. Example data only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <p className="font-display text-3xl text-muted-foreground">AuraBot AI is getting ready…</p>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <AuraApp />
    </ClientOnly>
  );
}
