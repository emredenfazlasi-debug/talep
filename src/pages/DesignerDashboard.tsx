import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  CheckCircle,
  Send,
  FileText,
  Upload,
  AlertCircle,
  User,
  Briefcase,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Request = Database["public"]["Tables"]["requests"]["Row"];
type Designer = Database["public"]["Tables"]["designers"]["Row"];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Beklemede", color: "bg-warning/15 text-warning border-warning/30", icon: <Clock className="w-3.5 h-3.5" /> },
  assigned: { label: "Atandı", color: "bg-primary/15 text-primary border-primary/30", icon: <User className="w-3.5 h-3.5" /> },
  in_progress: { label: "Devam Ediyor", color: "bg-accent-foreground/15 text-accent-foreground border-accent-foreground/30", icon: <Briefcase className="w-3.5 h-3.5" /> },
  completed: { label: "Tamamlandı", color: "bg-success/15 text-success border-success/30", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  delivered: { label: "Teslim Edildi", color: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30", icon: <Send className="w-3.5 h-3.5" /> },
};

const DesignerDashboard = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const [reqRes, desRes] = await Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
      supabase.from("designers").select("*").eq("is_active", true),
    ]);
    if (reqRes.data) setRequests(reqRes.data);
    if (desRes.data) setDesigners(desRes.data);
    setLoading(false);
  };

  const filteredRequests = selectedDesigner
    ? requests.filter((r) => r.assigned_designer_id === selectedDesigner)
    : requests;

  const getDesignerName = (id: string | null) => {
    if (!id) return "Atanmadı";
    return designers.find((d) => d.id === id)?.name || "Bilinmiyor";
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    const { error } = await supabase
      .from("requests")
      .update({ status: newStatus as Request["status"] })
      .eq("id", requestId);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Durum güncellendi ✓" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Tasarımcı Paneli</h1>
          <div className="flex items-center gap-3">
            <Button
              variant={selectedDesigner === null ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedDesigner(null)}
            >
              Tümü ({requests.length})
            </Button>
            {designers.map((d) => (
              <Button
                key={d.id}
                variant={selectedDesigner === d.id ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedDesigner(d.id)}
              >
                {d.name.split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(statusConfig).map(([key, config]) => {
            const count = filteredRequests.filter((r) => r.status === key).length;
            return (
              <div key={key} className="glass-card rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {config.icon}
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                </div>
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
        </div>

        {/* Request list */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Henüz talep bulunmuyor</p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                designerName={getDesignerName(req.assigned_designer_id)}
                designers={designers}
                onStatusChange={updateStatus}
                onAssign={async (designerId) => {
                  await supabase
                    .from("requests")
                    .update({ assigned_designer_id: designerId, status: "assigned" })
                    .eq("id", req.id);
                  fetchData();
                  toast({ title: "Tasarımcı atandı ✓" });
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const RequestCard = ({
  request,
  designerName,
  designers,
  onStatusChange,
  onAssign,
}: {
  request: Request;
  designerName: string;
  designers: Designer[];
  onStatusChange: (id: string, status: string) => void;
  onAssign: (designerId: string) => void;
}) => {
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [delivering, setDelivering] = useState(false);
  const status = statusConfig[request.status] || statusConfig.pending;

  const handleDeliver = async () => {
    setDelivering(true);
    try {
      const deliveryUrls: string[] = [];
      for (const file of deliveryFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        await supabase.storage.from("deliveries").upload(fileName, file);
        const { data } = supabase.storage.from("deliveries").getPublicUrl(fileName);
        deliveryUrls.push(data.publicUrl);
      }
      await supabase
        .from("requests")
        .update({ status: "delivered", delivery_urls: deliveryUrls, delivery_note: deliveryNote })
        .eq("id", request.id);
      toast({ title: "Teslimat yapıldı! ✨" });
    } catch {
      toast({ title: "Hata oluştu", variant: "destructive" });
    } finally {
      setDelivering(false);
    }
  };

  const nextStatuses: Record<string, string[]> = {
    pending: ["assigned"],
    assigned: ["in_progress"],
    in_progress: ["completed"],
    completed: ["delivered"],
    delivered: [],
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-foreground truncate">{request.brand_name}</h3>
            <Badge variant="outline" className={status.color + " text-xs"}>
              <span className="flex items-center gap-1">{status.icon} {status.label}</span>
            </Badge>
            {request.ai_category && (
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                AI: {request.ai_category.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="text-foreground/70">{request.client_name}</span>
            {" · "}
            <span>{new Date(request.created_at).toLocaleDateString("tr-TR")}</span>
            {request.requested_deadline && (
              <>
                {" · "}
                <span className="text-warning">
                  Teslim: {new Date(request.requested_deadline).toLocaleDateString("tr-TR")}
                </span>
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2">{request.brief}</p>

          {request.attachment_urls && request.attachment_urls.length > 0 && (
            <div className="flex gap-2 mt-2">
              {request.attachment_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Dosya {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            Sorumlu: <span className="text-foreground/80">{designerName}</span>
          </span>

          {!request.assigned_designer_id && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs">
                  <User className="w-3 h-3 mr-1" /> Ata
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Tasarımcı Ata</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {designers.map((d) => (
                    <Button
                      key={d.id}
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => onAssign(d.id)}
                    >
                      {d.name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {d.specialty.map((s) => s.replace("_", " ")).join(", ")}
                      </span>
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {nextStatuses[request.status]?.map((ns) => (
            <Button
              key={ns}
              size="sm"
              variant="secondary"
              className="text-xs"
              onClick={() => onStatusChange(request.id, ns)}
            >
              {statusConfig[ns]?.label || ns}
            </Button>
          ))}

          {request.status === "completed" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs">
                  <Send className="w-3 h-3 mr-1" /> Teslim Et
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Müşteriye Teslim</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Teslimat notu..."
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => setDeliveryFiles(Array.from(e.target.files || []))}
                    className="bg-secondary/50"
                  />
                  <Button onClick={handleDeliver} disabled={delivering} className="w-full">
                    {delivering ? "Yükleniyor..." : "Teslim Et"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {request.status === "delivered" && request.delivery_urls && request.delivery_urls.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-success flex items-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3" /> Teslim edildi
          </p>
          {request.delivery_note && (
            <p className="text-xs text-muted-foreground">{request.delivery_note}</p>
          )}
          <div className="flex gap-2 mt-1">
            {request.delivery_urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Teslimat Dosyası {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignerDashboard;
