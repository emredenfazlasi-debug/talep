import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Clock, CheckCircle, Send, FileText, Upload, User, Briefcase, LogOut, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Request = Database["public"]["Tables"]["requests"]["Row"];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Beklemede", color: "bg-warning/15 text-warning border-warning/30", icon: <Clock className="w-3.5 h-3.5" /> },
  assigned: { label: "Atandı", color: "bg-primary/15 text-primary border-primary/30", icon: <User className="w-3.5 h-3.5" /> },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: <Briefcase className="w-3.5 h-3.5" /> },
  completed: { label: "Tamamlandı", color: "bg-success/15 text-success border-success/30", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  delivered: { label: "Teslim Edildi", color: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30", icon: <Send className="w-3.5 h-3.5" /> },
};

const DesignerDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [designerName, setDesignerName] = useState("");
  const [designerId, setDesignerId] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    setDesignerId(user.id);
    setDesignerName(user.user_metadata?.full_name || "Tasarımcı");

    // Sadece bu tasarımcıya atanmış talepleri getir
    const { data } = await supabase
      .from("requests")
      .select("*")
      .eq("assigned_designer_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setRequests(data);
    setLoading(false);

    supabase
      .channel("designer-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `assigned_designer_id=eq.${user.id}` }, () => init())
      .subscribe();
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    const { error } = await supabase.from("requests").update({ status: newStatus as Request["status"] }).eq("id", requestId);
    if (error) toast({ title: "Hata", description: error.message, variant: "destructive" });
    else toast({ title: "Durum güncellendi ✓" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  const counts = Object.keys(statusConfig).map((k) => ({ key: k, count: requests.filter((r) => r.status === k).length }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Panelim</h1>
            <p className="text-xs text-muted-foreground">Hoş geldin, <span className="text-primary">{designerName}</span></p>
          </div>
          <Button size="sm" variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {counts.map(({ key, count }) => (
            <div key={key} className="glass-card rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {statusConfig[key].icon}
                <span className="text-2xl font-bold text-foreground">{count}</span>
              </div>
              <span className="text-xs text-muted-foreground">{statusConfig[key].label}</span>
            </div>
          ))}
        </div>

        {/* Talepler */}
        {requests.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Sana atanmış talep bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} onStatusChange={updateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RequestCard = ({ request, onStatusChange }: { request: Request; onStatusChange: (id: string, status: string) => void }) => {
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [delivering, setDelivering] = useState(false);
  const status = statusConfig[request.status] || statusConfig.pending;

  const nextStatuses: Record<string, string[]> = {
    pending: [],
    assigned: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
    delivered: [],
  };

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
      await supabase.from("requests").update({
        status: "delivered",
        delivery_urls: deliveryUrls,
        delivery_note: deliveryNote,
      }).eq("id", request.id);
      toast({ title: "Müşteriye iletildi! ✨" });
    } catch {
      toast({ title: "Hata oluştu", variant: "destructive" });
    } finally {
      setDelivering(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{request.brand_name}</h3>
            <Badge variant="outline" className={status.color + " text-xs"}>
              <span className="flex items-center gap-1">{status.icon} {status.label}</span>
            </Badge>
            {request.ai_category && (
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                {request.ai_category.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            <span className="text-foreground/70">{request.client_name}</span>
            {" · "}
            {new Date(request.created_at).toLocaleDateString("tr-TR")}
            {request.requested_deadline && (
              <> · <span className="text-warning">Son teslim: {new Date(request.requested_deadline).toLocaleDateString("tr-TR")}</span></>
            )}
          </p>
          {/* Brief — tam göster */}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">{request.brief}</p>

          {/* Eklenen dosyalar */}
          {request.attachment_urls && request.attachment_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {request.attachment_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Download className="w-3 h-3" /> Ek Dosya {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Durum ilerlet */}
          {nextStatuses[request.status]?.map((ns) => (
            <Button key={ns} size="sm" variant="secondary" className="text-xs"
              onClick={() => onStatusChange(request.id, ns)}>
              {statusConfig[ns]?.label}
            </Button>
          ))}

          {/* Müşteriye teslim et */}
          {request.status === "completed" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs">
                  <Send className="w-3 h-3 mr-1" /> Müşteriye İlet
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Müşteriye Teslim Et</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Müşteriye not (opsiyonel)..."
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Tasarım dosyalarını ekle
                    </label>
                    <Input type="file" multiple onChange={(e) => setDeliveryFiles(Array.from(e.target.files || []))}
                      className="bg-secondary/50" />
                    {deliveryFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground">{deliveryFiles.length} dosya seçildi</p>
                    )}
                  </div>
                  <Button onClick={handleDeliver} disabled={delivering} className="w-full">
                    {delivering ? "Yükleniyor..." : "Teslim Et"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Teslim edildi göstergesi */}
          {request.status === "delivered" && (
            <span className="text-xs text-success flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Teslim edildi
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignerDashboard;
