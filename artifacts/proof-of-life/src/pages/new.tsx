import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateProject } from "@/hooks/use-api";
import { localStorageKeyForProject } from "@/lib/api";

interface FormData {
  title: string;
  builder_name: string;
  one_liner: string;
  starting_state: string;
  replit_url: string;
  demo_url: string;
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

const REQUIRED_FIELDS: (keyof FormData)[] = [
  "title",
  "builder_name",
  "one_liner",
  "starting_state",
];

const FIELD_LABELS: Record<keyof FormData, string> = {
  title: "Project title",
  builder_name: "Filed by",
  one_liner: "One-liner",
  starting_state: "Initial condition",
  replit_url: "Replit URL",
  demo_url: "Demo URL",
};

/**
 * Returns true if the value parses as an http(s) URL. Empty strings are
 * considered valid since the URL fields are optional; the caller should
 * skip validation on blank input.
 */
function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function NewProject() {
  const [, setLocation] = useLocation();
  const createProject = useCreateProject();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    builder_name: "",
    one_liner: "",
    starting_state: "",
    replit_url: "",
    demo_url: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (data: FormData): FieldErrors => {
    const next: FieldErrors = {};
    for (const f of REQUIRED_FIELDS) {
      if (!data[f].trim()) {
        next[f] = `${FIELD_LABELS[f]} is required.`;
      }
    }
    if (data.replit_url.trim() && !isValidHttpUrl(data.replit_url.trim())) {
      next.replit_url = "Must be a full http(s):// URL.";
    }
    if (data.demo_url.trim() && !isValidHttpUrl(data.demo_url.trim())) {
      next.demo_url = "Must be a full http(s):// URL.";
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Trim everything once at submit so a trailing space in a required field
    // doesn't sneak past the required-check or land in the dossier verbatim.
    const trimmed: FormData = {
      title: formData.title.trim(),
      builder_name: formData.builder_name.trim(),
      one_liner: formData.one_liner.trim(),
      starting_state: formData.starting_state.trim(),
      replit_url: formData.replit_url.trim(),
      demo_url: formData.demo_url.trim(),
    };
    const fieldErrors = validate(trimmed);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      toast({
        title: "Case file incomplete",
        description: "Fix the highlighted fields before filing.",
        variant: "destructive",
      });
      return;
    }
    createProject.mutate(trimmed, {
      onSuccess: (data) => {
        localStorage.setItem(
          localStorageKeyForProject(data.id),
          data.edit_token,
        );
        setLocation(`/edit/${data.id}?token=${data.edit_token}`);
      },
      onError: (err) => {
        toast({
          title: "Could not file case",
          description:
            err.message || "Unexpected server error. Try again in a moment.",
          variant: "destructive",
        });
      },
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const name = e.target.name as keyof FormData;
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the inline error as soon as the user starts fixing it so the
    // form doesn't feel stuck once a problem is acknowledged.
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const fieldClass = (name: keyof FormData, base: string) =>
    `${base} ${
      errors[name]
        ? "border-destructive focus-visible:ring-destructive"
        : "border-card-border"
    }`;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-12">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl mb-4">
            Open New Case File
          </h1>
          <p className="text-muted-foreground font-mono text-xs sm:text-sm uppercase tracking-widest">
            Subject identity and initial parameters
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="space-y-6">
            <Field
              name="title"
              label="Project Title"
              required
              error={errors.title}
            >
              <Input
                id="title"
                name="title"
                required
                aria-required
                value={formData.title}
                onChange={handleChange}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "title-error" : undefined}
                className={fieldClass(
                  "title",
                  "bg-card font-serif text-lg sm:text-xl py-6",
                )}
              />
            </Field>

            <Field
              name="builder_name"
              label="Filed By (Your Name)"
              required
              error={errors.builder_name}
            >
              <Input
                id="builder_name"
                name="builder_name"
                required
                aria-required
                value={formData.builder_name}
                onChange={handleChange}
                aria-invalid={!!errors.builder_name}
                aria-describedby={
                  errors.builder_name ? "builder_name-error" : undefined
                }
                className={fieldClass("builder_name", "bg-card font-mono")}
              />
            </Field>

            <Field
              name="one_liner"
              label="One-Liner"
              required
              error={errors.one_liner}
              hint="One sentence a judge can repeat after reading."
            >
              <Input
                id="one_liner"
                name="one_liner"
                required
                aria-required
                value={formData.one_liner}
                onChange={handleChange}
                aria-invalid={!!errors.one_liner}
                aria-describedby={
                  errors.one_liner ? "one_liner-error" : "one_liner-hint"
                }
                className={fieldClass("one_liner", "bg-card")}
              />
            </Field>

            <Field
              name="starting_state"
              label="Initial Condition (Before State)"
              required
              error={errors.starting_state}
              hint="What was dead, abandoned, or broken when you started."
            >
              <Textarea
                id="starting_state"
                name="starting_state"
                required
                aria-required
                value={formData.starting_state}
                onChange={handleChange}
                aria-invalid={!!errors.starting_state}
                aria-describedby={
                  errors.starting_state
                    ? "starting_state-error"
                    : "starting_state-hint"
                }
                className={fieldClass(
                  "starting_state",
                  "bg-card min-h-[120px]",
                )}
                placeholder="Describe what was dead, abandoned, or broken..."
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                name="replit_url"
                label="Replit URL"
                error={errors.replit_url}
              >
                <Input
                  id="replit_url"
                  name="replit_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={formData.replit_url}
                  onChange={handleChange}
                  aria-invalid={!!errors.replit_url}
                  aria-describedby={
                    errors.replit_url ? "replit_url-error" : undefined
                  }
                  className={fieldClass(
                    "replit_url",
                    "bg-card font-mono text-sm",
                  )}
                />
              </Field>
              <Field
                name="demo_url"
                label="Demo URL"
                error={errors.demo_url}
              >
                <Input
                  id="demo_url"
                  name="demo_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={formData.demo_url}
                  onChange={handleChange}
                  aria-invalid={!!errors.demo_url}
                  aria-describedby={
                    errors.demo_url ? "demo_url-error" : undefined
                  }
                  className={fieldClass(
                    "demo_url",
                    "bg-card font-mono text-sm",
                  )}
                />
              </Field>
            </div>
          </div>

          <div className="dossier-rule"></div>

          <Button
            type="submit"
            size="lg"
            disabled={createProject.isPending}
            className="w-full font-mono uppercase tracking-wider h-14 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {createProject.isPending ? "Filing..." : "Initialize Case File"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}

function Field({
  name,
  label,
  required,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={name}
        className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
      >
        {label}
        {required && " *"}
      </Label>
      {children}
      {hint && !error && (
        <div
          id={`${name}-hint`}
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70"
        >
          {hint}
        </div>
      )}
      {error && (
        <div
          id={`${name}-error`}
          role="alert"
          className="font-mono text-[10px] uppercase tracking-widest text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  );
}
