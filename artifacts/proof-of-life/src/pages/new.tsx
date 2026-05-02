import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateProject } from "@/hooks/use-api";
import { localStorageKeyForProject } from "@/lib/api";

export default function NewProject() {
  const [, setLocation] = useLocation();
  const createProject = useCreateProject();
  
  const [formData, setFormData] = useState({
    title: "",
    builder_name: "",
    one_liner: "",
    starting_state: "",
    replit_url: "",
    demo_url: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate(formData, {
      onSuccess: (data) => {
        localStorage.setItem(localStorageKeyForProject(data.id), data.edit_token);
        setLocation(`/edit/${data.id}?token=${data.edit_token}`);
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-12">
        <div>
          <h1 className="font-serif text-4xl mb-4">Open New Case File</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
            Subject identity and initial parameters
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Project Title *</Label>
              <Input 
                id="title" 
                name="title" 
                required 
                value={formData.title} 
                onChange={handleChange} 
                className="bg-card border-card-border font-serif text-xl py-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="builder_name" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Filed By (Your Name) *</Label>
              <Input 
                id="builder_name" 
                name="builder_name" 
                required 
                value={formData.builder_name} 
                onChange={handleChange} 
                className="bg-card border-card-border font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="one_liner" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">One-Liner *</Label>
              <Input 
                id="one_liner" 
                name="one_liner" 
                required 
                value={formData.one_liner} 
                onChange={handleChange} 
                className="bg-card border-card-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="starting_state" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Initial Condition (Before State) *</Label>
              <Textarea 
                id="starting_state" 
                name="starting_state" 
                required 
                value={formData.starting_state} 
                onChange={handleChange} 
                className="bg-card border-card-border min-h-[120px]"
                placeholder="Describe what was dead, abandoned, or broken..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="replit_url" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Replit URL</Label>
                <Input 
                  id="replit_url" 
                  name="replit_url" 
                  type="url"
                  value={formData.replit_url} 
                  onChange={handleChange} 
                  className="bg-card border-card-border font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo_url" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Demo URL</Label>
                <Input 
                  id="demo_url" 
                  name="demo_url" 
                  type="url"
                  value={formData.demo_url} 
                  onChange={handleChange} 
                  className="bg-card border-card-border font-mono text-sm"
                />
              </div>
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
