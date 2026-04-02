import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Calendar, Upload, Send, Sparkles } from "lucide-react";

const ClientRequestForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    client_name: "",
    brand_name: "",
    brief: "",
    requested_deadline: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload files
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("attachments")
          .getPublicUrl(fileName);
        attachmentUrls.push(urlData.publicUrl);
      }

      // Create request
      const { error } = await supabase.from("requests").insert({
        client_name: formData.client_name,
        brand_name: formData.brand_name,
        brief: formData.brief,
        requested_deadline: formData.requested_deadline || null,
        attachment_urls: attachmentUrls,
      });

      if (error) throw error;

      toast({
        title: "Talep başarıyla gönderildi! ✨",
        description: "Ekibimiz en kısa sürede inceleyecektir.",
      });

      setFormData({ client_name: "", brand_name: "", brief: "", requested_deadline: "" });
      setFiles([]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast({
        title: "Hata",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Destekli Talep Sistemi</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
            Yeni Talep Oluştur
          </h1>
          <p className="text-muted-foreground text-lg">
            Talebinizi gönderin, AI doğru tasarımcıya yönlendirsin.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6 glow-primary animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="client_name" className="text-sm font-medium text-foreground">
                İsim Soyisim
              </Label>
              <Input
                id="client_name"
                placeholder="Adınızı ve soyadınızı girin"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                required
                className="bg-secondary/50 border-border/50 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_name" className="text-sm font-medium text-foreground">
                Marka Adı
              </Label>
              <Input
                id="brand_name"
                placeholder="Hangi marka için?"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                required
                className="bg-secondary/50 border-border/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brief" className="text-sm font-medium text-foreground">
              Talep Detayı (Brief)
            </Label>
            <Textarea
              id="brief"
              placeholder="Talebinizi detaylı şekilde açıklayın..."
              value={formData.brief}
              onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
              required
              rows={5}
              className="bg-secondary/50 border-border/50 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-sm font-medium text-foreground">
                <Calendar className="w-4 h-4 inline mr-1.5" />
                Teslim Tarihi
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData.requested_deadline}
                onChange={(e) => setFormData({ ...formData, requested_deadline: e.target.value })}
                className="bg-secondary/50 border-border/50 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="files" className="text-sm font-medium text-foreground">
                <Upload className="w-4 h-4 inline mr-1.5" />
                Dosya Ekle
              </Label>
              <Input
                id="files"
                type="file"
                multiple
                onChange={handleFileChange}
                className="bg-secondary/50 border-border/50 focus:border-primary file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 file:text-sm file:font-medium"
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">{files.length} dosya seçildi</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                Gönderiliyor...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Talebi Gönder
              </span>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Talebiniz yapay zeka tarafından analiz edilerek doğru tasarımcıya yönlendirilecektir.
        </p>
      </div>
    </div>
  );
};

export default ClientRequestForm;
