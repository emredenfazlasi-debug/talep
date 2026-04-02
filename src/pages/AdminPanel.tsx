import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Clock, CheckCircle, Send, FileText, User, Briefcase, LogOut, Shield, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Request = Database["public"]["Tables"]["requests"]["Row"];
type Designer = Database["public"]["Tables"]["designers"]["Row"];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Beklemede", color: "bg-warning/15 text-warning border-warning/30", icon: <Clock className="w-3.5 h-3.5" /> },
  assigned: { label: "Atandı", color: "bg-primary/15 text-primary border-primary/30", icon: <User className="w-3.5 h-3.5" /> },
  in_progress: { label: "Devam Ediyor", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: <Briefcase className="w-3.5 h-3.5" /> },
  completed: { label: "Tamamlandı", color: "bg-success/15 text-success border-success/30", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  delivered: { label: "Teslim Edildi", color: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30", icon: <Send className="w-3.5 h-3.5" /> },
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== "admin") {
      navigate("/");
      return;
    }

    const [reqRes, desRes] = await Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
      supabase.from("designers").select("*").eq("is_active", true),
    ]);
    if (reqRes.data) setRequests(reqRes.data);
    if (desRes.data) setDesigners(desRes.data);
    setLoading(false);

    supabase.channel("admin-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => init())
      .subscribe();
  };

  const assignDesigner = async (requestId: string, designerId: string) => {
    const { error } = await supabase.from("requests")
      .update({ assigned_designer_id: designerId, status: "assigned" })
      .eq("id", requestId);
    if (error) toast({ title: "Hata", description: error.message, variant: "destructive" });
    else toast({ title: "Tasarımcı atandı ✓" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getDesignerName = (id: string | null) => {
    if (!id) return null;
    return designers.find((d) => d.id === id)?.name || "Bilinmiyor";
  };

  const filteredRequests = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Paneli</h1>
              <p className="text-xs text-muted-foreground">Tüm talepler ve atamalar</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Özet kartlar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(statusConfig).map(([key, config]) => {
            const count = requests.filter((r) => r.status === key).length;
            return (
              <button key={key} onClick={() => setFilter(filter === key ? "all" : key)}
                className={`glass-card rounded-xl p-4 text-center transition-all ${filter === key ? "ring-1 ring-primary" : ""}`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  {config.icon}
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                </div>
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tasarımcı iş yükü */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Tasarımcı İş Yükü</h2>
          <div className="flex flex-wrap gap-3">
            {designers.map((d) => {
              const active = requests.filter((r) => r.assigned_designer_id === d.id && r.status !== "delivered").length;
              return (
                <div key={d.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm text-foreground">{d.name}</span>
                  <Badge variant="outline" className={active > 3 ? "text-warning border-warning/30" : "text-success border-success/30"}>
                    {active} aktif
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Talepler listesi */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">
            {filter === "all" ? `Tüm Talepler (${requests.length})` : `${statusConfig[filter]?.label} (${filteredRequests.length})`}
          </h2>
          {filter !== "all" && (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setFilter("all")}>Tümünü Göster</Button>
          )}
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Bu kategoride talep yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const status = statusConfig[req.status] || statusConfig.pending;
              const designerName = getDesignerName(req.assigned_designer_id);
              return (
                <div key={req.id} className="glass-card rounded-xl p-6 animate-fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{req.brand_name}</h3>
                        <Badge variant="outline" className={status.color + " text-xs"}>
                          <span className="flex items-center gap-1">{status.icon} {status.label}</span>
                        </Badge>
                        {req.ai_category && (
                          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                            {req.ai_category.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="text-foreground/70">{req.client_name}</span>
                        {" · "}{new Date(req.created_at).toLocaleDateString("tr-TR")}
                        {req.requested_deadline && (
                          <> · <span className="text-warning">Son: {new Date(req.requested_deadline).toLocaleDateString("tr-TR")}</span></>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{req.brief}</p>
                      {req.attachment_urls && req.attachment_urls.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {req.attachment_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1">
                              <Download className="w-3 h-3" /> Dosya {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {designerName ? (
                        <span className="text-xs text-muted-foreground">
                          Sorumlu: <span className="text-foreground">{designerName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-warning">Atanmadı</span>
                      )}

                      {/* Tasarımcı ata */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />
                            {designerName ? "Yeniden Ata" : "Ata"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle className="text-foreground">Tasarımcı Ata</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2">
                            {designers.map((d) => (
                              <Button key={d.id} variant="secondary" className="w-full justify-start"
                                onClick={() => assignDesigner(req.id, d.id)}>
                                {d.name}
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {d.specialty.map((s) => s.replace("_", " ")).join(", ")}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
