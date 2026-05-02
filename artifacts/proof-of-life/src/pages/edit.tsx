import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Layout, DossierSkeleton } from "@/components/layout";
import { useProjectForEdit, useUpdateProject, useCreateMilestone, useDeleteMilestone, useUpdateMilestone, useGenerateSummary, useGenerateDemoScript } from "@/hooks/use-api";
import { localStorageKeyForProject, fileToDataUrl, SCREENSHOT_MAX_BYTES, SCREENSHOT_ALLOWED_TYPES, shareLinkForSlug } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Milestone } from "@/lib/api";

export default function EditProject() {
  const [, params] = useRoute("/edit/:id");
  const id = params?.id ? parseInt(params.id) : null;
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const tokenFromUrl = searchParams.get('token');
  const tokenFromStorage = id ? localStorage.getItem(localStorageKeyForProject(id)) : null;
  const token = tokenFromUrl || tokenFromStorage;

  const { data: project, isLoading, isError } = useProjectForEdit(id, token);
  const updateProject = useUpdateProject(id!, token!);
  const generateSummary = useGenerateSummary(id!, token!);
  const generateDemoScript = useGenerateDemoScript(id!, token!);
  
  const { toast } = useToast();

  const [localData, setLocalData] = useState<any>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project && !localData) {
      setLocalData(project);
    }
  }, [project]);

  if (!id || !token) {
    return (
      <Layout>
        <div className="text-center py-20 text-destructive font-mono uppercase">
          Unauthorized Access. Missing credentials.
        </div>
      </Layout>
    );
  }

  if (isLoading) return <Layout><DossierSkeleton /></Layout>;
  if (isError || !project) return <Layout><div className="text-center py-20 text-destructive font-mono uppercase">Case file not found or access denied.</div></Layout>;

  const handleFieldChange = (field: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      updateProject.mutate({ [field]: value });
    }, 1000);
  };

  const handleManualBriefing = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleFieldChange('generated_summary', e.target.value);
  };
  
  const handleManualScript = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleFieldChange('generated_demo_script', e.target.value);
  };

  const publicUrl = shareLinkForSlug(project.slug);

  return (
    <Layout>
      <div className="space-y-12">
        <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-sm">
          <p className="font-mono text-xs text-destructive uppercase tracking-widest text-center">
            WARNING: Save this URL. It is the only way to access this case file.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border">
          <div>
            <h1 className="font-serif text-3xl mb-2">Authoring Console</h1>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              Subject ID: #{project.id}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-card border border-card-border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="published" className="font-mono text-xs uppercase tracking-widest">Publish Status</Label>
              <p className="text-xs text-muted-foreground">Make visible to judges</p>
            </div>
            <Switch 
              id="published" 
              checked={localData?.published || false} 
              onCheckedChange={(checked) => handleFieldChange('published', checked)}
            />
          </div>
        </div>

        {project.published && (
          <div className="bg-primary/10 border border-primary/30 p-6 flex flex-col items-center justify-center space-y-4">
            <div className="font-mono text-sm tracking-widest text-primary uppercase">
              Case File is Public
            </div>
            <div className="flex items-center gap-2 w-full max-w-md">
              <Input readOnly value={publicUrl} className="font-mono text-xs bg-background" />
              <Button onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast({ title: "Copied to clipboard" });
              }} variant="secondary" className="font-mono uppercase text-xs">Copy</Button>
            </div>
            <div className="flex gap-4">
              <Link href={`/p/${project.slug}`}>
                <Button variant="outline" className="font-mono uppercase text-xs border-primary/50 text-primary hover:bg-primary/20">View Dossier</Button>
              </Link>
              <Link href={`/card/${project.slug}`}>
                <Button variant="outline" className="font-mono uppercase text-xs border-primary/50 text-primary hover:bg-primary/20">View Card</Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Core Info */}
          <div className="space-y-6">
            <div className="redaction-bar mb-4">Core Intel</div>
            
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input 
                value={localData?.title || ''} 
                onChange={(e) => handleFieldChange('title', e.target.value)} 
                className="bg-card border-card-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">One-Liner</Label>
              <Input 
                value={localData?.one_liner || ''} 
                onChange={(e) => handleFieldChange('one_liner', e.target.value)} 
                className="bg-card border-card-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Current State</Label>
              <Textarea 
                value={localData?.current_state || ''} 
                onChange={(e) => handleFieldChange('current_state', e.target.value)} 
                className="bg-card border-card-border min-h-[100px]"
                placeholder="What is the current vital condition?"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Replit URL</Label>
                <Input 
                  value={localData?.replit_url || ''} 
                  onChange={(e) => handleFieldChange('replit_url', e.target.value)} 
                  className="bg-card border-card-border font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Demo URL</Label>
                <Input 
                  value={localData?.demo_url || ''} 
                  onChange={(e) => handleFieldChange('demo_url', e.target.value)} 
                  className="bg-card border-card-border font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* AI Briefing Generation */}
          <div className="space-y-6">
            <div className="redaction-bar mb-4">Judge Briefing</div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Generated Summary</Label>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="font-mono text-xs h-8"
                  onClick={() => generateSummary.mutate(undefined, {
                    onError: () => toast({ title: "AI Unavailable", description: "Please write briefing manually", variant: "destructive" })
                  })}
                  disabled={generateSummary.isPending}
                >
                  {generateSummary.isPending ? "Analyzing..." : "Generate AI Briefing"}
                </Button>
              </div>
              <Textarea 
                value={localData?.generated_summary || ''} 
                onChange={handleManualBriefing}
                className="bg-card border-card-border min-h-[150px] font-serif"
                placeholder="Factual summary of the resurrection..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">60s Demo Script</Label>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="font-mono text-xs h-8"
                  onClick={() => generateDemoScript.mutate(undefined, {
                    onError: () => toast({ title: "AI Unavailable", description: "Please write script manually", variant: "destructive" })
                  })}
                  disabled={generateDemoScript.isPending}
                >
                  {generateDemoScript.isPending ? "Drafting..." : "Generate Demo Script"}
                </Button>
              </div>
              <Textarea 
                value={localData?.generated_demo_script || ''} 
                onChange={handleManualScript}
                className="bg-card border-card-border min-h-[150px] font-sans"
                placeholder="Spoken demo script..."
              />
            </div>
          </div>
        </div>

        <div className="dossier-rule"></div>

        <MilestoneManager project={project} token={token} />

      </div>
    </Layout>
  );
}

