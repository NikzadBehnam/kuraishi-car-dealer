"use client";

import { toast } from "sonner";
import {
  Bell,
  Building2,
  Clock3,
  Eye,
  FileText,
  Mail,
  Moon,
  Palette,
  Save,
  Sun,
} from "lucide-react";

import type { siteConfig } from "@/config/site.config";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SiteConfig = typeof siteConfig;

const settingsTabClassName =
  "min-h-9 flex-1 basis-[8.5rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

export function SettingsPanel({ site }: { site: SiteConfig }) {
  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              UI-only dealership and admin preferences. Values are prefilled
              from site config and are not persisted.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-[var(--radius-sm)] sm:w-auto"
            onClick={() => toast.info("Settings export is UI-only.")}
          >
            <FileText />
            Export
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="dealership">
        <div className="min-w-0 rounded-[var(--radius-sm)] border bg-surface p-2">
          <TabsList className="flex h-auto min-h-0 w-full flex-wrap items-stretch justify-start gap-1 bg-transparent p-0">
            <TabsTrigger className={settingsTabClassName} value="dealership">
              Dealership
            </TabsTrigger>
            <TabsTrigger className={settingsTabClassName} value="contact">
              Contact
            </TabsTrigger>
            <TabsTrigger className={settingsTabClassName} value="hours">
              Opening hours
            </TabsTrigger>
            <TabsTrigger
              className={settingsTabClassName}
              value="notifications"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger className={settingsTabClassName} value="appearance">
              Appearance
            </TabsTrigger>
            <TabsTrigger className={settingsTabClassName} value="legal">
              Legal placeholders
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

        <TabsContent value="hours">
          <SettingsSection
            icon={Clock3}
            title="Opening hours"
            description="Mock opening-hours editor for future structured hours."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              {site.openingHours.map((item, index) => (
                <Field key={item} label={`Opening rule ${index + 1}`}>
                  <Input defaultValue={item} />
                </Field>
              ))}
              <Field label="Holiday notice">
                <Input defaultValue="By appointment outside regular hours" />
              </Field>
              <Field label="Appointment buffer">
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
              <SwitchRow
                label="Allow same-day appointments"
                description="Controls future booking availability."
                defaultChecked
              />
              <SwitchRow
                label="Show weekend availability"
                description="Display Saturday hours in public surfaces."
                defaultChecked
              />
            </div>
            <SaveBar label="Save opening hours" />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="notifications">
          <SettingsSection
            icon={Bell}
            title="Notifications"
            description="Mock delivery preferences for future lead and inventory alerts."
          >
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <SwitchRow
                label="New lead alerts"
                description="Notify staff when a new lead enters the inbox."
                defaultChecked
              />
              <SwitchRow
                label="Appointment reminders"
                description="Send reminders before scheduled appointments."
                defaultChecked
              />
              <SwitchRow
                label="Inventory status changes"
                description="Notify admins when vehicles are sold, reserved, or archived."
                defaultChecked
              />
              <SwitchRow
                label="Weekly performance digest"
                description="Summarize leads, views, and vehicle status changes."
              />
            </div>
            <Separator className="my-4" />
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Notification email">
                <Input defaultValue={site.contact.email} />
              </Field>
              <Field label="Digest day">
                <Select defaultValue="monday">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <SaveBar label="Save notification settings" />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="appearance">
          <SettingsSection
            icon={Palette}
            title="Appearance"
            description="Visual preferences aligned with the current dark mode system."
          >
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="grid min-w-0 gap-3">
                <SwitchRow
                  label="Compact admin tables"
                  description="Use denser row spacing in operational views."
                  defaultChecked
                />
                <SwitchRow
                  label="Reduce decorative motion"
                  description="Keep transitions subtle in admin workflows."
                />
                <SwitchRow
                  label="Show dashboard trend colors"
                  description="Use success, warning, and info color indicators."
                  defaultChecked
                />
              </div>
              <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold">Theme</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Uses the existing app theme provider.
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
                <Separator className="my-4" />
                <div className="grid gap-2">
                  <AppearanceChoice Icon={Sun} label="Light mode" />
                  <AppearanceChoice Icon={Moon} label="Dark mode" />
                  <AppearanceChoice Icon={Eye} label="System preference" />
                </div>
              </Card>
            </div>
            <SaveBar label="Save appearance settings" />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="legal">
          <SettingsSection
            icon={FileText}
            title="Legal placeholders"
            description="Placeholder controls only. Legal content must be reviewed before production."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <CheckboxRow
                label="Show legal placeholder banner"
                description="Keep internal warning visible until reviewed."
                defaultChecked
              />
              <CheckboxRow
                label="Require legal review before publish"
                description="Future guard for production content workflows."
                defaultChecked
              />
              <Field label="Legal owner">
                <Input defaultValue="Not assigned" />
              </Field>
              <Field label="Review status">
                <Select defaultValue="placeholder">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">Placeholder</SelectItem>
                    <SelectItem value="in-review">In review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Internal legal note" className="md:col-span-2">
                <Textarea
                  rows={5}
                  defaultValue="All legal pages are UI placeholders and must be replaced before production."
                />
              </Field>
            </div>
            <SaveBar label="Save legal placeholder settings" />
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

function SwitchRow({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-24 min-w-0 items-start justify-between gap-4 rounded-[var(--radius-sm)] border bg-background p-4">
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
      <Switch className="shrink-0" defaultChecked={defaultChecked} />
    </label>
  );
}

function CheckboxRow({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-24 min-w-0 items-start gap-3 rounded-[var(--radius-sm)] border bg-background p-4">
      <Checkbox defaultChecked={defaultChecked} className="mt-1 shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

function AppearanceChoice({
  Icon,
  label,
}: {
  Icon: typeof Sun;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border bg-background p-3 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none"
      onClick={() => toast.info(`${label} selection is UI-only.`)}
    >
      <Icon className="size-4 shrink-0 text-accent" aria-hidden="true" />
      <span className="min-w-0 text-sm font-bold">{label}</span>
    </button>
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
