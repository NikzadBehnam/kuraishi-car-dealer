"use client";

import { toast } from "sonner";
import { Building2, Mail, Save } from "lucide-react";

import type { siteConfig } from "@/config/site.config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SiteConfig = typeof siteConfig;

const settingsTabClassName =
  "min-h-9 flex-1 basis-[8.5rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

export function SettingsPanel({ site }: { site: SiteConfig }) {
  return (
    <div className="grid min-w-0 gap-4">
      <Tabs defaultValue="dealership">
        <div className="min-w-0 rounded-[var(--radius-sm)] border bg-surface p-2">
          <TabsList className="flex h-auto min-h-0 w-full flex-wrap items-stretch justify-start gap-1 bg-transparent p-0">
            <TabsTrigger className={settingsTabClassName} value="dealership">
              Dealership
            </TabsTrigger>
            <TabsTrigger className={settingsTabClassName} value="contact">
              Contact
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dealership">
          <SettingsSection
            icon={Building2}
            title="Dealership"
            description="Public identity values for the dealership brand."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Legal name">
                <Input defaultValue={site.name} />
              </Field>
              <Field label="Short name">
                <Input defaultValue={site.shortName} />
              </Field>
              <Field label="Tagline">
                <Input defaultValue={site.tagline} />
              </Field>
              <Field label="Website URL">
                <Input defaultValue={site.url} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea rows={5} defaultValue={site.description} />
              </Field>
            </div>
            <SaveBar label="Save dealership settings" />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="contact">
          <SettingsSection
            icon={Mail}
            title="Contact"
            description="Contact channels and address information shown across the UI."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Phone">
                <Input defaultValue={site.contact.phone} />
              </Field>
              <Field label="Email">
                <Input defaultValue={site.contact.email} />
              </Field>
              <Field label="Street">
                <Input defaultValue={site.address.street} />
              </Field>
              <Field label="Postal code">
                <Input defaultValue={site.address.postalCode} />
              </Field>
              <Field label="City">
                <Input defaultValue={site.address.city} />
              </Field>
              <Field label="Country">
                <Input defaultValue={site.address.country} />
              </Field>
              <Field label="Map URL" className="md:col-span-2">
                <Input defaultValue={site.mapUrl} />
              </Field>
            </div>
            <SaveBar label="Save contact settings" />
          </SettingsSection>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
        <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Separator className="my-4" />
      {children}
    </Card>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <Label>{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SaveBar({ label }: { label: string }) {
  return (
    <div className="mt-5 flex flex-col border-t pt-4 sm:items-end">
      <Button
        type="button"
        variant="accent"
        className="w-full max-w-full whitespace-normal rounded-[var(--radius-sm)] text-center sm:w-auto sm:whitespace-nowrap"
        onClick={() => toast.success(`${label} is UI-only.`)}
      >
        <Save />
        {label}
      </Button>
    </div>
  );
}