function MilestoneManager({ project, token }: { project: any; token: string }) {
  const createMilestone = useCreateMilestone(project.id, token);
  const deleteMilestone = useDeleteMilestone(project.id, token);
  const updateMilestone = useUpdateMilestone(project.id, token);
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newMilestone, setNewMilestone] = useState<any>({
    title: "",
    description: "",
    type: "update",
    occurred_at: new Date().toISOString().slice(0, 16),
    screenshot_data: null
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!SCREENSHOT_ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Invalid format", description: "Only PNG, JPG, WEBP allowed", variant: "destructive" });
      return;
    }
    if (file.size > SCREENSHOT_MAX_BYTES) {
      toast({ title: "File too large", description: "Must be under 500KB (stored inline)", variant: "destructive" });
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setNewMilestone({ ...newMilestone, screenshot_data: dataUrl });
    } catch (err) {
      toast({ title: "Error processing image", variant: "destructive" });
    }
  };

  const handleAdd = () => {
    const isBreakthrough = newMilestone.type === "breakthrough";
    const isBlocker = newMilestone.type === "blocker";
    
    createMilestone.mutate({
      ...newMilestone,
      breakthrough: isBreakthrough,
      blocker: isBlocker,
      occurred_at: new Date(newMilestone.occurred_at).toISOString()
    }, {
      onSuccess: () => {
        setIsAdding(false);
        setNewMilestone({
          title: "",
          description: "",
          type: "update",
          occurred_at: new Date().toISOString().slice(0, 16),
          screenshot_data: null
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="redaction-bar">Evidence Log</div>
        <Button onClick={() => setIsAdding(!isAdding)} variant="outline" size="sm" className="font-mono uppercase text-xs">
          {isAdding ? "Cancel" : "File New Evidence"}
        </Button>
      </div>

      {isAdding && (
        <div className="bg-card border border-card-border p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input 
                value={newMilestone.title} 
                onChange={e => setNewMilestone({...newMilestone, title: e.target.value})}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Type</Label>
              <Select value={newMilestone.type} onValueChange={v => setNewMilestone({...newMilestone, type: v})}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="breakthrough">Breakthrough</SelectItem>
                  <SelectItem value="blocker">Blocker Survived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Timestamp</Label>
              <Input 
                type="datetime-local" 
                value={newMilestone.occurred_at} 
                onChange={e => setNewMilestone({...newMilestone, occurred_at: e.target.value})}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Screenshot (Max 500KB)</Label>
              <Input 
                type="file" 
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFile}
                className="bg-background border-border text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Description</Label>
            <Textarea 
              value={newMilestone.description} 
              onChange={e => setNewMilestone({...newMilestone, description: e.target.value})}
              className="bg-background border-border"
            />
          </div>

          <Button onClick={handleAdd} disabled={!newMilestone.title || createMilestone.isPending} className="font-mono uppercase text-xs">
            Commit to Log
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {(() => {
          const ordered = [...(project.milestones ?? [])].sort(
            (a: any, b: any) => a.sort_order - b.sort_order,
          );
          const moveMilestone = (idx: number, dir: -1 | 1) => {
            const swapWith = idx + dir;
            if (swapWith < 0 || swapWith >= ordered.length) return;
            const a = ordered[idx];
            const b = ordered[swapWith];
            updateMilestone.mutate({
              milestoneId: a.id,
              body: { sort_order: b.sort_order },
            });
            updateMilestone.mutate({
              milestoneId: b.id,
              body: { sort_order: a.sort_order },
            });
          };
          const startEdit = (m: any) => {
            setEditingId(m.id);
            setEditDraft({
              title: m.title,
              description: m.description ?? "",
              type: m.breakthrough
                ? "breakthrough"
                : m.blocker
                ? "blocker"
                : m.type ?? "update",
              occurred_at: new Date(m.occurred_at).toISOString().slice(0, 16),
            });
          };
          const saveEdit = (id: number) => {
            const isBreakthrough = editDraft.type === "breakthrough";
            const isBlocker = editDraft.type === "blocker";
            updateMilestone.mutate(
              {
                milestoneId: id,
                body: {
                  title: editDraft.title,
                  description: editDraft.description,
                  type: editDraft.type,
                  breakthrough: isBreakthrough,
                  blocker: isBlocker,
                  occurred_at: new Date(editDraft.occurred_at).toISOString(),
                },
              },
              {
                onSuccess: () => {
                  setEditingId(null);
                  setEditDraft(null);
                },
              },
            );
          };
          return ordered.map((m: any, idx: number) => (
            <div
              key={m.id}
              className="border border-border p-4 flex flex-col gap-3"
            >
              {editingId === m.id ? (
                <div className="space-y-3">
                  <Input
                    value={editDraft.title}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, title: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={editDraft.type}
                      onValueChange={(v) =>
                        setEditDraft({ ...editDraft, type: v })
                      }
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="breakthrough">Breakthrough</SelectItem>
                        <SelectItem value="blocker">Blocker Survived</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="datetime-local"
                      value={editDraft.occurred_at}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          occurred_at: e.target.value,
                        })
                      }
                      className="bg-background border-border font-mono text-xs"
                    />
                  </div>
                  <Textarea
                    value={editDraft.description}
                    onChange={(e) =>
                      setEditDraft({
                        ...editDraft,
                        description: e.target.value,
                      })
                    }
                    className="bg-background border-border"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveEdit(m.id)}
                      disabled={!editDraft.title || updateMilestone.isPending}
                      className="font-mono uppercase text-xs"
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                      className="font-mono uppercase text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{String(idx + 1).padStart(2, "0")} ·{" "}
                        {new Date(m.occurred_at).toLocaleString()}
                      </span>
                      <span
                        className={`text-xs font-mono uppercase px-2 py-0.5 ${
                          m.breakthrough
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : m.blocker
                            ? "bg-destructive/20 text-destructive border border-destructive/30"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {m.breakthrough
                          ? "Breakthrough"
                          : m.blocker
                          ? "Blocker Survived"
                          : "Update"}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-lg">{m.title}</h3>
                    {m.description && (
                      <p className="text-sm text-muted-foreground">
                        {m.description}
                      </p>
                    )}
                    {m.screenshot_data && (
                      <div className="text-xs font-mono text-muted-foreground mt-2 border border-border inline-block px-2 py-1">
                        Exhibit Attached
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-mono text-xs h-7 px-2"
                        disabled={idx === 0 || updateMilestone.isPending}
                        onClick={() => moveMilestone(idx, -1)}
                        aria-label="Move earlier"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-mono text-xs h-7 px-2"
                        disabled={
                          idx === ordered.length - 1 || updateMilestone.isPending
                        }
                        onClick={() => moveMilestone(idx, 1)}
                        aria-label="Move later"
                      >
                        ↓
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-mono text-xs h-7"
                        onClick={() => startEdit(m)}
                      >
                        Amend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 font-mono text-xs h-7"
                        onClick={() => {
                          if (confirm("Redact this exhibit?"))
                            deleteMilestone.mutate(m.id);
                        }}
                      >
                        Redact
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ));
        })()}
        {(!project.milestones || project.milestones.length === 0) && (
          <div className="text-center py-10 border border-dashed border-border text-muted-foreground font-mono text-sm uppercase">
            No evidence filed yet.
          </div>
        )}
      </div>

    </div>
  );
}
